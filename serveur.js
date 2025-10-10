const express = require('express');
const path = require('path');
const connectToMongo = require('./mongo');

const app = express();
const PORT = 4000;

connectToMongo()
  .then(db => {
    if (db) {
      console.log('Connexion à MongoDB réussie au lancement du serveur.');
    } else {
      console.log('Échec de la connexion à MongoDB.');
    }
  })
  .catch(err => console.error('Erreur de connexion MongoDB :', err));

app.use(express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
