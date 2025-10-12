require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/userModel');
const Agenda = require('../models/agendaModel');
const Event = require('../models/eventModel');
const userId = "1";//test mais normalement c'est req.user._id;

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connecté via Mongoose'))
.catch(err => console.error('Erreur connexion MongoDB :', err));

/**
 * Crée un événement à partir d'un objet eventData
 * et l'ajoute au premier agenda du user
 * @param {Object} eventData - { title, start, end, description, color }
 */
async function createEvent(eventData) {
  try {
    const event = new Event({
      title: eventData.title,
      start: eventData.start,
      end: eventData.end || eventData.start,
      description: eventData.description || '',
      color: eventData.color || '#ffd700'
    });

    await event.save();

    //récupérer le user et le premier agenda
    const user = await User.findById(userId).populate('agendas');
    if (!user || !user.agendas.length) {
      throw new Error("Utilisateur ou agenda introuvable");
    }

    const firstAgenda = user.agendas[0];

    //Ajouter l'événement à l'agenda
    firstAgenda.events.push(event._id);
    await firstAgenda.save();

    return event;
  } catch (err) {
    console.error('Erreur création événement pour user :', err);
    throw err;
  }
}

module.exports = { createEvent };

