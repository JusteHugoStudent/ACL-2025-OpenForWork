/**
 * ============================================
 * ROUTES DES AGENDAS
 * ============================================
 * 
 * Gère les opérations CRUD sur les agendas.
 * Toutes les routes nécessitent une authentification (authMiddleware).
 */

const express = require('express');
const User = require('../../src/models/userModel');
const Agenda = require('../../src/models/agendaModel');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware);

/**
 * Récupère tous les agendas de l'utilisateur avec leurs événements
 * GET /api/agendas
 * Headers: Authorization: Bearer <token>
 */
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'agendas',
      populate: { path: 'events' }
    });

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    // Formater les agendas pour le client
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
    console.error('❌ Erreur GET agendas:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

/**
 * Crée un nouvel agenda pour l'utilisateur
 * POST /api/agendas
 * Headers: Authorization: Bearer <token>
 * Body: { name: string }
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'missing name' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    // Créer le nouvel agenda
    const agenda = new Agenda({ name, events: [] });
    await agenda.save();

    // Ajouter l'agenda à l'utilisateur
    user.agendas.push(agenda._id);
    await user.save();

    return res.status(201).json({ 
      id: agenda._id, 
      name: agenda.name, 
      events: [] 
    });
  } catch (err) {
    console.error('❌ Erreur POST agenda:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
