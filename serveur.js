// SERVEUR EXPRESS - API BACKEND
// Point d'entrée principal de l'application Agenda ACL 2025.
// Architecture refactorisée :
// - Configuration séparée dans server/config/
// - Middleware d'authentification dans server/middleware/
// - Routes organisées par domaine dans server/routes/

// Routes disponibles :
// - POST /api/register - Inscription utilisateur
// - POST /api/login - Connexion utilisateur
// - GET /api/agendas - Liste des agendas
// - POST /api/agendas - Créer un agenda
// - PUT /api/agendas/:id - Modifier un agenda
// - DELETE /api/agendas/:id - Supprimer un agenda
// - GET /api/events - Récupérer les événements
// - POST /api/events - Créer un événement
// - PUT /api/events/:id - Modifier un événement
// - DELETE /api/events/:id - Supprimer un événement

// Charge les variables d'environnement
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

// Configuration et middlewares
const connectDatabase = require('./server/config/database');
const authRoutes = require('./server/routes/auth.routes');
const agendaRoutes = require('./server/routes/agenda.routes');
const eventRoutes = require('./server/routes/event.routes');

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 3000;

// Sécurité : Helmet pour les en-têtes HTTP sécurisés
// Configuration adaptée pour permettre les scripts inline et les ressources locales
app.use(helmet({
  contentSecurityPolicy: false, // Désactivé temporairement pour debug
  crossOriginEmbedderPolicy: false // Désactivé pour compatibilité avec les CDN
}));

// CORS : Configuration pour autoriser les requêtes depuis l'origine locale
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true, // En développement, autorise toutes les origines
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight pour 24h
};
app.use(cors(corsOptions));

// Middlewares globaux
app.use(express.json({ limit: '10mb' })); // Limite la taille des requêtes JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Fichiers statiques
app.use(express.static(path.join(__dirname, 'src')));

// Connexion BDD
connectDatabase();

// Sanitization des entrées utilisateur (protection XSS)
const { sanitizeInputMiddleware } = require('./server/middleware/sanitize');
app.use('/api', sanitizeInputMiddleware);

// Routes API
app.use('/api', authRoutes);        // /api/register, /api/login, /api/health
app.use('/api/agendas', agendaRoutes); // /api/agendas/*
app.use('/api/events', eventRoutes);   // /api/events/*

// Route Racines
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Gestion 404
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Démarrage Serveur
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
