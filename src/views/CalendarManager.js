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
        console.log('📅 CalendarManager: Initialisation du calendrier FullCalendar...');

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
                console.log('Événement déplacé:', info.event.title);
                if (this.onEventChangeCallback) this.onEventChangeCallback(info.event);
            },
            eventResize: (info) => {
                console.log('Événement redimensionné:', info.event.title);
                if (this.onEventChangeCallback) this.onEventChangeCallback(info.event);
            }
        });

        this.calendar.render();
        console.log('✅ CalendarManager: Calendrier FullCalendar initialisé et rendu avec succès');

        // Ajout auto d'un event test (optionnel)
        this.addAutoEvent();

        this.loadHolidaysFr();

    }

    // Ajoute un événement automatique pour demain (pour debug)
    addAutoEvent() {
        console.log('🚀 CalendarManager: Ajout automatique d\'un événement pour demain...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const autoEvent = {
            id: 'auto-event-' + Date.now(),
            title: '🚀 Réunion Sprint 2 - Événement Auto',
            start: tomorrowStr + 'T10:00:00',
            end: tomorrowStr + 'T11:30:00',
            backgroundColor: '#3498db',
            borderColor: '#2980b9',
            textColor: 'white',
            extendedProps: {
                description: 'Événement automatique pour test de rendu',
                source: 'auto'
            },
            editable: true
        };

        this.addEvent(autoEvent, { silent: true });
    }

    // Charge les jours fériés français depuis le JSON
    async loadHolidaysFr() {
        try {
            const response = await fetch('./holidaysFr.json');
            if (!response.ok) throw new Error(`Impossible de charger le fichier: ${response.status}`);

            const holidays = await response.json();
            console.log(`📅 CalendarManager: ${holidays.length} jours fériés chargés.`);

            holidays.forEach(holiday => {
                this.addEvent(holiday, { silent: true });
            });

            console.log('✅ CalendarManager: Tous les jours fériés français ont été ajoutés au calendrier');
        } catch (error) {
            console.error('❌ CalendarManager: Erreur lors du chargement des jours fériés:', error);
            console.log('➡️ Utilisation du fallback - ajout manuel de quelques jours fériés 2025');
            this.addManualHolidays();
        }
    }

    // Fallback manuel si holidaysFr.json manquant
    addManualHolidays() {
        const manualHolidays = [
            {
                id: 'manual-jour-an-2025',
                title: '🎉 Jour de l\'An',
                start: '2025-01-01',
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                editable: false
            },
            {
                id: 'manual-fete-travail-2025',
                title: '🎉 Fête du Travail',
                start: '2025-05-01',
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                editable: false
            },
            {
                id: 'manual-fete-nationale-2025',
                title: '🎉 Fête Nationale',
                start: '2025-07-14',
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                editable: false
            },
            {
                id: 'manual-noel-2025',
                title: '🎉 Noël',
                start: '2025-12-25',
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                editable: false
            }
        ];

        manualHolidays.forEach(holiday => this.addEvent(holiday, { silent: true }));
        console.log(`✅ CalendarManager: ${manualHolidays.length} jours fériés manuels ajoutés`);
    }

    // Définition des callbacks
    setOnEventClick(callback) { this.onEventClickCallback = callback; }
    setOnDateClick(callback) { this.onDateClickCallback = callback; }

    // Ajout d'événement sécurisé
    addEvent(eventData, options = {}) {
        if (!this.calendar) {
            console.warn('⚠️ CalendarManager: tentative d’ajouter un événement alors que le calendrier est null.');
            return null;
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

    removeAllEvents() {
        if (!this.calendar) return;
        this.calendar.getEvents().forEach(ev => ev.remove());
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
            console.log('🧹 CalendarManager: Calendrier détruit proprement');
        }
    }

}
