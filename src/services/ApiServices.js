/**
 * ============================================
 * SERVICE DE GESTION DES AGENDAS
 * ============================================
 */

class AgendaService {
    /**
     * Récupère tous les agendas de l'utilisateur connecté
     * @returns {Promise<Array>} Liste des agendas ou tableau vide si erreur
     */
    async fetchAll() {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(API_ENDPOINTS.AGENDAS.LIST, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Erreur chargement agendas');
            return await response.json();
            
        } catch (error) {
            console.error('Erreur fetchAll agendas:', error);
            return [];
        }
    }
    
    /**
     * Crée un nouvel agenda
     * @param {string} name - Nom de l'agenda
     * @returns {Promise<Object|null>} Agenda créé ou null si erreur
     */
    async create(name) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(API_ENDPOINTS.AGENDAS.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            
            if (!response.ok) throw new Error('Erreur création agenda');
            return await response.json();
            
        } catch (error) {
            console.error('Erreur create agenda:', error);
            return null;
        }
    }
    
    /**
     * Supprime un agenda
     * @param {string} agendaId - ID de l'agenda à supprimer
     * @returns {Promise<boolean>} true si succès, false sinon
     */
    async delete(agendaId) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(`/api/agendas/${agendaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            return response.ok;
            
        } catch (error) {
            console.error('Erreur delete agenda:', error);
            return false;
        }
    }
}

/**
 * ============================================
 * SERVICE DE GESTION DES ÉVÉNEMENTS
 * ============================================
 */

class EventService {
    /**
     * Récupère tous les événements d'un agenda
     * @param {string} agendaId - ID de l'agenda
     * @param {Date} start - Date de début (optionnel)
     * @param {Date} end - Date de fin (optionnel)
     * @returns {Promise<Array>} Liste des événements
     */
    async fetchByAgenda(agendaId, start = null, end = null) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            let url = `/api/events?agendaId=${agendaId}`;
            if (start && end) {
                url += `&start=${start.toISOString()}&end=${end.toISOString()}`;
            }
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Erreur chargement événements');
            return await response.json();
            
        } catch (error) {
            console.error('Erreur fetchByAgenda:', error);
            return [];
        }
    }
    
    /**
     * Crée un nouvel événement
     * @param {Object} eventData - Données de l'événement
     * @returns {Promise<Object|null>} Événement créé ou null
     */
    async create(eventData) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(API_ENDPOINTS.EVENTS.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: eventData.title,
                    start: eventData.start,
                    end: eventData.end || undefined,
                    description: eventData.description,
                    emoji: eventData.emoji,
                    agendaId: eventData.agendaId
                })
            });
            
            if (!response.ok) throw new Error('Erreur création événement');
            return await response.json();
            
        } catch (error) {
            console.error('Erreur create event:', error);
            return null;
        }
    }
    
    /**
     * Met à jour un événement existant
     * @param {string} eventId - ID de l'événement
     * @param {Object} eventData - Nouvelles données
     * @returns {Promise<boolean>} true si succès
     */
    async update(eventId, eventData) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: eventData.title,
                    start: eventData.start,
                    end: eventData.end || undefined,
                    description: eventData.description,
                    emoji: eventData.emoji,
                    agendaId: eventData.agendaId
                })
            });
            
            return response.ok;
            
        } catch (error) {
            console.error('Erreur update event:', error);
            return false;
        }
    }
    
    /**
     * Supprime un événement
     * @param {string} eventId - ID de l'événement
     * @returns {Promise<boolean>} true si succès
     */
    async delete(eventId) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            return response.ok;
            
        } catch (error) {
            console.error('Erreur delete event:', error);
            return false;
        }
    }
}
