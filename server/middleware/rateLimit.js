// Middleware de rate limiting
// Protège contre les attaques brute-force sur les endpoints sensibles

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter pour l'authentification (login/register)
 * Limite: 5 tentatives par fenêtre de 15 minutes par IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives maximum
    message: {
        error: 'Trop de tentatives, veuillez réessayer dans 15 minutes'
    },
    standardHeaders: true, // Retourne les headers RateLimit-*
    legacyHeaders: false,
    skipSuccessfulRequests: true // Ne compte que les échecs
});

/**
 * Rate limiter général pour l'API
 * Limite: 100 requêtes par minute par IP
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requêtes maximum
    message: {
        error: 'Trop de requêtes, veuillez réessayer plus tard'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { authLimiter, apiLimiter };
