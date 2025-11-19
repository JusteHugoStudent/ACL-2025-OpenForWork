// Fichier de Configuration - des Constantes
// Ce fichier centralise toutes les constantes de l'application
// pour faciliter la maintenance et les modifications futures


// Configuration des emojis disponibles pour les événements
// Chaque emoji représente une catégorie d'événement
const EMOJIS = {
    CALENDRIER: '📅',
    TRAVAIL: '💼',
    ETUDES: '🎓',
    SPORT: '🏃',
    FETE: '🎉',
    REPAS: '🍽️',
    VOYAGE: '✈️',
    SANTE: '🏥',
    MUSIQUE: '🎵',
    APPEL: '📞',
    JEUX: '🎮',
    LECTURE: '📚'
};


// Liste complète des emojis avec leurs labels
// Utilisé pour générer les options de sélection

const EMOJI_OPTIONS = [
    { value: EMOJIS.CALENDRIER, label: 'Calendrier' },
    { value: EMOJIS.TRAVAIL, label: 'Travail' },
    { value: EMOJIS.ETUDES, label: 'Études' },
    { value: EMOJIS.SPORT, label: 'Sport' },
    { value: EMOJIS.FETE, label: 'Fête' },
    { value: EMOJIS.REPAS, label: 'Repas' },
    { value: EMOJIS.VOYAGE, label: 'Voyage' },
    { value: EMOJIS.SANTE, label: 'Santé' },
    { value: EMOJIS.MUSIQUE, label: 'Musique' },
    { value: EMOJIS.APPEL, label: 'Appel' },
    { value: EMOJIS.JEUX, label: 'Jeux' },
    { value: EMOJIS.LECTURE, label: 'Lecture' }
];

// Configuration du système de notifications
// Définit les seuils de rappel pour les événements à venir

const NOTIFICATION_CONFIG = {
    // Intervalle de vérification (en millisecondes)
    POLLING_INTERVAL: 60 * 1000, // 1 minute
    
    // Seuils de notification (en millisecondes)
    THRESHOLDS: [
        { time: 24 * 60 * 60 * 1000, label: '24 heures', key: '24h' },
        { time: 12 * 60 * 60 * 1000, label: '12 heures', key: '12h' },
        { time: 6 * 60 * 60 * 1000, label: '6 heures', key: '6h' },
        { time: 1 * 60 * 60 * 1000, label: '1 heure', key: '1h' },
        { time: 5 * 60 * 1000, label: '5 minutes', key: '5min' }
    ],
    
    // Durée d'affichage des notifications (en millisecondes)
    DISPLAY_DURATION: 10000, // 10 secondes
    
    // Fenêtre de tolérance pour éviter de rater une notification (en millisecondes)
    TOLERANCE_WINDOW: 2 * 60 * 1000, // 2 minutes (réduit de 5 à 2 pour plus de précision)
    
    // Durée de conservation de l'historique des notifications (en jours)
    HISTORY_RETENTION_DAYS: 7
};


 // Configuration des couleurs du thème de l'application
 
const THEME_COLORS = {
    NOIR: '#1a1a1a',
    NOIR_CLAIR: '#2d2d2d',
    BLANC: '#ffffff',
    JAUNE: '#ffd700',
    JAUNE_CLAIR: '#ffe44d',
    GRIS: '#4a4a4a',
    GRIS_CLAIR: '#6a6a6a',
    
    // Couleurs par défaut pour les agendas
    DEFAULT_AGENDA: '#3498db',        // Bleu par défaut
    JOURS_FERIES: '#dc3545'           // Rouge pour jours fériés
};


// Configuration des clés de stockage local (localStorage)
 
const STORAGE_KEYS = {
    TOKEN: 'token',
    NOTIFIED_EVENTS: 'notifiedEvents',
    CURRENT_USER: 'currentUser'
};


// Configuration des endpoints API
 
const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/login',
        SIGNUP: '/api/register'
    },
    AGENDAS: {
        LIST: '/api/agendas',
        CREATE: '/api/agendas',
        UPDATE: '/api/agendas/:id',
        DELETE: '/api/agendas/:id'
    },
    EVENTS: {
        LIST: '/api/events',
        CREATE: '/api/events',
        UPDATE: '/api/events/:id',
        DELETE: '/api/events/:id'
    }
};


// Messages d'erreur standardisés
 
const ERROR_MESSAGES = {
    AUTH: {
        MISSING_CREDENTIALS: 'Veuillez saisir un nom d\'utilisateur et un mot de passe',
        LOGIN_FAILED: 'Identifiants incorrects',
        SIGNUP_FAILED: 'Erreur lors de l\'inscription'
    },
    EVENT: {
        MISSING_FIELDS: 'Le titre et la date de début sont obligatoires',
        INVALID_DATE: 'La date de fin doit être postérieure à la date de début',
        CREATE_FAILED: 'Erreur lors de la création de l\'événement',
        UPDATE_FAILED: 'Erreur lors de la modification de l\'événement',
        DELETE_FAILED: 'Erreur lors de la suppression de l\'événement',
        LOAD_FAILED: 'Erreur lors du chargement des événements'
    },
    AGENDA: {
        MISSING_NAME: 'Le nom de l\'agenda est obligatoire',
        CREATE_FAILED: 'Erreur lors de la création de l\'agenda',
        DELETE_FAILED: 'Erreur lors de la suppression de l\'agenda',
        LOAD_FAILED: 'Erreur lors du chargement des agendas'
    },
    FILTER: {
        MISSING_DATES: 'Veuillez sélectionner une date de début et une date de fin',
        FILTER_FAILED: 'Erreur lors du filtrage des événements'
    }
};


// Nom de l'agenda des jours fériés (non modifiable)
 
const HOLIDAYS_AGENDA_NAME = 'Jours fériés';
