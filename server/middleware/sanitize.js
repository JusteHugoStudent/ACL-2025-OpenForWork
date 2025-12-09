// Middleware de sanitization HTML
// Protège contre les attaques XSS en nettoyant les entrées utilisateur

/**
 * Échappe les caractères HTML dangereux
 * @param {string} str - Chaîne à nettoyer
 * @returns {string} Chaîne nettoyée
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;

    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Nettoie récursivement un objet de ses caractères HTML dangereux
 * @param {any} obj - Objet à nettoyer
 * @returns {any} Objet nettoyé
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return escapeHtml(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }

    return obj;
}

/**
 * Liste des champs à ne pas sanitizer (ex: mots de passe hashés)
 */
const SKIP_FIELDS = ['password', 'token', 'refreshToken'];

/**
 * Nettoie sélectivement un objet en excluant certains champs
 * @param {Object} obj - Objet à nettoyer
 * @param {string[]} skipFields - Champs à ignorer
 * @returns {Object} Objet nettoyé
 */
function sanitizeWithSkip(obj, skipFields = SKIP_FIELDS) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj !== 'object' || Array.isArray(obj)) {
        return sanitizeObject(obj);
    }

    const sanitized = {};
    for (const key of Object.keys(obj)) {
        if (skipFields.includes(key)) {
            sanitized[key] = obj[key]; // Ne pas sanitizer ce champ
        } else {
            sanitized[key] = sanitizeObject(obj[key]);
        }
    }
    return sanitized;
}

/**
 * Middleware Express pour sanitizer le body des requêtes
 * À utiliser AVANT les routes qui traitent des données utilisateur
 */
function sanitizeBodyMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeWithSkip(req.body);
    }
    next();
}

/**
 * Middleware Express pour sanitizer les query params
 */
function sanitizeQueryMiddleware(req, res, next) {
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    next();
}

/**
 * Middleware combiné pour sanitizer body et query
 */
function sanitizeInputMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeWithSkip(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    next();
}

module.exports = {
    escapeHtml,
    sanitizeObject,
    sanitizeWithSkip,
    sanitizeBodyMiddleware,
    sanitizeQueryMiddleware,
    sanitizeInputMiddleware
};
