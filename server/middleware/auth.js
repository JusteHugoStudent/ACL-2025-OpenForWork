// Middleware d'authentification JWT
//Vérifie que le token JWT est présent et valide dans les requêtes.
//Ajoute les informations de l'utilisateur décodées dans req.user.

const jwt = require('jsonwebtoken');

// Récupération du secret JWT (vérifié au démarrage dans auth.routes.js)
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware d'authentification JWT
 * Vérifie le token dans le header Authorization: Bearer <token>
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction next pour continuer
 */
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;

  // Vérifie la présence du header Authorization
  if (!auth) {
    return res.status(401).json({ error: 'no token' });
  }

  // Vérifie le format "Bearer <token>"
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'bad token' });
  }

  const token = parts[1];

  try {
    // Vérifie et décode le token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Ajoute les infos user à la requête
    next(); // Continue vers la route
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
};

module.exports = authMiddleware;
