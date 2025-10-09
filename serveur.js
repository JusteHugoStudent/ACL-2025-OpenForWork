const http = require('http');
const fs = require('fs');
const path = require('path');
const connectToMongo = require('./mongo');

connectToMongo().then(db => {
  if (db) {
    console.log('Connexion à MongoDB réussie au lancement du serveur.');
  } else {
    console.log('Échec de la connexion à MongoDB.');
  }
});

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'src', 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Erreur serveur : impossible de lire index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});