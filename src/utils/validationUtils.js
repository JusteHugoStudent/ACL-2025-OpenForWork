// Utilitaires de validation
// Fonctions simples pour valider les données utilisateur


// Vérifie qu'une valeur n'est pas vide
 
function isNotEmpty(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
}

// Valide les données d'un événement
 
function validateEventData(eventData) {
    const errors = [];
    
    if (!isNotEmpty(eventData.title)) {
        errors.push('Le titre est obligatoire');
    }
    
    if (!isNotEmpty(eventData.start)) {
        errors.push('La date de début est obligatoire');
    }
    
    if (eventData.start && eventData.end) {
        const startDate = new Date(eventData.start);
        const endDate = new Date(eventData.end);
        
        if (endDate < startDate) {
            errors.push('La date de fin doit être postérieure à la date de début');
        }
    }
    
    // Validation de la date de fin de récurrence
    if (eventData.recurrence && eventData.recurrence.type !== 'none' && eventData.recurrence.endDate) {
        const startDate = new Date(eventData.start);
        const recurrenceEndDate = new Date(eventData.recurrence.endDate);
        
        if (recurrenceEndDate < startDate) {
            errors.push('La date de fin de récurrence ne peut pas être antérieure à la date de début de l\'événement');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}
