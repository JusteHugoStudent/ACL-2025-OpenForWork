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
    }

    // Initialise FullCalendar avec la configuration

    init() {
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
                // faut save ici avec le modele
            },
            
            // Quand on redimensionne un event
        
            eventResize: (info) => {
                console.log('evenement redimensionne:', info.event.title);
            }
        });
        
        // Afficher le calendrier
        this.calendar.render();
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
    addEvent(eventData) {
        this.calendar.addEvent(eventData);
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
        }
    }

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