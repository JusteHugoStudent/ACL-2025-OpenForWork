/**
 * ============================================
 * CALENDARMANAGER - INTÉGRATION FULLCALENDAR
 * ============================================
 * 
 * Cette classe encapsule la bibliothèque FullCalendar et fournit
 * une interface simplifiée pour manipuler le calendrier.
 * 
 * Responsabilités :
 * - Initialiser et configurer FullCalendar
 * - Ajouter/modifier/supprimer des événements
 * - Gérer les vues (mois, semaine, jour)
 * - Détecter les doublons d'événements
 * - Gérer les callbacks d'interaction utilisateur
 */

class CalendarManager {
    constructor() {
        // Référence à l'instance FullCalendar
        this.calendar = null;

        // Conteneur HTML du calendrier
        this.calendarEl = document.getElementById('calendar');

        // Callbacks externes
        this.onEventClickCallback = null;
        this.onDateClickCallback = null;
        this.onEventAddCallback = null;
        this.onEventChangeCallback = null;
        this.onEventRemoveCallback = null;
    }

    /**
     * Initialise FullCalendar avec la configuration complète
     * Configure la langue, les vues, les callbacks, etc.
     * Attend que le DOM soit prêt avant de retourner
     * 
     * @returns {Promise<void>}
     */
    async init() {

        if (!this.calendarEl) {
            console.error('❌ CalendarManager: Élément #calendar introuvable dans le DOM');
            return;
        }

        this.calendar = new FullCalendar.Calendar(this.calendarEl, {
            locale: 'fr',
            height: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Aujourd\'hui',
                month: 'Mois',
                week: 'Semaine',
                day: 'Jour'
            },
            initialView: 'dayGridMonth',
            titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
            editable: true,
            selectable: true,
            weekNumbers: true,
            firstDay: 1,
            slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
            eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
            slotDuration: '00:30:00',

            // Callbacks FullCalendar
            eventClick: (info) => {
                if (this.onEventClickCallback) this.onEventClickCallback(info.event);
            },
            dateClick: (info) => {
                if (this.onDateClickCallback) this.onDateClickCallback(info.dateStr);
            },
            eventDrop: (info) => {
                if (this.onEventChangeCallback) this.onEventChangeCallback(info.event);
            },
            eventResize: (info) => {
                if (this.onEventChangeCallback) this.onEventChangeCallback(info.event);
            },
            datesSet: (info) => {// CALLBACK quand les dates visibles changent
                if (this.onVisiblePeriodChange) {
                    this.onVisiblePeriodChange(info.start, info.end, info.view.type);
                }
            }
        });


        this.calendar.render();
        
        // Attendre que le DOM soit mis à jour après le render
        await new Promise(resolve => setTimeout(resolve, 150));
    }


    // Définition des callbacks
    setOnEventClick(callback) { this.onEventClickCallback = callback; }
    setOnDateClick(callback) { this.onDateClickCallback = callback; }

    /**
     * Ajoute un événement au calendrier avec détection de doublons
     * Vérifie spécialement les jours fériés pour éviter les duplicatas
     * 
     * @param {Object} eventData - Données de l'événement à ajouter
     * @param {Object} options - Options { silent: boolean } pour désactiver le callback
     * @returns {Object|null} L'événement ajouté ou l'événement existant si doublon
     */
    addEvent(eventData, options = {}) {
        if (!this.calendar) {
            console.warn('⚠️ CalendarManager: tentative d\'ajouter un événement alors que le calendrier est null.');
            return null;
        }

        // Vérifier les doublons pour les jours fériés
        const isHoliday = eventData.extendedProps?.source?.startsWith('holiday') || (eventData.title && eventData.title.toLowerCase().includes('férié'));
        
        if (isHoliday) {
            const existingHoliday = this.calendar.getEvents().find(ev => 
                ev.title === eventData.title && 
                ev.startStr === eventData.start &&
                (ev.extendedProps?.source?.startsWith('holiday') || 
                ev.title.toLowerCase().includes('férié'))
            );
            
            if (existingHoliday) {
                return existingHoliday;
            }
        }

        const ev = this.calendar.addEvent(eventData);
        if (!options.silent && this.onEventAddCallback) this.onEventAddCallback(ev);
        return ev;
    }

    /**
     * Met à jour les propriétés d'un événement existant
     * 
     * @param {string} eventId - ID de l'événement à modifier
     * @param {Object} updates - Nouvelles valeurs {title, start, end, backgroundColor, extendedProps}
     */
    updateEvent(eventId, updates) {
        const event = this.calendar?.getEventById(eventId);
        if (event) {
            if (updates.title) event.setProp('title', updates.title);
            if (updates.start) event.setStart(updates.start);
            if (updates.end) event.setEnd(updates.end);
            if (updates.backgroundColor) event.setProp('backgroundColor', updates.backgroundColor);
            if (updates.extendedProps)
                event.setExtendedProp('description', updates.extendedProps.description);
        }
    }

    /**
     * Supprime un événement du calendrier
     * 
     * @param {string} eventId - ID de l'événement à supprimer
     */
    removeEvent(eventId) {
        const event = this.calendar?.getEventById(eventId);
        if (event) {
            event.remove();
            if (this.onEventRemoveCallback) this.onEventRemoveCallback(eventId);
        }
    }

    /**
     * Supprime tous les événements du calendrier
     * 
     * @param {boolean} preserveHolidays - Si true, conserve les jours fériés (par défaut true)
     */
    removeAllEvents(preserveHolidays = true) {
        if (!this.calendar) return;

        this.calendar.getEvents().forEach(ev => {
            if (preserveHolidays) {
                const isHoliday =
                    ev.extendedProps?.source?.startsWith('holiday') || 
                    (ev.title && ev.title.toLowerCase().includes('férié'));

                if (!isHoliday) ev.remove();
            } else {
                // Supprimer TOUS les événements (y compris les jours fériés)
                ev.remove();
            }
        });
    }



    // === CALLBACKS ===
    onEventAdd(callback) { this.onEventAddCallback = callback; }
    onEventChange(callback) { this.onEventChangeCallback = callback; }
    onEventRemove(callback) { this.onEventRemoveCallback = callback; }

    // === GETTERS ===
    getAllEvents() { return this.calendar ? this.calendar.getEvents() : []; }
    getEventById(eventId) { return this.calendar?.getEventById(eventId); }

    // === NAVIGATION ===
    changeView(viewName) { this.calendar?.changeView(viewName); }
    gotoDate(date) { this.calendar?.gotoDate(date); }
    today() { this.calendar?.today(); }
    prev() { this.calendar?.prev(); }
    next() { this.calendar?.next(); }
    refetchEvents() { this.calendar?.refetchEvents(); }

    /**
     * Détruit complètement l'instance FullCalendar
     * Utilisé lors de la déconnexion
     */
    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
    }

}
