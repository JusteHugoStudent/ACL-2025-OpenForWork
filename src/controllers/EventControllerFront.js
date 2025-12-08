// Contrôleur frontend responsable de la gestion des événements
// Gère la création, modification, suppression et chargement des événements


class EventControllerFront {
    // Constructeur du contrôleur d'événements
    // prend en paramettre eventService - Service pour les appels API événements
    // prend en paramettre calendarManager - Gestionnaire du calendrier FullCalendar
    // prend en paramettre - Vue de la modale pour créer/éditer des événements
     
    constructor(eventService, calendarManager, modalView) {
        this.eventService = eventService;
        this.calendarManager = calendarManager;
        this.modalView = modalView;
        
        // État de l'édition
        this.editingEventId = null;
    }

    
    // Crée un nouvel événement sur le serveur et l'ajoute au calendrier
    // prend en paramettre eventData - Données de l'événement { title, start, end, description, emoji, agendaId, allDay }
    // retourne l'événement créé ou null en cas d'erreur
    
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
                start: eventData.start,
                end: eventData.end || eventData.start,
                allDay: eventData.allDay || false,
                description: eventData.description,
                emoji: eventData.emoji,
                agendaId: eventData.agendaId,
                recurrence: eventData.recurrence || { type: 'none' }
            };

            // Utilise EventService pour créer l'événement
            const created = await this.eventService.create(body);
            return created;
        } catch (err) {
            console.error('Create event failed:', err);
            alert(ERROR_MESSAGES.EVENT.CREATE_FAILED + ': ' + err.message);
            return null;
        }
    }

    /**
    // Met à jour un événement existant sur le serveur
    // prend en paramettre eventData - Données de l'événement { id, title, start, end, description, emoji, allDay }
    // retourne true si la mise à jour a réussi
     */
    async updateEvent(eventData) {
        const token = getToken();
        if (!token) return false;
        
        try {
            const id = eventData.id;
            
            const body = {
                title: eventData.title,
                start: eventData.start,
                end: eventData.end || eventData.start,
                allDay: eventData.allDay !== undefined ? eventData.allDay : false,
                description: eventData.description,
                emoji: eventData.emoji,
                agendaId: eventData.agendaId,
                recurrence: eventData.recurrence || { type: 'none' }
            };
            
            // Utilise EventService pour mettre à jour l'événement
            await this.eventService.update(id, body);
            
            return true;
        } catch (err) {
            console.error('Update event failed:', err);
            alert(ERROR_MESSAGES.EVENT.UPDATE_FAILED + ': ' + err.message);
            return false;
        }
    }

    
    // Supprime un événement du serveur
    // prend en paramettre eventId - ID de l'événement à supprimer

    async deleteEvent(eventId) {
        const token = getToken();
        if (!token) return;
        
        try {
            // Utilise EventService pour supprimer l'événement
            await this.eventService.delete(eventId);
        } catch (err) {
            console.error('Delete event failed:', err);
        }
    }

    // Charge les événements d'un agenda spécifique avec optimisation de période
    // prend en paramettre agendaId - ID de l'agenda dont charger les événements
    // prend en paramettre allAgendas - Liste de tous les agendas pour récupérer les noms
    // prend en paramettre currentAgendaId - ID de l'agenda principal pour le styling
    
    async loadEventsFromAgenda(agendaId, allAgendas, currentAgendaId) {
        const token = getToken();
        if (!token) return;

        try {
            // Supprime d'abord tous les événements existants de cet agenda pour éviter les doublons
            const allEvents = this.calendarManager.calendar.getEvents();
            allEvents.forEach(event => {
                // Les IDs sont au format "agendaId-eventId"
                if (event.id && event.id.startsWith(`${agendaId}-`)) {
                    event.remove();
                }
            });
            
            // chargement seulement de la période visible + 1 mois
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
            
            // Récupére le nom et la couleur de l'agenda
            const agenda = allAgendas.find(a => a.id === agendaId);
            const agendaName = agenda ? agenda.name : 'Agenda';
            
            const isHolidaysAgenda = agendaName === HOLIDAYS_AGENDA_NAME;
            
            // Utilise la couleur personnalisée de l'agenda
            let backgroundColor;
            if (isHolidaysAgenda) {
                backgroundColor = THEME_COLORS.JOURS_FERIES; // Rouge pour les jours fériés
            } else {
                backgroundColor = agenda?.color || THEME_COLORS.DEFAULT_AGENDA; // Couleur de l'agenda ou bleu par défaut
            }

            // Ajoute chaque événement au calendrier
            events.forEach(ev => {
                // Vérifier si l'événement a une récurrence
                if (hasRecurrence(ev)) {
                    // Générer toutes les occurrences pour la plage visible
                    const view = this.calendarManager.calendar.view;
                    const rangeStart = view ? view.activeStart : new Date();
                    const rangeEnd = view ? view.activeEnd : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                    
                    const occurrences = generateRecurringOccurrences(ev, rangeStart, rangeEnd);
                    
                    occurrences.forEach((occurrence, index) => {
                        this.addEventToCalendar(occurrence, agendaId, agendaName, backgroundColor, index);
                    });
                } else {
                    // Événement simple (non récurrent)
                    this.addEventToCalendar(ev, agendaId, agendaName, backgroundColor, 0);
                }
            });

        } catch (err) {
            console.error(`Erreur chargement événements agenda ${agendaId}:`, err);
        }
    }

    // Ajoute un événement (ou une occurrence) au calendrier
    addEventToCalendar(ev, agendaId, agendaName, backgroundColor, occurrenceIndex) {
        const fullTitle = ev.emoji ? `${ev.emoji} ${ev.title}` : ev.title;
        
        // Le backend renvoie 'id' et non '_id'
        const eventId = ev.id || ev._id || ev.originalEventId;
        const compositeId = ev.isRecurring 
            ? `${agendaId}-${eventId}-${occurrenceIndex}`
            : `${agendaId}-${eventId}`;
        
        // Détecte si c'est un événement journée entière
        const isAllDay = ev.allDay || false;
        
        this.calendarManager.addEvent({
            id: compositeId,
            title: fullTitle,
            start: ev.start,
            end: ev.end,
            allDay: isAllDay,  // Propriété FullCalendar pour afficher en haut du jour
            backgroundColor: backgroundColor,
            borderColor: backgroundColor,
            extendedProps: {
                agendaId: agendaId,
                agendaName: agendaName,
                originalTitle: ev.title,
                description: ev.description || ev.extendedProps?.description || '',
                emoji: ev.emoji || '📅',
                allDay: isAllDay,
                isRecurring: ev.isRecurring || false,
                originalEventId: eventId,
                originalStart: ev.originalStart,
                originalEnd: ev.originalEnd,
                recurrence: ev.recurrence
            }
        });
    }

    
    // Charge les événements de plusieurs agendas
    // prend en paramettre agendaIds - Liste des IDs d'agendas à charger
    // prend en paramettre allAgendas - Liste de tous les agendas
    // prend en paramettre currentAgendaId - ID de l'agenda principal
     
    async loadEventsFromMultipleAgendas(agendaIds, allAgendas, currentAgendaId) {
        for (const agendaId of agendaIds) {
            await this.loadEventsFromAgenda(agendaId, allAgendas, currentAgendaId);
        }
    }

    
    // Filtre les événements selon des critères et génère une liste
    // prend en paramettre startDate - Date de début du filtre
    // prend en paramettre endDate - Date de fin du filtre
    // prend en paramettre agendaIds - IDs des agendas à inclure
    // prend en paramettre - Liste de tous les agendas
    // retourne la liste des événements filtrés
     
    async filterEvents(startDate, endDate, agendaIds, allAgendas) {
        const token = getToken();
        if (!token) return [];

        try {
            let allEvents = [];

            // Charge les événements pour chaque agenda
            for (const agendaId of agendaIds) {
                const res = await fetch(`/api/events?agendaId=${agendaId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) continue;

                const events = await res.json();
                const agenda = allAgendas.find(a => a.id === agendaId);
                const agendaName = agenda ? agenda.name : 'Agenda';
                const agendaColor = agenda?.name === HOLIDAYS_AGENDA_NAME ? THEME_COLORS.JOURS_FERIES : (agenda?.color || THEME_COLORS.DEFAULT_AGENDA);
                
                // Traite chaque événement et génère les occurrences si récurrent
                events.forEach(ev => {
                    ev._agendaName = agendaName;
                    ev._agendaColor = agendaColor;
                    
                    // Génère les occurrences pour les événements récurrents
                    if (ev.recurrence && ev.recurrence.type !== 'none') {
                        const occurrences = generateRecurringOccurrences(ev, startDate, endDate);
                        occurrences.forEach(occ => {
                            occ._agendaName = agendaName;
                            occ._agendaColor = agendaColor;
                        });
                        allEvents.push(...occurrences);
                    } else {
                        allEvents.push(ev);
                    }
                });
            }

            // Filtre par dates
            const filtered = allEvents.filter(ev => {
                const evStart = new Date(ev.start);
                return evStart >= startDate && evStart <= endDate;
            });

            // Trie par date de début
            filtered.sort((a, b) => new Date(a.start) - new Date(b.start));

            return filtered;
        } catch (err) {
            console.error('Erreur lors du filtrage des événements :', err);
            return [];
        }
    }

    // Définit l'ID de l'événement en cours d'édition
    // prend en paramettre eventId - ID de l'événement
    
    setEditingEvent(eventId) {
        this.editingEventId = eventId;
    }

    // Obtient l'ID de l'événement en cours d'édition
    // retourne un string ou un null
    
    getEditingEventId() {
        return this.editingEventId;
    }

    
    // Supprime l'événement en cours d'édition avec confirmation
    // retourne true si l'événement a été supprimé

    async deleteEditingEvent() {
        if (!this.editingEventId) return false;
        
        if (this.modalView.confirmDelete()) {
            // Supprime du calendrier avec l'ID complet
            this.calendarManager.removeEvent(this.editingEventId);
            
            // Extrait l'eventId réel pour l'API (format: "agendaId-eventId")
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
