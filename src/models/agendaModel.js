const mongoose = require('mongoose');

const agendaSchema = new mongoose.Schema({
  name: String,

  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
  
});
const Agenda = mongoose.models.Agenda || mongoose.model('Agenda', agendaSchema);
module.exports = Agenda;