const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String,
  start: Date,
  end: Date,
  description: String,
  color: String
});
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
module.exports = Event;
