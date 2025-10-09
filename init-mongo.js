const connectToMongo = require('./mongo');

async function initDB() {
  const db = await connectToMongo();
  if (!db) {
    console.error('Impossible de se connecter à la base.');
    process.exit(1);
  }
  try {
    const result = await db.collection('test').insertOne({ message: 'Hello MongoDB!' });
    console.log('Document inséré avec l\'id :', result.insertedId);
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors de l\'insertion :', err);
    process.exit(1);
  }
}

initDB();
