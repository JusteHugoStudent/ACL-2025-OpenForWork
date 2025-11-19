// Routes des agendas
// Gère les opérations CRUD sur les agendas.
// Toutes les routes nécessitent une authentification (authMiddleware).

const express = require('express');
const User = require('../../src/models/userModel');
const Agenda = require('../../src/models/agendaModel');
const authMiddleware = require('../middleware/auth');
const { THEME_COLORS } = require('../../src/config/constants');

const router = express.Router();

// Applique le middleware d'authentification à toutes les routes
router.use(authMiddleware);

//Récupère tous les agendas de l'utilisateur avec leurs événements
//GET /api/agendas
//Header: Authorization: Bearer <token>

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'agendas',
      populate: { path: 'events' }
    });

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    // Formate les agendas pour le client
    const agendas = user.agendas.map(ag => ({
      id: ag._id,
      name: ag.name,
      color: ag.color || THEME_COLORS.DEFAULT_AGENDA,
      events: ag.events.map(ev => ({
        id: ev._id,
        title: ev.title,
        start: ev.start,
        end: ev.end,
        description: ev.description
      }))
    }));

    return res.json(agendas);
  } catch (err) {
    console.error('❌ Erreur GET agendas:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Crée un nouvel agenda pour l'utilisateur
// POST /api/agendas
// Headers: Authorization: Bearer <token>
// Body: { name: string }

router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'missing name' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    // Crée le nouvel agenda avec couleur personnalisée
    const agenda = new Agenda({ 
      name, 
      color: color || THEME_COLORS.DEFAULT_AGENDA, 
      events: [] 
    });
    await agenda.save();

    // Ajoute l'agenda à l'utilisateur
    user.agendas.push(agenda._id);
    await user.save();

    return res.status(201).json({ 
      id: agenda._id, 
      name: agenda.name,
      color: agenda.color,
      events: [] 
    });
  } catch (err) {
    console.error('❌ Erreur POST agenda:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
