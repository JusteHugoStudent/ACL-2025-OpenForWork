// Configuration des constantes backend
// Ce fichier contient les constantes partagées utilisées par le serveur

/**
 * Couleurs du thème pour les agendas
 */
const THEME_COLORS = {
    DEFAULT_AGENDA: '#3498db',        // Bleu par défaut
    JOURS_FERIES: '#dc3545'           // Rouge pour jours fériés
};

/**
 * Nom de l'agenda des jours fériés (non modifiable)
 */
const HOLIDAYS_AGENDA_NAME = 'Jours fériés';

module.exports = {
    THEME_COLORS,
    HOLIDAYS_AGENDA_NAME
};
