/**
 * ============================================
 * CONFIGURATION BASE DE DONNÉES
 * ============================================
 * 
 * Gère la connexion à MongoDB via Mongoose.
 * Utilise les variables d'environnement pour l'URL de connexion.
 */

const mongoose = require('mongoose');

/**
 * Établit la connexion à MongoDB
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/acl2025';
    await mongoose.connect(mongoUrl);
    console.log('✅ Mongoose connecté à MongoDB');
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err);
    process.exit(1); // Arrêter le serveur si la DB ne se connecte pas
  }
};

module.exports = connectDatabase;
