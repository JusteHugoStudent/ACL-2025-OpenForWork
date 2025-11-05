import { createServer } from "http";
import { readStream } from "./readStream.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
//import controller from "./controller.js"; --- IGNORE en attente du front ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = createServer(async (request, response) => {
    const { method, url } = request;

    if (method === "GET" && (url === "/" || url === "/index.html")) {
        const indexPath = path.join(__dirname, "index.html");

<<<<<<< Updated upstream
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
                response.end("Erreur lors du chargement de la page.");
            } else {
                response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                response.end(data);
            }
        });
=======
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

    // NOUVEAU: Créer un événement de bienvenue pour le nouvel utilisateur
    await createWelcomeEvent(user._id, user.username);

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

// NOUVEAU: Fonction pour créer un événement de bienvenue lors de l'inscription
async function createWelcomeEvent(userId, username) {
  try {
    // Récupérer le user et ses agendas
    const user = await User.findById(userId).populate('agendas');
    if (!user || !user.agendas.length) {
      console.log('Utilisateur ou agenda introuvable pour créer l\'événement de bienvenue');
      return;
    }

    const firstAgenda = user.agendas[0];

    // Créer l'événement de bienvenue pour aujourd'hui
    const welcomeEvent = new Event({
      title: `🎉 Bienvenue ${username} !`,
      start: new Date('2025-11-05T14:00:00'),
      end: new Date('2025-11-05T15:00:00'),
      description: `Bienvenue sur l'agenda de l'équipe 8 ! Vous pouvez maintenant gérer vos événements, consulter les jours fériés et collaborer avec l'équipe sur le Sprint 2.`,
      color: '#27ae60'
    });

    await welcomeEvent.save();

    // Ajouter l'événement à l'agenda
    firstAgenda.events.push(welcomeEvent._id);
    await firstAgenda.save();

    console.log(`🎉 Événement de bienvenue créé pour ${username}`);
    return welcomeEvent;
    
  } catch (err) {
    console.error('Erreur création événement de bienvenue:', err);
  }
}

// NOUVEAU: Fonction pour créer un événement automatique lors de la connexion
async function createLoginEvent(userId) {
  try {
    // Vérifier si un événement "par défaut" existe déjà pour demain
    const tomorrow = new Date('2025-11-06');
    const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const endOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);
    
    // Récupérer le user et ses agendas
    const user = await User.findById(userId).populate('agendas');
    if (!user || !user.agendas.length) {
      console.log('Utilisateur ou agenda introuvable pour créer l\'événement de connexion');
      return;
    }

    const firstAgenda = user.agendas[0];
    
    // Vérifier si un événement par défaut existe déjà pour demain dans cet agenda
    const existingEvents = await Event.find({
      _id: { $in: firstAgenda.events },
      start: { $gte: startOfDay, $lt: endOfDay },
      title: { $regex: /réunion équipe|événement préparé|connexion/i }
    });

    if (existingEvents.length > 0) {
      console.log('Événement par défaut déjà existant pour demain');
      return;
    }

    // Créer l'événement par défaut pour demain
    const loginEvent = new Event({
      title: '🚀 Réunion équipe - Sprint 2',
      start: new Date('2025-11-06T10:00:00'),
      end: new Date('2025-11-06T11:30:00'),
      description: `Réunion d'équipe Sprint 2 - Créé automatiquement lors de la connexion de ${user.username}. Fonctionnalités: événements récurrents, recherche, agendas multiples, jours fériés.`,
      color: '#3498db'
    });

    await loginEvent.save();

    // Ajouter l'événement à l'agenda
    firstAgenda.events.push(loginEvent._id);
    await firstAgenda.save();

    console.log(`✅ Événement de connexion créé pour ${user.username}: ${loginEvent.title}`);
    return loginEvent;
    
  } catch (err) {
    console.error('Erreur création événement de connexion:', err);
  }
}

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

// --- Create new agenda for current user ---
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
>>>>>>> Stashed changes
    }

    else if (method === "POST") {
        try {
            const raw = await readStream(request);
            const contentType = request.headers['content-type'] || '';
            let parsed = {};

            if (contentType.includes('application/json')) {
                parsed = JSON.parse(raw || '{}');
            // Ca veut dire encoder comme un formulaire
            } else if (contentType.includes('application/x-www-form-urlencoded') || contentType === '') {
                const params = new URLSearchParams(raw);
                for (const [k, v] of params.entries()) parsed[k] = v;
            } else {
                console.error('Type de contenu non géré :', contentType);
            }

            console.log('Corps parsé :', parsed);

            const usersPath = path.join(__dirname, 'file.json');
            let usersData = { users: [] };
            try {
                const file = fs.readFileSync(usersPath, 'utf8');
                usersData = JSON.parse(file);
            } catch (e) {
                console.error('Impossible de lire file.json', e);
            }

            const found = (usersData.users || []).some(u => u.identifiant === parsed.identifiant && u.mdp === parsed.mdp);

            response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            if (found) {
                response.end('True');
            } else {
                response.end('False');
            }

        } catch (err) {
            console.error('Erreur traitement POST', err);
            response.writeHead(500, { 'Content-Type': 'text/plain' });
            response.end('Erreur serveur');
        }
    }
    else {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("404 - Page non trouvée");
    }
});

const PORT = process.env.PORT || 8500;
server.listen(PORT, () => console.log(`✅ Le Serveur écoute : http://localhost:${PORT}/`));
