// Routes des agendas
// Gère les opérations CRUD sur les agendas.
// Toutes les routes nécessitent une authentification (authMiddleware).

const express = require('express');
const User = require('../models/userModel');
const Agenda = require('../models/agendaModel');
const authMiddleware = require('../middleware/auth');
const { THEME_COLORS } = require('../config/constants');
const { validateAgendaMiddleware } = require('../middleware/validation');

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
// POST /api/agendas (avec validation)
// Headers: Authorization: Bearer <token>
// Body: { name: string }

router.post('/', validateAgendaMiddleware, async (req, res) => {
  try {
    const { name, color } = req.body;

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

// Modifie un agenda existant
// PUT /api/agendas/:id
// Headers: Authorization: Bearer <token>
// Body: { name?: string, color?: string }

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    // Vérifie que l'utilisateur possède cet agenda
    const user = await User.findById(req.user.id);
    if (!user || !user.agendas.includes(id)) {
      return res.status(404).json({ error: 'agenda not found' });
    }

    // Met à jour l'agenda
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return res.status(404).json({ error: 'agenda not found' });
    }

    if (name) agenda.name = name;
    if (color) agenda.color = color;

    await agenda.save();

    return res.json({
      id: agenda._id,
      name: agenda.name,
      color: agenda.color
    });
  } catch (err) {
    console.error('❌ Erreur PUT agenda:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Supprime un agenda et tous ses événements
// DELETE /api/agendas/:id
// Headers: Authorization: Bearer <token>

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifie que l'utilisateur possède cet agenda
    const user = await User.findById(req.user.id);
    if (!user || !user.agendas.includes(id)) {
      return res.status(404).json({ error: 'agenda not found' });
    }

    // Supprime l'agenda (les événements seront supprimés en cascade via le model)
    const agenda = await Agenda.findById(id);
    if (!agenda) {
      return res.status(404).json({ error: 'agenda not found' });
    }

    // Supprime tous les événements de cet agenda
    const Event = require('../models/eventModel');
    await Event.deleteMany({ _id: { $in: agenda.events } });

    // Retire l'agenda de l'utilisateur
    user.agendas = user.agendas.filter(agId => agId.toString() !== id);
    await user.save();

    // Supprime l'agenda
    await Agenda.findByIdAndDelete(id);

    return res.json({ message: 'agenda deleted successfully' });
  } catch (err) {
    console.error('❌ Erreur DELETE agenda:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
