// Modele user / utilsateur MangoDB
// Définit le schéma MongoDB pour les utilisateurs de l'application
// Chaque utilisateur possède un nom, un mot de passe hashé,
// et une liste de références vers ses agendas


const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Schéma de la collection "users"
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true // Pas de doublons
  },
  password: { 
    type: String, 
    required: true // Hashé avec bcrypt
  },
  agendas: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Agenda' // Références vers les agendas de l'utilisateur
  }]
});

// Méthode helper pour comparer un mot de passe avec le hash stocké
// Utilisée lors de la connexion
// prend en paramettre candidate - Mot de passe en clair à vérifier
// retourne true si le mot de passe correspond
 
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;