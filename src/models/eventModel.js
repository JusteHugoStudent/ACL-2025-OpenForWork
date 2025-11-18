// Modele event / evenement MongoDB
// Définit le schéma MongoDB pour les événements du calendrier
// Chaque événement a un titre, des dates de début/fin,
// une description optionnelle, et un emoji pour la catégorisation
 

const mongoose = require('mongoose');

// Sous-schéma pour la récurrence
const recurrenceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
    default: 'none'
  },
  interval: {
    type: Number,
    default: 1
  },
  endDate: Date,
  daysOfWeek: [Number]
}, { _id: false });

// Schéma de la collection "events"
const eventSchema = new mongoose.Schema({
  title: String,            // Titre de l'événement
  start: Date,              // Date/heure de début
  end: Date,                // Date/heure de fin
  description: String,      // Description optionnelle
  color: String,            // Couleur (legacy, remplacé par emoji)
  emoji: String,            // Emoji pour catégoriser l'événement
  
  // Configuration de récurrence
  recurrence: recurrenceSchema
}, { 
  strict: false,
  minimize: false 
});

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
module.exports = Event;
