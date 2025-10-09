const { MongoClient } = require('mongodb');

require('dotenv').config();
const url = process.env.MONGO_URL;
const dbName = 'acl2025';

async function connectToMongo() {
  const client = new MongoClient(url); 
  console.log('Tentative de connexion à MongoDB...');
  try {
    await client.connect();
    console.log('Connecté à MongoDB');
    const db = client.db(dbName);
    return db;
  } catch (err) {
    console.error('Erreur de connexion à MongoDB:', err);
  }
}

module.exports = connectToMongo;
