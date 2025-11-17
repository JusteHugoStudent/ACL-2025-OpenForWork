/**
 * EventControllerFront.js
 * Contrôleur frontend responsable de la gestion des événements
 * Gère la création, modification, suppression et chargement des événements
 */

class EventControllerFront {
    /**
     * Constructeur du contrôleur d'événements
     * @param {EventService} eventService - Service pour les appels API événements
     * @param {CalendarManager} calendarManager - Gestionnaire du calendrier FullCalendar
     * @param {ModalView} modalView - Vue de la modale pour créer/éditer des événements
     */
    constructor(eventService, calendarManager, modalView) {
        this.eventService = eventService;
        this.calendarManager = calendarManager;
        this.modalView = modalView;
        
        // État de l'édition
        this.editingEventId = null;
    }

    /**
     * Crée un nouvel événement sur le serveur et l'ajoute au calendrier
     * @param {Object} eventData - Données de l'événement { title, start, end, description, emoji, agendaId }
     * @returns {Promise<Object|null>} L'événement créé ou null en cas d'erreur
     */
    async createEvent(eventData) {
        const token = getToken();
        if (!token) return null;
        
        if (!eventData.agendaId) {
            console.error("Aucun agenda sélectionné pour l'ajout de l'événement !");
            return null;
        }

        try {
            const body = {
                title: eventData.title,
                start: eventData.start ? (eventData.start instanceof Date ? eventData.start.toISOString() : new Date(eventData.start).toISOString()) : undefined,
                end: eventData.end ? (eventData.end instanceof Date ? eventData.end.toISOString() : new Date(eventData.end).toISOString()) : undefined,
                description: eventData.description,
                emoji: eventData.emoji,
                agendaId: eventData.agendaId
            };

            // Utiliser EventService pour créer l'événement
            const created = await this.eventService.create(body);
            return created;
        } catch (err) {
            console.error('Create event failed:', err);
            alert(ERROR_MESSAGES.EVENT.CREATE_FAILED + ': ' + err.message);
            return null;
        }
    }

    /**
     * Met à jour un événement existant sur le serveur
     * @param {Object} eventData - Données de l'événement { id, title, start, end, description, emoji }
     * @returns {Promise<boolean>} true si la mise à jour a réussi
     */
    async updateEvent(eventData) {
        const token = getToken();
        if (!token) return false;
        
        try {
            const id = eventData.id;
            const body = {
                title: eventData.title,
                start: eventData.start ? (eventData.start instanceof Date ? eventData.start.toISOString() : new Date(eventData.start).toISOString()) : undefined,
                end: eventData.end ? (eventData.end instanceof Date ? eventData.end.toISOString() : new Date(eventData.end).toISOString()) : undefined,
                description: eventData.description,
                emoji: eventData.emoji,
                agendaId: eventData.agendaId // Inclure l'agenda pour permettre le changement d'agenda
            };
            
            console.log(`🔄 Mise à jour événement ${id}:`, body);
            
            // Utiliser EventService pour mettre à jour l'événement
            await this.eventService.update(id, body);
            
            console.log(`✅ Événement ${id} mis à jour avec succès`);
            return true;
        } catch (err) {
            console.error('Update event failed:', err);
            alert(ERROR_MESSAGES.EVENT.UPDATE_FAILED + ': ' + err.message);
            return false;
        }
    }

    /**
     * Supprime un événement du serveur
     * @param {string} eventId - ID de l'événement à supprimer
     * @returns {Promise<void>}
     */
    async deleteEvent(eventId) {
        const token = getToken();
        if (!token) return;
        
        try {
            // Utiliser EventService pour supprimer l'événement
            await this.eventService.delete(eventId);
        } catch (err) {
            console.error('Delete event failed:', err);
        }
    }

