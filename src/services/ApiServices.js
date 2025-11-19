// Service de gestion des agendas

class AgendaService {
    // Récupère tous les agendas de l'utilisateur connecté
    // retourne une liste des agendas ou tableau vide si erreur
     
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
    
    // Crée un nouvel agenda
    // prend en paramettre name - Nom de l'agenda
    // prend en paramettre color - Couleur de l'agenda (hex)
    // retourne un Agenda créé ou null si erreur
     
    async create(name, color = THEME_COLORS.DEFAULT_AGENDA) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(API_ENDPOINTS.AGENDAS.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, color })
            });
            
            if (!response.ok) throw new Error('Erreur création agenda');
            return await response.json();
            
        } catch (error) {
            console.error('Erreur create agenda:', error);
            return null;
        }
    }
    
    /**
     * Modifie un agenda existant
     * @param {string} agendaId - ID de l'agenda à modifier
     * @param {string} name - Nouveau nom
     * @param {string} color - Nouvelle couleur
     * @returns {Promise<Object|null>} L'agenda modifié ou null
     */
    async update(agendaId, name, color) {
        try {
            const token = getToken();
            if (!token) throw new Error('Non authentifié');
            
            const response = await fetch(`/api/agendas/${agendaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, color })
            });
            
            if (!response.ok) throw new Error('Erreur modification agenda');
            return await response.json();
            
        } catch (error) {
            console.error('Erreur update agenda:', error);
            return null;
        }
    }

    // Supprime un agenda
    // prend en paramettre agendaId - ID de l'agenda à supprimer
    // retourne true si succès, false sinon
    
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

// Service des gestion d'evenements

class EventService {
    // Récupère tous les événements d'un agenda
    // prend en paramettre agendaId - ID de l'agenda
    // prend en paramettre start - Date de début (optionnel)
    // prend en paramettre end - Date de fin (optionnel)
    // retourne une liste des événements
     
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
    
    // Cree un nouvel evenement
    // prend en paramettre eventData - Donnees de l'evenement
    // retourne un evenement cree ou null
    
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
                    agendaId: eventData.agendaId,
                    recurrence: eventData.recurrence
                })
            });
            
            if (!response.ok) throw new Error('Erreur création événement');
            return await response.json();
            
        } catch (error) {
            console.error('Erreur create event:', error);
            return null;
        }
    }
    
    // Met à jour un événement existant
    // prend en paramettre eventId - ID de l'événement
    // prend en paramettre eventData - Nouvelles données
    // prend en paramettre true si succès
     
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
                    agendaId: eventData.agendaId,
                    recurrence: eventData.recurrence
                })
            });
            
            return response.ok;
            
        } catch (error) {
            console.error('Erreur update event:', error);
            return false;
        }
    }
    
    // Supprime un événement
    // prend en paramettre eventId - ID de l'événement
    // retourne true si succès
     
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
