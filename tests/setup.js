// Configuration de l'environnement de test
// Ce fichier est exécuté avant tous les tests

// Charge les variables d'environnement depuis .env
require('dotenv').config();

// Si JWT_SECRET n'est pas défini, utiliser une valeur de test
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-for-jest-only-do-not-use-in-production';
}