    /**
     * Charge les événements d'un agenda spécifique avec optimisation de période
     * @param {string} agendaId - ID de l'agenda dont charger les événements
     * @param {Array} allAgendas - Liste de tous les agendas pour récupérer les noms
     * @param {string} currentAgendaId - ID de l'agenda principal pour le styling
     * @returns {Promise<void>}
     */
    async loadEventsFromAgenda(agendaId, allAgendas, currentAgendaId) {
        const token = getToken();
        if (!token) return;

        try {
            // Supprimer d'abord tous les événements existants de cet agenda pour éviter les doublons
            const allEvents = this.calendarManager.calendar.getEvents();
            allEvents.forEach(event => {
                // Les IDs sont au format "agendaId-eventId"
                if (event.id && event.id.startsWith(`${agendaId}-`)) {
                    event.remove();
                }
            });
            
            // Optimisation : chargement seulement de la période visible + 1 mois
            let url = `/api/events?agendaId=${agendaId}`;
            
            if (this.calendarManager.calendar) {
                const view = this.calendarManager.calendar.view;
                if (view && view.activeStart && view.activeEnd) {
                    const start = new Date(view.activeStart);
                    start.setMonth(start.getMonth() - 1);
                    
                    const end = new Date(view.activeEnd);
                    end.setMonth(end.getMonth() + 1);
                    
                    url += `&start=${start.toISOString()}&end=${end.toISOString()}`;
                }
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const events = await res.json();
            
            console.log(`📥 Chargement agenda ${agendaId}:`, events.length, 'événements');
            
            // Récupérer le nom de l'agenda pour l'affichage
            const agenda = allAgendas.find(a => a.id === agendaId);
            const agendaName = agenda ? agenda.name : 'Agenda';
            
            const isHolidaysAgenda = agendaName === HOLIDAYS_AGENDA_NAME;
            const isMainAgenda = currentAgendaId && agendaId === currentAgendaId;
            
            // Définir la couleur selon le type d'agenda
            let backgroundColor;
            if (isHolidaysAgenda) {
                backgroundColor = THEME_COLORS.JOURS_FERIES; // Rouge pour les jours fériés
            } else if (isMainAgenda) {
                backgroundColor = THEME_COLORS.AGENDA_PRINCIPAL; // Bleu pour l'agenda principal
            } else {
                backgroundColor = THEME_COLORS.AGENDA_SECONDAIRE; // Bleu translucide pour les autres
            }

            // Ajouter chaque événement au calendrier
            events.forEach(ev => {
                const fullTitle = ev.emoji ? `${ev.emoji} ${ev.title}` : ev.title;
                
                // Le backend renvoie 'id' et non '_id'
                const eventId = ev.id || ev._id;
                const compositeId = `${agendaId}-${eventId}`;
                console.log(`📌 Ajout événement: compositeId="${compositeId}", eventId="${eventId}", title="${ev.title}"`);
                
                this.calendarManager.addEvent({
                    id: compositeId,
                    title: fullTitle,
                    start: ev.start,
                    end: ev.end,
                    backgroundColor: backgroundColor,
                    borderColor: backgroundColor,
                    extendedProps: {
                        agendaId: agendaId,
                        agendaName: agendaName,
                        originalTitle: ev.title,
                        description: ev.description || '',
                        emoji: ev.emoji || '📅'
                    }
                });
            });

        } catch (err) {
            console.error(`Erreur chargement événements agenda ${agendaId}:`, err);
        }
    }

    /**
     * Charge les événements de plusieurs agendas
     * @param {Array<string>} agendaIds - Liste des IDs d'agendas à charger
     * @param {Array} allAgendas - Liste de tous les agendas
     * @param {string} currentAgendaId - ID de l'agenda principal
     * @returns {Promise<void>}
     */
    async loadEventsFromMultipleAgendas(agendaIds, allAgendas, currentAgendaId) {
        for (const agendaId of agendaIds) {
            await this.loadEventsFromAgenda(agendaId, allAgendas, currentAgendaId);
        }
    }

    /**
     * Filtre les événements selon des critères et génère une liste
     * @param {Date} startDate - Date de début du filtre
     * @param {Date} endDate - Date de fin du filtre
     * @param {Array<string>} agendaIds - IDs des agendas à inclure
     * @param {Array} allAgendas - Liste de tous les agendas
     * @returns {Promise<Array>} Liste des événements filtrés
     */
    async filterEvents(startDate, endDate, agendaIds, allAgendas) {
        const token = getToken();
        if (!token) return [];

        try {
            let allEvents = [];

            // Charger les événements pour chaque agenda
            for (const agendaId of agendaIds) {
                const res = await fetch(`/api/events?agendaId=${agendaId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) continue;

                const events = await res.json();
                const agenda = allAgendas.find(a => a.id === agendaId);
                const agendaName = agenda ? agenda.name : 'Agenda';
                
                // Ajouter une référence à l'agenda pour l'affichage
                events.forEach(ev => ev._agendaName = agendaName);
                allEvents.push(...events);
            }

            // Filtrer par dates
            const filtered = allEvents.filter(ev => {
                const evStart = new Date(ev.start);
                return evStart >= startDate && evStart <= endDate;
            });

            // Trier par date de début
            filtered.sort((a, b) => new Date(a.start) - new Date(b.start));

            return filtered;
        } catch (err) {
            console.error('Erreur lors du filtrage des événements :', err);
            return [];
        }
    }

    /**
     * Définit l'ID de l'événement en cours d'édition
     * @param {string} eventId - ID de l'événement
     */
    setEditingEvent(eventId) {
        this.editingEventId = eventId;
    }

    /**
     * Obtient l'ID de l'événement en cours d'édition
     * @returns {string|null}
     */
    getEditingEventId() {
        return this.editingEventId;
    }

    /**
     * Supprime l'événement en cours d'édition avec confirmation
     * @returns {Promise<boolean>} true si l'événement a été supprimé
     */
    async deleteEditingEvent() {
        if (!this.editingEventId) return false;
        
        if (this.modalView.confirmDelete()) {
            // Supprimer du calendrier avec l'ID complet
            this.calendarManager.removeEvent(this.editingEventId);
            
            // Extraire l'eventId réel pour l'API (format: "agendaId-eventId")
            const realEventId = this.editingEventId.includes('-') 
                ? this.editingEventId.split('-')[1] 
                : this.editingEventId;
            
            await this.deleteEvent(realEventId);
            this.modalView.close();
            return true;
        }
        return false;
    }
}
