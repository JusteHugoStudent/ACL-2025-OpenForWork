// Controleur principal a fusionner avec le controlleur par la suite

class App {
    constructor() {
        // creer toute les vue
        this.loginView = new LoginView();
        this.headerView = new HeaderView();
        this.modalView = new ModalView();
        this.calendarManager = new CalendarManager();
        
        // var d'etat
        this.currentUser = null;
        this.editingEventId = null; // ID de l'event en cours de modification
        
        // initialisation des gestionnaires d'événements (boutons, modale, header)
        this.initEvents();
    }

    // Initialise tous les events (callbacks)
    initEvents() {
        // Connexion
        this.loginView.onLoginClick((username, password) => {
            this.handleLogin(username, password);
        });

        // NOTE: l'inscription est gérée depuis la page dédiée `register.html`.
        // Le bouton "S'inscrire" sur la page de connexion redirige vers cette page
        // (il n'y a pas de binding JS ici pour éviter les envois accidentels).

        // Deconnexion
        this.headerView.onLogoutClick(() => {
            this.handleLogout();
        });

        // Modal - Boutons
        this.modalView.onSaveClick(() => {
            this.handleSaveEvent();
        });

        this.modalView.onDeleteClick(() => {
            this.handleDeleteEvent();
        });

        this.modalView.onCancelClick(() => {
            this.modalView.close();
        });
    }

    // Wire calendar persistence callbacks
    setupCalendarCallbacks() {
        // clic sur un event // Modifier
        this.calendarManager.setOnEventClick((event) => {
            this.handleEditEvent(event);
        });

        // clic sur une date // Ajouter
        this.calendarManager.setOnDateClick((dateStr) => {
            this.handleAddEvent(dateStr);
        });

        // event added locally -> persist


        // event moved/resized/changed -> persist update
        this.calendarManager.onEventChange((ev) => {
            this.updateEventOnServer({ id: ev.id, title: ev.title, start: ev.start, end: ev.end, description: ev.extendedProps.description, color: ev.backgroundColor });
        });

        // event removed -> persist delete
        this.calendarManager.onEventRemove((id) => {
            this.deleteEventOnServer(id);
        });
    }

    // Gere la connexion - Meca basique pour l'instant
    handleLogin(username, password) {
        // appel au backend
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(r => r.json())
        .then(data => {
            if (data.error) {
                this.loginView.showMessage(data.error, true);
                return;
            }
            // succes
            // Stocke le token JWT côté client (localStorage) pour appeller les API protégées
            // NOTE: localStorage est simple mais pas la méthode la plus sûre pour un produit
            localStorage.setItem('token', data.token);
            this.currentUser = data.username || username || 'Utilisateur';
            this.headerView.setUserName(this.currentUser);
            this.loginView.hide();
            this.headerView.show();

            // Initialise le calendrier et charge les événements depuis le backend
            // setupCalendarCallbacks() branche les handlers qui appelleront les
            // endpoints PUT/POST/DELETE pour persister les changements.
            this.calendarManager.init();
            this.setupCalendarCallbacks();
            this.loadEventsFromServer();
        }).catch(err => {
            console.error(err);
            this.loginView.showMessage('Erreur réseau', true);
        });
    }

    // Handle registration
    handleRegister(username, password) {
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(r => r.json())
        .then(data => {
            if (data.error) {
                this.loginView.showMessage(data.error, true);
                return;
            }
            // Si l'inscription réussit, on affiche un message et on vide le formulaire
            this.loginView.showMessage('Inscription réussie, connectez-vous');
            this.loginView.clear();
        }).catch(err => {
            console.error(err);
            this.loginView.showMessage('Erreur réseau', true);
        });
    }

