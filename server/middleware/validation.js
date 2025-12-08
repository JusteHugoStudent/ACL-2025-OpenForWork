// Middleware de validation des entrées
// Validation simple des données sans dépendances externes

/**
 * Valide les données d'un événement
 * @param {Object} body - Corps de la requête
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEvent(body) {
    const errors = [];

    // Titre requis
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
        errors.push('Le titre est obligatoire');
    } else if (body.title.length > 200) {
        errors.push('Le titre ne peut pas dépasser 200 caractères');
    }

    // Date de début requise
    if (!body.start) {
        errors.push('La date de début est obligatoire');
    } else {
        const startDate = new Date(body.start);
        if (isNaN(startDate.getTime())) {
            errors.push('La date de début est invalide');
        }
    }

    // Date de fin optionnelle mais validée si présente
    if (body.end) {
        const endDate = new Date(body.end);
        if (isNaN(endDate.getTime())) {
            errors.push('La date de fin est invalide');
        }
    }

    // Emoji optionnel mais validé
    if (body.emoji && typeof body.emoji !== 'string') {
        errors.push('L\'emoji doit être une chaîne de caractères');
    }

    // Description optionnelle, limitée à 1000 caractères
    if (body.description && body.description.length > 1000) {
        errors.push('La description ne peut pas dépasser 1000 caractères');
    }

    // Récurrence validée
    if (body.recurrence) {
        const validTypes = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
        if (body.recurrence.type && !validTypes.includes(body.recurrence.type)) {
            errors.push('Type de récurrence invalide');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Valide les données d'un agenda
 * @param {Object} body - Corps de la requête
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAgenda(body) {
    const errors = [];

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        errors.push('Le nom de l\'agenda est obligatoire');
    } else if (body.name.length > 50) {
        errors.push('Le nom de l\'agenda ne peut pas dépasser 50 caractères');
    }

    // Couleur optionnelle mais validée (format hex)
    if (body.color) {
        const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
        if (!hexColorRegex.test(body.color)) {
            errors.push('La couleur doit être au format hexadécimal (#RGB ou #RRGGBB)');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Valide les identifiants de connexion
 * @param {Object} body - Corps de la requête
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCredentials(body) {
    const errors = [];

    if (!body.username || typeof body.username !== 'string' || body.username.trim().length === 0) {
        errors.push('Le nom d\'utilisateur est obligatoire');
    } else if (body.username.length < 3) {
        errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    } else if (body.username.length > 30) {
        errors.push('Le nom d\'utilisateur ne peut pas dépasser 30 caractères');
    }

    if (!body.password || typeof body.password !== 'string') {
        errors.push('Le mot de passe est obligatoire');
    } else if (body.password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Middleware Express pour valider les événements
 */
function validateEventMiddleware(req, res, next) {
    const result = validateEvent(req.body);
    if (!result.valid) {
        return res.status(400).json({ error: result.errors.join(', ') });
    }
    next();
}

/**
 * Middleware Express pour valider les agendas
 */
function validateAgendaMiddleware(req, res, next) {
    const result = validateAgenda(req.body);
    if (!result.valid) {
        return res.status(400).json({ error: result.errors.join(', ') });
    }
    next();
}

/**
 * Middleware Express pour valider les identifiants
 */
function validateCredentialsMiddleware(req, res, next) {
    const result = validateCredentials(req.body);
    if (!result.valid) {
        return res.status(400).json({ error: result.errors.join(', ') });
    }
    next();
}

module.exports = {
    validateEvent,
    validateAgenda,
    validateCredentials,
    validateEventMiddleware,
    validateAgendaMiddleware,
    validateCredentialsMiddleware
};
