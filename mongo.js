const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
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
