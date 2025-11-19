// Routes des evenements
// Gère les opérations CRUD sur les événements
// Toutes les routes nécessitent une authentification (authMiddleware)

const express = require('express');
const mongoose = require('mongoose');
const User = require('../../src/models/userModel');
const Agenda = require('../../src/models/agendaModel');
const Event = require('../../src/models/eventModel');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Applique le middleware d'authentification à toutes les routes
router.use(authMiddleware);


// Récupère les événements d'un ou plusieurs agendas
// GET /api/events?agendaId=xxx&start=xxx&end=xxx
// Query params:
//   - agendaId: ID d'un agenda spécifique
//   - agendaIds[]: Tableau d'IDs pour charger plusieurs agendas
//   - start: Date de début (ISO) pour filtrage optimisé
//   - end: Date de fin (ISO) pour filtrage optimisé

router.get('/', async (req, res) => {
  try {
    const { agendaId, agendaIds, start, end } = req.query;

    // Filtrage dynamique selon la période demandée
    let dateFilter = {};
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      dateFilter = {
        $or: [
          { start: { $gte: startDate, $lte: endDate } },
          { end: { $gte: startDate, $lte: endDate } },
          { start: { $lte: startDate }, end: { $gte: endDate } }
        ]
      };
    } else {
      // limite à + ou - 2 mois autour de maintenant
      const now = new Date();
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const twoMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      
      dateFilter = {
        $or: [
          { start: { $gte: twoMonthsAgo, $lte: twoMonthsLater } },
          { end: { $gte: twoMonthsAgo, $lte: twoMonthsLater } },
          { start: { $lte: twoMonthsAgo }, end: { $gte: twoMonthsLater } }
        ]
      };
      console.log(`📅 Filtrage par défaut: ${twoMonthsAgo.toLocaleDateString()} à ${twoMonthsLater.toLocaleDateString()}`);
    }

    const user = await User.findById(req.user.id).populate({
      path: 'agendas',
      populate: {
        path: 'events',
        match: dateFilter
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    // Gestion des agendas multiples (mix)
    const normalizedAgendaIds = agendaIds ? (Array.isArray(agendaIds) ? agendaIds : [agendaIds]) : null;
    
    if (normalizedAgendaIds && normalizedAgendaIds.length > 0) {
      const eventsByAgenda = {};
      
      normalizedAgendaIds.forEach(id => {
        const agenda = user.agendas.find(a => String(a._id) === id);
        if (agenda && agenda.events && Array.isArray(agenda.events)) {
          eventsByAgenda[id] = agenda.events.map(e => ({
            id: e._id,
            title: e.title,
            start: e.start,
            end: e.end,
            extendedProps: { description: e.description },
            emoji: e.emoji
          }));
        } else {
          eventsByAgenda[id] = [];
        }
      });

      return res.json(eventsByAgenda);
    }

    // Comportement pour agenda unique
    let events = [];
    if (agendaId) {
      const agenda = user.agendas.find(a => String(a._id) === agendaId);
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
        emoji: e.emoji,
        recurrence: e.recurrence || { type: 'none' }
      }))
    );

  } catch (err) {
    console.error('❌ Erreur GET events:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Crée un nouvel événement
// POST /api/events
// Body: { title, start, end?, description?, emoji?, agendaId? }

router.post('/', async (req, res) => {
  const { title, start, end, description, emoji, agendaId, recurrence } = req.body;
  
  if (!title || !start) {
    return res.status(400).json({ error: 'title and start required' });
  }

  // Vérifie que la fin ne peut pas être avant le début
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date(start);
  
  if (endDate < startDate) {
    return res.status(400).json({ 
      error: 'Erreur horaire : la date de fin ne peut pas être antérieure à la date de début' 
    });
  }

  let session;
  try {
    session = await mongoose.startSession();
    let createdEvent;

    await session.withTransaction(async () => {
      // Crée l'événement
      const ev = new Event({
        title,
        start: startDate,
        end: endDate,
        description: description || '',
        emoji: emoji || '📅',
        recurrence: recurrence || { type: 'none' }
      });
      createdEvent = await ev.save({ session });

      // Associe à un agenda
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
      emoji: createdEvent.emoji,
      recurrence: createdEvent.recurrence,
      agendaId
    });
  } catch (err) {
    if (session) {
      session.endSession();
    }
    console.error('❌ Erreur POST event:', err);
    return res.status(500).json({ error: err.message || 'internal error' });
  }
});


// Met à jour un événement existant
// PUT /api/events/:id
// Body: { title?, start?, end?, description?, emoji?, agendaId? }

router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { title, start, end, description, emoji, agendaId, recurrence } = req.body;
  
  try {
    const ev = await Event.findById(id);
    if (!ev) {
      return res.status(404).json({ error: 'event not found' });
    }
    
    // Vérification erreur horaire pour la mise à jour
    const newStart = start ? new Date(start) : ev.start;
    const newEnd = end ? new Date(end) : ev.end;
    
    if (newEnd < newStart) {
      return res.status(400).json({ 
        error: 'Erreur horaire : la date de fin ne peut pas être antérieure à la date de début' 
      });
    }
    
    // Si changement d'agenda, gérer le transfert
    if (agendaId) {
      // Trouver l'agenda actuel de l'événement
      const currentAgenda = await Agenda.findOne({ events: ev._id });
      const currentAgendaId = currentAgenda ? String(currentAgenda._id) : null;
      
      if (agendaId !== currentAgendaId) {
        // Vérifier que le nouvel agenda existe et appartient à l'utilisateur
        const newAgenda = await Agenda.findById(agendaId);
        if (!newAgenda) {
          return res.status(404).json({ error: 'new agenda not found' });
        }
        
        const user = await User.findById(req.user.id);
        if (!user || !user.agendas.includes(newAgenda._id)) {
          return res.status(403).json({ error: 'unauthorized access to this agenda' });
        }
        
        // Retirer l'événement de TOUS les agendas qui le contiennent
        await Agenda.updateMany(
          { events: ev._id },
          { $pull: { events: ev._id } }
        );
        
        // Ajouter l'événement au nouvel agenda (si pas déjà présent)
        if (!newAgenda.events.includes(ev._id)) {
          newAgenda.events.push(ev._id);
          await newAgenda.save();
        }
      }
    }
    
    // Mettre à jour les champs fournis
    if (title) ev.title = title;
    if (start) ev.start = newStart;
    if (end) ev.end = newEnd;
    if (description !== undefined) ev.description = description;
    if (emoji) ev.emoji = emoji;
    if (recurrence !== undefined) ev.recurrence = recurrence;
    
    await ev.save();
    
    return res.json({
      id: ev._id,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      description: ev.description,
      emoji: ev.emoji,
      recurrence: ev.recurrence
    });
  } catch (err) {
    console.error('❌ Erreur PUT event:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Supprime un événement
// DELETE /api/events/:id

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const ev = await Event.findById(id);
    if (!ev) {
      return res.status(404).json({ error: 'event not found' });
    }
    
    // Retire l'événement de tous les agendas
    await Agenda.updateMany({ events: id }, { $pull: { events: id } });
    
    // Supprime l'événement
    await ev.deleteOne();
    
    return res.json({ message: 'deleted' });
  } catch (err) {
    console.error('❌ Erreur DELETE event:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
