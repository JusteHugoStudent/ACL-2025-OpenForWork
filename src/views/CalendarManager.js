// Gere l'intégration avec FullCalendar
 
class CalendarManager {
    constructor() {
        // Ref a l'instance FullCalendar
        this.calendar = null;
        
        // Conteneur HTML du calendrier
        this.calendarEl = document.getElementById('calendar');
        
        // Callbacks (fonctions à appeler depuis l'extérieur)
        this.onEventClickCallback = null;
        this.onDateClickCallback = null;
        this.onEventAddCallback = null;
        this.onEventChangeCallback = null; // move/resize/update
        this.onEventRemoveCallback = null;
    }

    // Initialise FullCalendar avec la configuration

    init() {
        console.log('📅 CalendarManager: Initialisation du calendrier FullCalendar...');
        console.log('🎯 CalendarManager: Chargement des jours fériés et configuration française');
        
        this.calendar = new FullCalendar.Calendar(this.calendarEl, {
            // param de base
            locale: 'fr',
            
            // hauteur automatique
            height: 'auto',
            
            // en-tete du calendrier
            headerToolbar: {
                left: 'prev,next today',                        // Boutons navigation
                center: 'title',                                // Titre au centre
                right: 'dayGridMonth,timeGridWeek,timeGridDay'  // Boutons de vue
            },
            
            // texte des boutons en francais
            buttonText: {
                today: 'Aujourd\'hui',
                month: 'Mois',
                week: 'Semaine',
                day: 'Jour'
            },
            
            // vues
            
            // Vue par defaut au demarrage
            initialView: 'dayGridMonth',
            
            // Format de la date (ex: "vendredi 10 octobre 2025")
            titleFormat: { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            },
            
            // gestion des event
            
            // Les event peuvent etre glisses/déposes
            editable: true,
            
            // peut creer des event en cliquant
            selectable: true,
            
            // afficher le numero de semaine
            weekNumbers: true,
            
            // la semaine commence le lundi
            firstDay: 1,
            
            // format des heures (24h)
            slotLabelFormat: {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            },
            
            // format de l'heure des event
            eventTimeFormat: {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            },
            
            // duree d'un slot (30 minutes)
            slotDuration: '00:30:00',
            
            // callback
            
            // quand on clique sur un event
            eventClick: (info) => {
                if (this.onEventClickCallback) {
                    this.onEventClickCallback(info.event);
                }
            },
            
            // quand on clique sur une date
    
            dateClick: (info) => {
                if (this.onDateClickCallback) {
                    this.onDateClickCallback(info.dateStr);
                }
            },
            
            // Quand on glisse/depose un event
             
            eventDrop: (info) => {
                console.log('evenement déplace:', info.event.title);
                if (this.onEventChangeCallback) this.onEventChangeCallback(info.event);
            },
            
            // Quand on redimensionne un event
        
            eventResize: (info) => {
                console.log('evenement redimensionne:', info.event.title);
                if (this.onEventChangeCallback) this.onEventChangeCallback(info.event);
            }
        });
        
        // Afficher le calendrier
        this.calendar.render();
        
        console.log('✅ CalendarManager: Calendrier FullCalendar initialisé et rendu avec succès');
        console.log('🌟 CalendarManager: Prêt à charger les événements et jours fériés');
        
        // Ajouter automatiquement un événement pour demain
        this.addAutoEvent();
        
        // Charger et ajouter les jours fériés français
        this.loadHolidaysFr();
    }
    
    // Ajoute automatiquement un événement pour demain (méthode simple sans BDD)
    addAutoEvent() {
        console.log('🚀 CalendarManager: Ajout automatique d\'un événement pour demain...');
        
        // Calculer la date de demain
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Formater pour FullCalendar (YYYY-MM-DD)
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        // Créer l'événement directement avec addEvent
        const autoEvent = {
            id: 'auto-event-' + Date.now(),
            title: '🚀 Réunion Sprint 2 - Événement Auto',
            start: tomorrowStr + 'T10:00:00',
            end: tomorrowStr + 'T11:30:00',
            backgroundColor: '#3498db',
            borderColor: '#2980b9',
            textColor: 'white',
            extendedProps: {
                description: 'Événement créé automatiquement via CalendarManager.addEvent() - Sprint 2: événements récurrents, recherche, agendas multiples, jours fériés',
                source: 'auto'
            },
            editable: true
        };
        
        // Ajouter l'événement directement au calendrier (silent pour éviter les callbacks)
        this.addEvent(autoEvent, { silent: true });
        
    }
    