    // charge les events depuis le backend et les ajoute au calendrier
    async loadEventsFromServer() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/events', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('failed to fetch events');
            const events = await res.json();
            // d'abord vider le calendrier
            this.calendarManager.destroy();
            this.calendarManager.init();
            events.forEach(ev => {
                // add silently to avoid re-posting to server
                const color = ev.color || ev.backgroundColor || '#ffd700';
                // Lors du chargement initial, on ajoute les événements en mode "silent"
                // pour éviter que la logique d'ajout local -> serveur ne renvoie un double POST.
                this.calendarManager.addEvent({ id: ev.id, title: ev.title, start: ev.start, end: ev.end, backgroundColor: color, borderColor: color, extendedProps: { description: ev.extendedProps ? ev.extendedProps.description : ev.description } }, { silent: true });
            });
        } catch (err) {
            console.error('Erreur chargement events:', err);
        }
    }

    // (setupCalendarCallbacks is implemented above with persistence wiring)

    // gere la deconnexion
    handleLogout() {
        this.currentUser = null;
        this.loginView.clear();
        this.calendarManager.destroy();
        this.headerView.hide();
        localStorage.removeItem('token');
        this.loginView.show();
    }

    // gere l'ajout d'un evenement avec en param la date cliquee
    handleAddEvent(dateStr) {
        this.editingEventId = null;
        this.modalView.openForAdd(dateStr);
    }

    // gere la modif d'un evenement
    handleEditEvent(event) {
        this.editingEventId = event.id;
        
        // prepare les data pour la modale
        const eventData = {
            title: event.title,
            start: this.formatDateTimeLocal(new Date(event.start)),
            end: event.end ? this.formatDateTimeLocal(new Date(event.end)) : '',
            description: event.extendedProps.description || '',
            color: event.backgroundColor || '#ffd700'
        };
        
        this.modalView.openForEdit(eventData);
    }

    // gere la sauvegarde d'un evenemnt (ajout ou modification)
    async handleSaveEvent() {
        // validation
        if (!this.modalView.isValid()) {
            this.modalView.showError('Le titre et la date de début sont obligatoires');
            return;
        }

        // recupere les datas du formulaire
        const formData = this.modalView.getFormData();

        if (this.editingEventId) {
            // modification
            this.calendarManager.updateEvent(this.editingEventId, {
                title: formData.title,
                start: formData.start,
                end: formData.end || formData.start,
                backgroundColor: formData.color,
                borderColor: formData.color,
                extendedProps: {
                    description: formData.description
                }
            });
            // persist update -> appelle l'API PUT /api/events/:id
            await this.updateEventOnServer({ id: this.editingEventId, title: formData.title, start: new Date(formData.start), end: formData.end ? new Date(formData.end) : new Date(formData.start), description: formData.description, color: formData.color });
        } 
        else {
            // ajoute
            const localId = Date.now().toString();
            this.calendarManager.addEvent({
                id: localId,
                title: formData.title,
                start: formData.start,
                end: formData.end || formData.start,
                backgroundColor: formData.color,
                borderColor: formData.color,
                extendedProps: {
                    description: formData.description
                }
            });

            // Persist creation au serveur via POST /api/events
            // On crée d'abord localement (pour une UX instantanée), puis on appelle
            // le backend. Le backend renvoie l'_id MongoDB ; on remplace alors
            // l'id local (timestamp) par l'id retourné pour garder la cohérence.
            const created = await this.createEventOnServer({ id: localId, title: formData.title, start: new Date(formData.start), end: formData.end ? new Date(formData.end) : new Date(formData.start), description: formData.description, color: formData.color });
            if (created && created.id) {
                const ev = this.calendarManager.getEventById(localId);
                if (ev) ev.setProp('id', created.id);
            }
        }

        this.modalView.close();
    }

    // Persist event create
    async createEventOnServer(eventData) {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const body = {
                title: eventData.title,
                start: eventData.start ? eventData.start.toISOString() : undefined,
                end: eventData.end ? eventData.end.toISOString() : undefined,
                description: eventData.description,
                color: eventData.color
            };
            const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error('create failed: ' + txt);
            }
            const created = await res.json();
            // update event with returned id and store agendaId in extendedProps
            return created;
        } catch (err) {
            console.error('Create event failed:', err);
            return null;
        }
    }

    // Persist event update
    async updateEventOnServer(eventData) {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const id = eventData.id;
            const body = {
                title: eventData.title,
                start: eventData.start ? eventData.start.toISOString() : undefined,
                end: eventData.end ? eventData.end.toISOString() : undefined,
                description: eventData.description,
                color: eventData.color
            };
            await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
        } catch (err) {
            console.error('Update event failed:', err);
        }
    }

    // Persist event delete
    async deleteEventOnServer(id) {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        } catch (err) {
            console.error('Delete event failed:', err);
        }
    }

    // gere la suppression d'un evenement
     
    handleDeleteEvent() {
        if (this.modalView.confirmDelete()) {
            this.calendarManager.removeEvent(this.editingEventId);
            // persist delete
            this.deleteEventOnServer(this.editingEventId);
            this.modalView.close();
        }
    }

    // formate une date pour les inputs datetime-local,  date / Date a formater, retourne un format ANNEES-MOIS-JOURS-Heurs-mins
     
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

// on demarre l'appli
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    // if token present, initialize calendar and load events so reload keeps events visible
    const token = localStorage.getItem('token');
    if (token) {
        app.calendarManager.init();
        app.setupCalendarCallbacks();
        app.loadEventsFromServer();
        // try to set the header username from token if possible
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            app.currentUser = payload.username;
            app.headerView.setUserName(app.currentUser);
            app.headerView.show();
            app.loginView.hide();
        } catch (e) {
            // ignore
        }
    }
});