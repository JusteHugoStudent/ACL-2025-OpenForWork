// Utilitaires pour le formatage des événements
// Fonctions partagées pour éviter la duplication de code

/**
 * Formate les dates d'un événement pour la réponse API
 * Pour les événements all-day, retourne juste la date (YYYY-MM-DD)
 * Pour les autres, retourne l'objet Date complet
 * 
 * @param {Object} event - L'événement à formater
 * @returns {Object} { start, end } formatés selon le type d'événement
 */
function formatEventDates(event) {
    const isAllDay = event.allDay || false;

    if (isAllDay) {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            isAllDay: true
        };
    }

    return {
        start: event.start,
        end: event.end,
        isAllDay: false
    };
}

/**
 * Formate un événement complet pour la réponse API
 * 
 * @param {Object} event - L'événement MongoDB
 * @param {string} agendaId - ID de l'agenda (optionnel)
 * @returns {Object} Événement formaté pour le client
 */
function formatEventResponse(event, agendaId = null) {
    const { start, end, isAllDay } = formatEventDates(event);

    const response = {
        id: event._id,
        title: event.title,
        start: start,
        end: end,
        allDay: isAllDay,
        description: event.description,
        emoji: event.emoji,
        recurrence: event.recurrence || { type: 'none' }
    };

    if (agendaId) {
        response.agendaId = agendaId;
    }

    return response;
}

/**
 * Formate un événement pour l'affichage calendrier (GET)
 * 
 * @param {Object} event - L'événement MongoDB
 * @returns {Object} Événement formaté pour FullCalendar
 */
function formatEventForCalendar(event) {
    const { start, end, isAllDay } = formatEventDates(event);

    return {
        id: event._id,
        title: event.title,
        start: start,
        end: end,
        allDay: isAllDay,
        extendedProps: { description: event.description },
        emoji: event.emoji,
        recurrence: event.recurrence || { type: 'none' }
    };
}

module.exports = {
    formatEventDates,
    formatEventResponse,
    formatEventForCalendar
};
