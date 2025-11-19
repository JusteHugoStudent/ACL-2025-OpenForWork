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

// Configuration et middlewares
const connectDatabase = require('./server/config/database');
const authRoutes = require('./server/routes/auth.routes');
const agendaRoutes = require('./server/routes/agenda.routes');
const eventRoutes = require('./server/routes/event.routes');

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques
app.use(express.static(path.join(__dirname, 'src')));

// Connexion BDD
connectDatabase();

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
