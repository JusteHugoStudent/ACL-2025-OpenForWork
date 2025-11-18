// Modele Agenda / Aganda MongoDB
// Définit le schéma MongoDB pour les agendas
// Chaque agenda a un nom et contient une liste de références
// vers les événements qui lui appartiennent

const mongoose = require('mongoose');

// Schéma de la collection "agendas"
const agendaSchema = new mongoose.Schema({
  name: String,             // Nom de l'agenda (ex: "Travail", "Personnel")
  events: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event'            // Références vers les événements de cet agenda
  }]
});

const Agenda = mongoose.models.Agenda || mongoose.model('Agenda', agendaSchema);
module.exports = Agenda;