// Routes d'authentification
// Gère l'inscription et la connexion des utilisateurs
// Routes publiques (pas de token requis)

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/userModel');
const Agenda = require('../../src/models/agendaModel');

const router = express.Router();

// Route de santé - Vérifie que le serveur fonctionne
// GET /api/health

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Route d'inscription - Crée un nouvel utilisateur
// POST /api/register
// Body: { username: string, password: string }

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    // Vérifie si l'utilisateur existe déjà
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'username already exists' });
    }

    // Hashe le mot de passe
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // Crée l'utilisateur
    const user = new User({ username, password: hash, agendas: [] });
    await user.save();

    // Crée l'agenda par défaut
    const defaultAgenda = new Agenda({ name: 'Default', events: [] });
    await defaultAgenda.save();
    user.agendas.push(defaultAgenda._id);

    // Ajoute automatiquement l'agenda "Jours fériés" si disponible
    const holidaysAgenda = await Agenda.findOne({ name: 'Jours fériés' });
    if (holidaysAgenda) {
      user.agendas.push(holidaysAgenda._id);
    }

    await user.save();

    return res.status(201).json({ message: 'user created' });
  } catch (err) {
    console.error('❌ Erreur inscription:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});


// Route de connexion - Authentifie un utilisateur existant
// POST /api/login
// Body: { username: string, password: string }
// Response: { token: string, username: string }

router.post('/login', async (req, res) => {
  console.log(`🔍 DEBUG: Connexion demandée pour utilisateur "${req.body.username}"`);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    // Trouve l'utilisateur
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    // Vérifie le mot de passe
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'invalid password' });
    }

    // Génére le token JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    console.log(`✅ DEBUG: Connexion réussie pour utilisateur "${user.username}"`);
    return res.json({ token, username: user.username });
  } catch (err) {
    console.error('❌ Erreur connexion:', err);
    return res.status(500).json({ error: 'erreur interne' });
  }
});

module.exports = router;
