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
mongoose.connect(mongoUrl)
  .then(() => console.log('Mongoose connecté à MongoDB'))
  .catch(err => console.error('Erreur mongoose :', err));

// Route de santé pour vérifier que le serveur répond
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Route d'inscription
// Reçoit un JSON { username, password }
// - vérifie que le nom d'utilisateur n'existe pas
// - hache le mot de passe (bcrypt)
// - crée l'utilisateur et une agenda par défaut
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    // Vérifie l'existence d'un utilisateur avec le même nom
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ error: 'username already exists' });

    // Hachage du mot de passe avant stockage
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // Création de l'utilisateur
    const user = new User({ username, password: hash, agendas: [] });
    await user.save();

    // Création d'une agenda par défaut et association à l'utilisateur
    const agenda = new Agenda({ name: 'Default', events: [] });
    await agenda.save();
    user.agendas.push(agenda._id);
    await user.save();

    return res.status(201).json({ message: 'user created' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Route de connexion
// Reçoit { username, password }
// - vérifie que l'utilisateur existe
// - compare le mot de passe (bcrypt.compare)
// - retourne un token JWT si succès
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'invalid credentials' });

    // Création d'un token JWT contenant l'id et le username
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    return res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// catch-all to serve index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// --- Auth middleware (JWT) ---
// Middleware d'authentification basé sur le header Authorization: Bearer <token>
// Vérifie la présence et la validité du JWT, puis attache les claims dans req.user
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'bad token' });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    // decoded contient { id, username, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// --- Agendas CRUD ---
// Get agendas for current user
app.get('/api/agendas', authMiddleware, async (req, res) => {
  try {
    // On récupère l'utilisateur connecté avec ses agendas et leurs events
    const user = await User.findById(req.user.id).populate({
      path: 'agendas',
      populate: { path: 'events' } // si tu veux inclure les events dans chaque agenda
    });

    if (!user) return res.status(404).json({ error: 'user not found' });

    // Retourne la liste des agendas
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


// --- Events CRUD ---
// Get events for current user
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({ path: 'agendas', populate: { path: 'events' } });
    if (!user) return res.status(404).json({ error: 'user not found' });

    let events = [];
    if (req.query.agendaId) {
      const agenda = user.agendas.find(a => String(a._id) === req.query.agendaId);
      if (agenda) events = agenda.events;
    } else {
      // tous les events
      user.agendas.forEach(a => events.push(...a.events));
    }
    return res.json(events.map(e => ({ id: e._id, title: e.title, start: e.start, end: e.end, extendedProps: { description: e.description }, color: e.color, backgroundColor: e.color })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Create event
// Création d'un événement
// Utilise une transaction Mongoose pour assurer que l'événement est créé
// et référencé dans l'agenda de l'utilisateur de façon atomique.
app.post('/api/events', authMiddleware, async (req, res) => {
  const { title, start, end, description, color } = req.body;
  if (!title || !start) return res.status(400).json({ error: 'title and start required' });
  try {
    // Démarre une session / transaction Mongoose
    const session = await mongoose.startSession();
    let createdEvent;
    let agendaId = null;
    await session.withTransaction(async () => {
      // Crée l'événement
      const ev = new Event({ title, start: new Date(start), end: end ? new Date(end) : new Date(start), description: description || '', color: color || '#ffd700' });
      createdEvent = await ev.save({ session });

      // Récupère l'utilisateur et attache l'événement à sa première agenda (ou crée une agenda par défaut)
      const user = await User.findById(req.user.id).session(session);
      if (!user) throw new Error('user not found');
      let agenda;
      if (!user.agendas || !user.agendas.length) {
        // pas d'agenda -> créer une agenda et l'associer
        agenda = new Agenda({ name: 'Default', events: [createdEvent._id] });
        await agenda.save({ session });
        user.agendas = [agenda._id];
        await user.save({ session });
      } else {
        // ajoute l'event à la première agenda
        agenda = await Agenda.findById(user.agendas[0]).session(session);
        agenda.events.push(createdEvent._id);
        await agenda.save({ session });
      }
      agendaId = agenda._id;
    });
    // Termine la session
    session.endSession();

    // Retourne l'événement créé (id + données) au client
    return res.status(201).json({ id: createdEvent._id, title: createdEvent.title, start: createdEvent.start, end: createdEvent.end, description: createdEvent.description, color: createdEvent.color, agendaId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Update event
app.put('/api/events/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { title, start, end, description, color } = req.body;
  try {
    const ev = await Event.findById(id);
    if (!ev) return res.status(404).json({ error: 'event not found' });
    if (title) ev.title = title;
    if (start) ev.start = new Date(start);
    if (end) ev.end = new Date(end);
    if (description !== undefined) ev.description = description;
    if (color) ev.color = color;
  await ev.save();
    return res.json({ id: ev._id, title: ev.title, start: ev.start, end: ev.end, description: ev.description, color: ev.color });
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
    // remove references from all agendas
    await Agenda.updateMany({ events: id }, { $pull: { events: id } });
  await ev.remove();
    return res.json({ message: 'deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
