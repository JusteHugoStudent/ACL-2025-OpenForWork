// Utilitaires pour la gestion de la récurrence des événements
// Génère les occurrences répétées d'un événement selon les règles de récurrence

/**
 * Génère toutes les occurrences d'un événement récurrent dans une plage de dates
 * @param {Object} event - L'événement de base avec ses propriétés
 * @param {Date} rangeStart - Début de la plage à générer
 * @param {Date} rangeEnd - Fin de la plage à générer
 * @returns {Array} Liste des occurrences générées
 */
function generateRecurringOccurrences(event, rangeStart, rangeEnd) {
    const occurrences = [];
    
    // Si pas de récurrence ou type 'none', retourner l'événement original
    if (!event.recurrence || event.recurrence.type === 'none') {
        return [event];
    }
    
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const duration = eventEnd - eventStart; // Durée de l'événement en ms
    
    const recurrence = event.recurrence;
    const recurrenceEnd = recurrence.endDate ? new Date(recurrence.endDate) : rangeEnd;
    const interval = recurrence.interval || 1;
    
    let currentDate = new Date(eventStart);
    let occurrenceCount = 0;
    const MAX_OCCURRENCES = 1000; // Limite de sécurité
    
    while (currentDate <= recurrenceEnd && currentDate <= rangeEnd && occurrenceCount < MAX_OCCURRENCES) {
        // Vérifier si cette occurrence est dans la plage visible
        if (currentDate >= rangeStart) {
            // Pour récurrence hebdomadaire, vérifier le jour de la semaine
            if (recurrence.type === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
                const dayOfWeek = currentDate.getDay();
                if (recurrence.daysOfWeek.includes(dayOfWeek)) {
                    occurrences.push(createOccurrence(event, currentDate, duration, occurrenceCount));
                    occurrenceCount++;
                }
            } else {
                occurrences.push(createOccurrence(event, currentDate, duration, occurrenceCount));
                occurrenceCount++;
            }
        }
        
        // Calculer la prochaine occurrence selon le type
        currentDate = getNextOccurrence(currentDate, recurrence.type, interval);
    }
    
    return occurrences;
}

/**
 * Crée une occurrence d'événement
 */
function createOccurrence(event, startDate, duration, index) {
    const endDate = new Date(startDate.getTime() + duration);
    
    return {
        ...event,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        isRecurring: true,
        occurrenceIndex: index,
        originalEventId: event.id || event._id
    };
}

/**
 * Calcule la prochaine occurrence selon le type de récurrence
 */
function getNextOccurrence(currentDate, type, interval) {
    const nextDate = new Date(currentDate);
    
    switch(type) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
            
        case 'weekly':
            // Pour hebdomadaire, avancer d'un jour à la fois
            // (la vérification des jours se fait dans generateRecurringOccurrences)
            nextDate.setDate(nextDate.getDate() + 1);
            break;
            
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
            
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
    }
    
    return nextDate;
}

/**
 * Vérifie si un événement a une récurrence active
 */
function hasRecurrence(event) {
    return event.recurrence && event.recurrence.type !== 'none';
}

/**
 * Obtient une description textuelle de la récurrence
 */
function getRecurrenceDescription(recurrence) {
    if (!recurrence || recurrence.type === 'none') {
        return 'Aucune récurrence';
    }
    
    const descriptions = {
        daily: 'Tous les jours',
        weekly: 'Toutes les semaines',
        monthly: 'Tous les mois',
        yearly: 'Tous les ans'
    };
    
    let desc = descriptions[recurrence.type] || '';
    
    if (recurrence.type === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const days = recurrence.daysOfWeek.map(d => dayNames[d]).join(', ');
        desc += ` (${days})`;
    }
    
    if (recurrence.endDate) {
        const endDate = new Date(recurrence.endDate);
        desc += ` jusqu'au ${endDate.toLocaleDateString('fr-FR')}`;
    }
    
    return desc;
}
