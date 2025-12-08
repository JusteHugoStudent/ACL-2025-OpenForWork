// Integration de FullCalendar
// Cette classe encapsule la bibliothèque FullCalendar et fournit
// une interface simplifiée pour manipuler le calendrier. 
// Responsabilités :
// - Initialiser et configurer FullCalendar
// - Ajouter/modifier/supprimer des événements
// - Gérer les vues (mois, semaine, jour)
// - Détecter les doublons d'événements
// - Gérer les callbacks d'interaction utilisateur


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

    // Initialise FullCalendar avec la configuration complète
    // Configure la langue, les vues, les callbacks, etc.
    // Attend que le DOM soit prêt avant de retourner 
     
    async init() {

        if (!this.calendarEl) {
            console.error('❌ CalendarManager: Élément #calendar introuvable dans le DOM');
            return;
        }

        this.calendar = new FullCalendar.Calendar(this.calendarEl, {
            locale: 'fr',
            height: '100%',
            expandRows: true,
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
                if (this.onDateClickCallback) {
                    this.onDateClickCallback(info.dateStr, info.date);
                }
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
            },
            eventDidMount: (info) => {
                // Force le style du contour avec la couleur de l'événement
                const borderColor = info.event.borderColor || info.event.backgroundColor;
                info.el.style.borderColor = borderColor;
                info.el.style.borderWidth = '2px';
                info.el.style.borderStyle = 'solid';
            }
        });


        this.calendar.render();
        
        // Attend que le DOM soit mis à jour après le render
        await new Promise(resolve => setTimeout(resolve, 150));
    }


    // Définition des callbacks
    setOnEventClick(callback) { this.onEventClickCallback = callback; }
    setOnDateClick(callback) { this.onDateClickCallback = callback; }

    // Ajoute un événement au calendrier avec détection de doublons
    // Vérifie spécialement les jours fériés pour éviter les duplicatas
    // prend en paramettre eventData - Données de l'événement à ajouter
    // prend en paramettre options - Options pour désactiver le callback
    // retourne l'événement ajouté ou l'événement existant si doublon
     
    addEvent(eventData, options = {}) {
        if (!this.calendar) {
            console.warn('⚠️ CalendarManager: tentative d\'ajouter un événement alors que le calendrier est null.');
            return null;
        }

        // Vérifie les doublons pour les jours fériés
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

    // Met à jour les propriétés d'un événement existant
    // prend en paramettre eventId - ID de l'événement à modifier
    // prend en paramettre updates - Nouvelles valeurs {title, start, end, backgroundColor, extendedProps}
     
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

    // Supprime un événement du calendrier
    // prend en paramettre eventId - ID de l'événement à supprimer
     
    removeEvent(eventId) {
        const event = this.calendar?.getEventById(eventId);
        if (event) {
            event.remove();
            if (this.onEventRemoveCallback) this.onEventRemoveCallback(eventId);
        }
    }

    // Supprime tous les événements du calendrier
    // prend en paramettre preserveHolidays - Si true, conserve les jours fériés (par défaut true)
    
    removeAllEvents(preserveHolidays = true) {
        if (!this.calendar) return;

        this.calendar.getEvents().forEach(ev => {
            if (preserveHolidays) {
                const isHoliday =
                    ev.extendedProps?.source?.startsWith('holiday') || 
                    (ev.title && ev.title.toLowerCase().includes('férié'));

                if (!isHoliday) ev.remove();
            } else {
                // Supprime TOUS les événements (y compris les jours fériés)
                ev.remove();
            }
        });
    }



    //Callback
    onEventAdd(callback) { this.onEventAddCallback = callback; }
    onEventChange(callback) { this.onEventChangeCallback = callback; }
    onEventRemove(callback) { this.onEventRemoveCallback = callback; }

    // Getters
    getAllEvents() { return this.calendar ? this.calendar.getEvents() : []; }
    getEventById(eventId) { return this.calendar?.getEventById(eventId); }

    // Navigation
    changeView(viewName) { this.calendar?.changeView(viewName); }
    gotoDate(date) { this.calendar?.gotoDate(date); }
    today() { this.calendar?.today(); }
    prev() { this.calendar?.prev(); }
    next() { this.calendar?.next(); }
    refetchEvents() { this.calendar?.refetchEvents(); }

    // Détruit complètement l'instance FullCalendar
    // Utilisé lors de la déconnexion
    
    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
            this.calendar = null;
        }
    }

}