    // Charge les jours fériés français depuis le fichier JSON
    async loadHolidaysFr() {
        
        try {
            // Charger le fichier JSON des jours fériés 2025
            const response = await fetch('./holidaysFr.json');
            if (!response.ok) {
                throw new Error(`Impossible de charger le fichier: ${response.status}`);
            }
            
            const holidays = await response.json();
            console.log(` CalendarManager: ${holidays.length} jours fériés chargés depuis holidaysFr_2025.json`);
            
            // Ajouter chaque jour férié au calendrier
            holidays.forEach(holiday => {
                this.addEvent(holiday, { silent: true });
            });
            
            console.log(' CalendarManager: Tous les jours fériés français ont été ajoutés au calendrier');
            
        } catch (error) {
            console.error(' CalendarManager: Erreur lors du chargement des jours fériés:', error);
            
            // Fallback: ajouter quelques jours fériés manuellement
            console.log(' CalendarManager: Utilisation du fallback - ajout manuel des principaux jours fériés 2025');
            this.addManualHolidays();
        }
    }
    
    // Méthode de fallback pour ajouter manuellement quelques jours fériés importants
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
                editable: false,
                classNames: ['holiday-event']
            },
            {
                id: 'manual-fete-travail-2025',
                title: '🎉 Fête du Travail',
                start: '2025-05-01',
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                editable: false,
                classNames: ['holiday-event']
            },
            {
                id: 'manual-fete-nationale-2025',
                title: '🎉 Fête Nationale',
                start: '2025-07-14',
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                editable: false,
                classNames: ['holiday-event']
            },
            {
                id: 'manual-noel-2025',
                title: '🎉 Noël',
                start: '2025-12-25',
                allDay: true,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                textColor: 'white',
                editable: false,
                classNames: ['holiday-event']
            }
        ];
        
        manualHolidays.forEach(holiday => {
            this.addEvent(holiday, { silent: true });
        });
        
        console.log(`✅ CalendarManager: ${manualHolidays.length} jours fériés manuels ajoutés`);
    }

    // la fonction a apl quand on clique sur un event
    setOnEventClick(callback) {
        this.onEventClickCallback = callback;
    }

    // Definit la fonction a apl quand on clique sur une date
    setOnDateClick(callback) {
        this.onDateClickCallback = callback;
    }

    // ajoute un event au calendrier, eventData : les donnees de l'evenement
    // eventData: FullCalendar event input, options: { silent: true } to avoid triggering onEventAdd
    addEvent(eventData, options = {}) {
        const ev = this.calendar.addEvent(eventData);
        if (!options.silent && this.onEventAddCallback) this.onEventAddCallback(ev);
        return ev;
    }

    // maj event existant, eventId : L'id de l'event, updates : les modifs a appliquer
    updateEvent(eventId, updates) {
        const event = this.calendar.getEventById(eventId);
        if (event) {
            // Mettre à jour les propriétés
            if (updates.title) event.setProp('title', updates.title);
            if (updates.start) event.setStart(updates.start);
            if (updates.end) event.setEnd(updates.end);
            if (updates.backgroundColor) event.setProp('backgroundColor', updates.backgroundColor);
            if (updates.extendedProps) {
                event.setExtendedProp('description', updates.extendedProps.description);
            }
        }
    }

    // Supprime un event du calendrier
    removeEvent(eventId) {
        const event = this.calendar.getEventById(eventId);
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

    // Recupe tous les event du calendrier retourne une liste de tous les events
    getAllEvents() {
        return this.calendar.getEvents();
    }

    // Recup un événement par son ID
    getEventById(eventId) {
        return this.calendar.getEventById(eventId);
    }

    // Change la vue du calendrier viewName / nom de vue dayGridMonth, timeGridWeek, timeGridDay
    changeView(viewName) {
        this.calendar.changeView(viewName);
    }

    // Va a une date specifique et retourne la date a afficher
    gotoDate(date) {
        this.calendar.gotoDate(date);
    }

    // Va a aujourd'hui
    today() {
        this.calendar.today();
    }

    // Va au mois/semaine precedent
    prev() {
        this.calendar.prev();
    }

    // Va au mois/semaine suivant
    next() {
        this.calendar.next();
    }

    // Recharge tous les evenements depuis une source
    refetchEvents() {
        this.calendar.refetchEvents();
    }

    // Detruit l'instance du calendrier
    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
        }
    }
}