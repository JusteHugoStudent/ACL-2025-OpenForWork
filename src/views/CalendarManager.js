// Gere l'intégration avec FullCalendar

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

    // Initialise FullCalendar avec la configuration
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
        console.log('✅ CalendarManager: Calendrier FullCalendar initialisé et rendu avec succès');

    }


    // Définition des callbacks
    setOnEventClick(callback) { this.onEventClickCallback = callback; }
    setOnDateClick(callback) { this.onDateClickCallback = callback; }

    // Ajout d'événement sécurisé avec détection de doublons
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

    removeEvent(eventId) {
        const event = this.calendar?.getEventById(eventId);
        if (event) {
            event.remove();
            if (this.onEventRemoveCallback) this.onEventRemoveCallback(eventId);
        }
    }

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



    onEventAdd(callback) { this.onEventAddCallback = callback; }
    onEventChange(callback) { this.onEventChangeCallback = callback; }
    onEventRemove(callback) { this.onEventRemoveCallback = callback; }

    getAllEvents() { return this.calendar ? this.calendar.getEvents() : []; }
    getEventById(eventId) { return this.calendar?.getEventById(eventId); }

    changeView(viewName) { this.calendar?.changeView(viewName); }
    gotoDate(date) { this.calendar?.gotoDate(date); }
    today() { this.calendar?.today(); }
    prev() { this.calendar?.prev(); }
    next() { this.calendar?.next(); }
    refetchEvents() { this.calendar?.refetchEvents(); }

    // Detruit le calendrier
    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
    }

}
