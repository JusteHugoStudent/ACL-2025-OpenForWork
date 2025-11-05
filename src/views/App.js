// Controleur principal a fusionner avec le controlleur par la suite

class App {
    constructor() {
        // creer toute les vue
        this.loginView = new LoginView();
        this.headerView = new HeaderView();
        this.modalView = new ModalView();
        this.calendarManager = new CalendarManager();
        
        //Gestion plusieurs agenda
        this.agendas = [];
        this.currentAgenda = null;

        // var d'etat
        this.currentUser = null;
        this.editingEventId = null; // ID de l'event en cours de modification
        
        // initialisation des gestionnaires d'événements (boutons, modale, header)
        this.initEvents();
    }

    async init() {
        await this.loadAgendas();//charge les agendas dans this.agendas et mets à jour le select

        if (this.agendas.length > 0) {//par default on affiche le premier agenda
            this.currentAgenda = this.agendas[0];
            await this.loadEventsFromServer(this.currentAgenda.id);
        }
    }

    // Initialise tous les events (callbacks)
    initEvents() {
        // Connexion
        this.loginView.onLoginClick((username, password) => {
            this.handleLogin(username, password);
        });

        // Inscription via la card-back (flip)
        this.loginView.onSignupClick((username, password) => {
            this.handleSignup(username, password);
        });

        // Deconnexion
        this.headerView.onLogoutClick(() => {
            this.handleLogout();
        });
        
        // Changement d'agenda
        this.headerView.onAgendaChange = (agenda) => {
            this.currentAgenda = agenda;
            this.loadEventsFromServer(agenda.id);
        };


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

        this.headerView.onAddAgendaClick(async () => {
            let name = prompt('Nom du nouvel agenda (max 15 caractères) :');
            if (!name) return;

            name = name.trim(); // supprime espaces/tabulations au début et à la fin

            if (name.length === 0) {
                alert("Le nom de l'agenda ne peut pas être vide !");
                return;
            }

            if (name.length > 15) {
                alert("Le nom de l'agenda ne peut pas dépasser 15 caractères !");
                return;
            }

            const token = localStorage.getItem('token');
            const res = await fetch('/api/agendas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });

            if (!res.ok) {
                console.error('Erreur création agenda');
                return;
            }

            const created = await res.json();

            // Recharge les agendas depuis le serveur
            await this.loadAgendas();

            // Définit le nouvel agenda comme courant
            this.currentAgenda = created;

            // Affiche le bon agenda dans le select
            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);

            // Recharge les events (normalement vide)
            this.loadEventsFromServer(this.currentAgenda.id);
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
    async handleLogin(username, password) {
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.error) {
                this.loginView.showMessage(data.error, true);
                return;
            }

            localStorage.setItem('token', data.token);
            this.currentUser = data.username || username || 'Utilisateur';
            this.headerView.setUserName(this.currentUser);
            this.loginView.hide();
            this.headerView.show();

            this.setupCalendarCallbacks();

            //Attend la fin de l'initialisation
            await this.init();

        } catch (err) {
            console.error(err);
            this.loginView.showMessage('Erreur réseau', true);
        }
    }


    // Handle registration (from register.html page)
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

    // Handle signup (from card-back flip)
    handleSignup(username, password) {
        if (!username || !password) {
            this.loginView.showSignupMessage('Nom d\'utilisateur et mot de passe requis', true);
            return;
        }
        
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(r => r.json())
        .then(data => {
            if (data.error) {
                this.loginView.showSignupMessage(data.error, true);
                return;
            }
            // Si l'inscription réussit, on affiche un message et on vide le formulaire
            this.loginView.showSignupMessage('Inscription réussie ! Vous pouvez maintenant vous connecter.', false);
            this.loginView.clear();
        }).catch(err => {
            console.error(err);
            this.loginView.showSignupMessage('Erreur réseau', true);
        });
    }

    // charge les events depuis le backend et les ajoute au calendrier
    async loadEventsFromServer(agendaId = null) {
        // Vide le calendrier avant d'afficher le nouvel agenda        
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const url = agendaId ? `/api/events?agendaId=${agendaId}` : '/api/events';
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const events = await res.json();
            // d'abord vider le calendrier
            this.calendarManager.destroy();
            await this.calendarManager.init();
            events.forEach(ev => {
                // add silently to avoid re-posting to server
                const emoji = ev.emoji || '📅';
                const displayTitle = `${emoji} ${ev.title}`;
                // Lors du chargement initial, on ajoute les événements en mode "silent"
                // pour éviter que la logique d'ajout local -> serveur ne renvoie un double POST.
                this.calendarManager.addEvent({ id: ev.id, title: displayTitle, start: ev.start, end: ev.end, extendedProps: { description: ev.extendedProps ? ev.extendedProps.description : ev.description, emoji: emoji, originalTitle: ev.title } }, { silent: true });
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
            title: event.extendedProps.originalTitle || event.title.replace(/^.+?\s/, ''),
            start: this.formatDateTimeLocal(new Date(event.start)),
            end: event.end ? this.formatDateTimeLocal(new Date(event.end)) : '',
            description: event.extendedProps.description || '',
            emoji: event.extendedProps.emoji || '📅'
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
            const oldEvent = this.calendarManager.getEventById(this.editingEventId);
            const oldData = {
                title: oldEvent.title,
                start: oldEvent.start,
                end: oldEvent.end,
                extendedProps: oldEvent.extendedProps
            };
            
            const displayTitle = `${formData.emoji} ${formData.title}`;
            this.calendarManager.updateEvent(this.editingEventId, {
                title: displayTitle,
                start: formData.start,
                end: formData.end || formData.start,
                extendedProps: {
                    description: formData.description,
                    emoji: formData.emoji,
                    originalTitle: formData.title
                }
            });
            
            // persist update -> appelle l'API PUT /api/events/:id
            const success = await this.updateEventOnServer({ id: this.editingEventId, title: formData.title, start: new Date(formData.start), end: formData.end ? new Date(formData.end) : new Date(formData.start), description: formData.description, emoji: formData.emoji });
            
            // Si échec, restaurer les anciennes valeurs
            if (!success) {
                this.calendarManager.updateEvent(this.editingEventId, oldData);
                return; // Ne pas fermer la modal
            }
        } 
        else {
            // ajoute
            const localId = Date.now().toString();
            const displayTitle = `${formData.emoji} ${formData.title}`;
            this.calendarManager.addEvent({
                id: localId,
                title: displayTitle,
                start: formData.start,
                end: formData.end || formData.start,
                extendedProps: {
                    description: formData.description,
                    emoji: formData.emoji,
                    originalTitle: formData.title
                }
            });

            // Persist creation au serveur via POST /api/events
            // On crée d'abord localement (pour une UX instantanée), puis on appelle
            // le backend. Le backend renvoie l'_id MongoDB ; on remplace alors
            // l'id local (timestamp) par l'id retourné pour garder la cohérence.
            const created = await this.createEventOnServer({ id: localId, title: formData.title, start: new Date(formData.start), end: formData.end ? new Date(formData.end) : new Date(formData.start), description: formData.description, emoji: formData.emoji });
            if (created && created.id) {
                const ev = this.calendarManager.getEventById(localId);
                if (ev) ev.setProp('id', created.id);
            } else {
                // Si la création a échoué, supprimer l'événement local
                const ev = this.calendarManager.getEventById(localId);
                if (ev) ev.remove();
            }
        }

        this.modalView.close();
    }

    // Persist event create
    async createEventOnServer(eventData) {
        const token = localStorage.getItem('token');
        if (!token) return;
        if (!this.currentAgenda) {
            console.error("Aucun agenda actif pour l'ajout de l'événement !");
            return;
        }

        try {
            const body = {
                title: eventData.title,
                start: eventData.start ? eventData.start.toISOString() : undefined,
                end: eventData.end ? eventData.end.toISOString() : undefined,
                description: eventData.description,
                emoji: eventData.emoji,
                agendaId: this.currentAgenda.id
            };

            const res = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'create failed');
            }

            const created = await res.json();
            return created;
        } catch (err) {
            console.error('Create event failed:', err);
            alert('Erreur : ' + err.message);
            return null;
        }
    }


