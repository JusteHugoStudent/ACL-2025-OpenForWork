// Charger les variables d'environnement depuis un fichier .env (ex: MONGO_URL, JWT_SECRET)
require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('./src/models/userModel');
const Agenda = require('./src/models/agendaModel');
const Event = require('./src/models/eventModel');

const app = express();
const PORT = process.env.PORT || 4000;

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static
app.use(express.static(path.join(__dirname, 'src')));

// Connect to MongoDB via mongoose
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/acl2025';
mongoose
  .connect(mongoUrl)
  .then(() => console.log('Mongoose connecté à MongoDB'))
  .catch(err => console.error('Erreur mongoose :', err));

// Route de santé
app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Route d'inscription ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  try {
    const existing = await User.findOne({ username });
    if (existing)
      return res.status(409).json({ error: 'username already exists' });

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const user = new User({ username, password: hash, agendas: [] });
    await user.save();

    const agenda = new Agenda({ name: 'Default', events: [] });
    await agenda.save();
    user.agendas.push(agenda._id);
    await user.save();

    await createWelcomeEvent(user._id, user.username);

    return res.status(201).json({ message: 'user created' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// --- Route de connexion ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'user not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'invalid password' });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    // Créer un événement automatique lors de la connexion
    await createLoginEvent(user._id);

    return res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// --- Fonction : créer un événement de bienvenue ---
async function createWelcomeEvent(userId, username) {
  try {
    const user = await User.findById(userId).populate('agendas');
    if (!user || !user.agendas.length) {
      console.log("Utilisateur ou agenda introuvable pour créer l'événement de bienvenue");
      return;
    }

    const firstAgenda = user.agendas[0];
    const welcomeEvent = new Event({
      title: `🎉 Bienvenue ${username} !`,
      start: new Date('2025-11-05T14:00:00'),
      end: new Date('2025-11-05T15:00:00'),
      description: `Bienvenue sur l'agenda de l'équipe 8 ! Vous pouvez maintenant gérer vos événements, consulter les jours fériés et collaborer avec l'équipe sur le Sprint 2.`,
      color: '#27ae60'
    });

    await welcomeEvent.save();
    firstAgenda.events.push(welcomeEvent._id);
    await firstAgenda.save();

    console.log(`🎉 Événement de bienvenue créé pour ${username}`);
    return welcomeEvent;
  } catch (err) {
    console.error('Erreur création événement de bienvenue:', err);
  }
}

// --- Fonction : créer un événement automatique à la connexion ---
async function createLoginEvent(userId) {
  try {
    const tomorrow = new Date('2025-11-06');
    const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const endOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);

    const user = await User.findById(userId).populate('agendas');
    if (!user || !user.agendas.length) {
      console.log("Utilisateur ou agenda introuvable pour créer l'événement de connexion");
      return;
    }

    const firstAgenda = user.agendas[0];
    const existingEvents = await Event.find({
      _id: { $in: firstAgenda.events },
      start: { $gte: startOfDay, $lt: endOfDay },
      title: { $regex: /réunion équipe|événement préparé|connexion/i }
    });

    if (existingEvents.length > 0) {
      console.log('Événement par défaut déjà existant pour demain');
      return;
    }

    const loginEvent = new Event({
      title: '🚀 Réunion équipe - Sprint 2',
      start: new Date('2025-11-06T10:00:00'),
      end: new Date('2025-11-06T11:30:00'),
      description: `Réunion d'équipe Sprint 2 - Créé automatiquement lors de la connexion de ${user.username}.`,
      color: '#3498db'
    });

    await loginEvent.save();
    firstAgenda.events.push(loginEvent._id);
    await firstAgenda.save();

    console.log(`✅ Événement de connexion créé pour ${user.username}: ${loginEvent.title}`);
    return loginEvent;
  } catch (err) {
    console.error('Erreur création événement de connexion:', err);
  }
}

// Route de base
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// --- Middleware d'authentification ---
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer')
    return res.status(401).json({ error: 'bad token' });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// --- Agendas CRUD ---
app.get('/api/agendas', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'agendas',
      populate: { path: 'events' }
    });

    if (!user) return res.status(404).json({ error: 'user not found' });

    const agendas = user.agendas.map(ag => ({
      id: ag._id,
      name: ag.name,
      events: ag.events.map(ev => ({
        id: ev._id,
        title: ev.title,
        start: ev.start,
        end: ev.end,
        description: ev.description,
        color: ev.color
      }))
    }));

    return res.json(agendas);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// --- Créer un nouvel agenda ---
