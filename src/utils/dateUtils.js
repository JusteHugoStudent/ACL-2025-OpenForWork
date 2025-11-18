// Utilitaire de gestion des dates
// Ce fichier contient toutes les fonctions utilitaires
// pour la manipulation et le formatage des dates



// Formate une date pour les inputs de type datetime-local
// Format requis : YYYY-MM-DDThh:mm
// prend en paramettre date - La date à formater
// prend en paramettre la date au format datetime-local (YYYY-MM-DDThh:mm)
 
// example :
// formatDateTimeLocal(new Date('2025-11-17T14:30:00'))
// Retourne : "2025-11-17T14:30"

function formatDateTimeLocal(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Date invalide fournie à formatDateTimeLocal');
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Formate une date au format français lisible
// Format : JJ/MM/AAAA à HH:MM
// prend en paramettre date - La date à formater (Date ou string ISO)
// retourne la date formatée en français
// example :
// formatDateFrench(new Date('2025-11-17T14:30:00'))
// Retourne : "17/11/2025 à 14:30"

function formatDateFrench(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
        console.error('Date invalide fournie à formatDateFrench');
        return '';
    }
    
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `${formattedDate} à ${formattedTime}`;
}

// Vérifie si une date de fin est valide par rapport à une date de début
// La date de fin ne peut pas être antérieure à la date de début 
// prend en paramettre} start - Date de début
// prend en paramettre end - Date de fin
// retourne un bool true si valide, false sinon

function isValidDateRange(start, end) {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    
    // Vérifie que les dates sont valides
    if (!(startDate instanceof Date) || isNaN(startDate) ||
        !(endDate instanceof Date) || isNaN(endDate)) {
        return false;
    }
    
    // La date de fin doit être >= à la date de début
    return endDate >= startDate;
}