    // Persist event update
    async updateEventOnServer(eventData) {
        const token = localStorage.getItem('token');
        if (!token) return false;
        try {
            const id = eventData.id;
            const body = {
                title: eventData.title,
                start: eventData.start ? eventData.start.toISOString() : undefined,
                end: eventData.end ? eventData.end.toISOString() : undefined,
                description: eventData.description,
                emoji: eventData.emoji
            };
            const res = await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'update failed');
            }
            return true;
        } catch (err) {
            console.error('Update event failed:', err);
            alert('Erreur : ' + err.message);
            return false;
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

    // Récupère tous les agendas du user
    async loadAgendas() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/agendas', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erreur de chargement des agendas');
            this.agendas = await res.json();

            // Mise à jour du header pour afficher le sélecteur
            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);

        } catch (error) {
            console.error('Erreur lors du chargement des agendas :', error);
        }
    }
    



}

// on demarre l'appli
document.addEventListener('DOMContentLoaded', async() => {
    const app = new App();
    // if token present, initialize calendar and load events so reload keeps events visible
    const token = localStorage.getItem('token');
    if (token) {
        // try to set the header username from token if possible
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            app.currentUser = payload.username;
            app.headerView.setUserName(app.currentUser);
            app.headerView.show();
            app.loginView.hide();
            
            //Initialise les agendas et charge le premier par défaut
            await app.init();
        } catch (e) {
            // ignore
        }
    }
});