app.post('/api/agendas', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'missing name' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'user not found' });

    const agenda = new Agenda({ name, events: [] });
    await agenda.save();

    user.agendas.push(agenda._id);
    await user.save();

    return res.status(201).json({ id: agenda._id, name: agenda.name, events: [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// --- Events CRUD ---
// Get events
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'agendas',
      populate: { path: 'events' }
    });
    if (!user) return res.status(404).json({ error: 'user not found' });

    let events = [];
    if (req.query.agendaId) {
      const agenda = user.agendas.find(a => String(a._id) === req.query.agendaId);
      if (agenda) events = agenda.events;
    } else {
      user.agendas.forEach(a => events.push(...a.events));
    }
    return res.json(
      events.map(e => ({
        id: e._id,
        title: e.title,
        start: e.start,
        end: e.end,
        extendedProps: { description: e.description },
        color: e.color,
        backgroundColor: e.color
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Create event
app.post('/api/events', authMiddleware, async (req, res) => {
  const { title, start, end, description, color, agendaId } = req.body;
  if (!title || !start)
    return res.status(400).json({ error: 'title and start required' });

  // Vérification erreur horaire : la fin ne peut pas être avant le début
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date(start);
  
  if (endDate < startDate) {
    return res.status(400).json({ error: 'Erreur horaire : la date de fin ne peut pas être antérieure à la date de début' });
  }

  let session;
  try {
    session = await mongoose.startSession();
    let createdEvent;

    await session.withTransaction(async () => {
      const ev = new Event({
        title,
        start: startDate,
        end: endDate,
        description: description || '',
        color: color || '#ffd700'
      });
      createdEvent = await ev.save({ session });

      let agenda;
      if (agendaId) {
        agenda = await Agenda.findById(agendaId).session(session);
        if (!agenda) throw new Error('agenda not found');
        const user = await User.findById(req.user.id).session(session);
        if (!user || !user.agendas.includes(agenda._id)) {
          throw new Error('unauthorized access to this agenda');
        }
      } else {
        const user = await User.findById(req.user.id).session(session);
        if (!user) throw new Error('user not found');

        if (!user.agendas || !user.agendas.length) {
          agenda = new Agenda({ name: 'Default', events: [createdEvent._id] });
          await agenda.save({ session });
          user.agendas = [agenda._id];
          await user.save({ session });
        } else {
          agenda = await Agenda.findById(user.agendas[0]).session(session);
        }
      }

      if (agenda) {
        agenda.events.push(createdEvent._id);
        await agenda.save({ session });
      }
    });

    session.endSession();

    return res.status(201).json({
      id: createdEvent._id,
      title: createdEvent.title,
      start: createdEvent.start,
      end: createdEvent.end,
      description: createdEvent.description,
      color: createdEvent.color,
      agendaId
    });
  } catch (err) {
    if (session) {
      session.endSession();
    }
    console.error(err);
    return res.status(500).json({ error: err.message || 'internal error' });
  }
});

// Update event
app.put('/api/events/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { title, start, end, description, color } = req.body;
  try {
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: 'event not found' });
    
    // Vérification erreur horaire pour la mise à jour
    const newStart = start ? new Date(start) : ev.start;
    const newEnd = end ? new Date(end) : ev.end;
    
    if (newEnd < newStart) {
      return res.status(400).json({ error: 'Erreur horaire : la date de fin ne peut pas être antérieure à la date de début' });
    }
    
    if (title) ev.title = title;
    if (start) ev.start = newStart;
    if (end) ev.end = newEnd;
    if (description !== undefined) ev.description = description;
    if (color) ev.color = color;
    await ev.save();
    return res.json({
      id: ev._id,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      description: ev.description,
      color: ev.color
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Delete event
app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: 'event not found' });
    await Agenda.updateMany({ events: id }, { $pull: { events: id } });
    await ev.deleteOne();
    return res.json({ message: 'deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});