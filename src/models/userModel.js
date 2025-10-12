const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  agendas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Agenda' }]
});
const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;