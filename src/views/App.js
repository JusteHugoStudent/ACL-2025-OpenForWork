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
        this.selectedAgendas = []; // Liste simple des agendas à afficher

        // var d'etat
        this.currentUser = null;
        this.editingEventId = null; // ID de l'event en cours de modification
        
        // Système de notifications
        this.notificationInterval = null;
        this.notificationTimeout = null; // Pour le timeout de synchronisation
        this.notifiedEvents = new Set(); // Pour éviter les doublons
        this.loadNotifiedEvents(); // Charger l'historique des notifications
        
        // initialisation des gestionnaires d'événements (boutons, modale, header)
        this.initEvents();
    }

    async init() {
        await this.loadAgendas();

        // Initialiser le calendrier **une seule fois** de grace
        if (!this.calendarManager.calendar) {
            await this.calendarManager.init();
            this.setupCalendarCallbacks();
        }

        //if (this.agendas.length > 0) {
            this.currentAgenda = this.agendas[0];
            //Affichage mixé avec jours fériés par défaut
            const holidaysAgenda = this.agendas.find(a => a.name === 'Jours fériés');
            if (holidaysAgenda && !this.selectedAgendas.includes(holidaysAgenda.id)) {
                this.selectedAgendas.push(holidaysAgenda.id);
            }

            // Mettre à jour le menu overlay pour refléter la sélection
            this.updateOverlayMenu();

            // Charger les events pour la période visible
            await this.loadEventsFromOneAgenda(this.currentAgenda.id);
        //}
        
        // Démarrer le système de notifications
        this.startNotificationPolling();
    }

/* ========================================
    Gestionnaire événements
   ======================================== */

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
            
            // Supprimer l'ancien agenda principal des agendas sélectionnés s'il y était
            this.selectedAgendas = this.selectedAgendas.filter(id => id !== agenda.id);
            
            // Mettre à jour le menu de superposition pour empecher le nouvel agenda principal
            this.updateOverlayMenu();
            
            this.reloadAllEvents(); // Simple : recharger tous les événements
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

            //mets à jours l'overlay menu
            this.updateOverlayMenu();

            // Recharge les events (normalement vide)
            this.reloadAllEvents();
        });

        // Filtre d'événements
        const btnFilter = document.getElementById('btn-filter');
        const btnClearFilter = document.getElementById('btn-clear-filter');
        
        if (btnFilter) {
            btnFilter.addEventListener('click', () => {
                this.handleFilterEvents();
            });
        }
        
        if (btnClearFilter) {
            btnClearFilter.addEventListener('click', () => {
                this.handleClearFilter();
            });
        }
        
        // Gestion des boutons emoji pour la sélection multiple
        const emojiButtons = document.querySelectorAll('.emoji-btn');
        emojiButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.classList.toggle('selected');
            });
        });

        // Menu de superposition des agendas
        const overlayBtn = document.getElementById('agenda-overlay-btn');
        const overlayMenu = document.getElementById('agenda-overlay-menu');
        const clearAllBtn = document.getElementById('clear-all-overlay');

        if (overlayBtn && overlayMenu) {
            overlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = overlayMenu.classList.contains('hidden');
                overlayMenu.classList.toggle('hidden');                
                if (isHidden) {
                    overlayBtn.classList.add('active');
                } else {
                    overlayBtn.classList.remove('active');
                }
            });

            // Fermeture menu si clique à l'extérieur (pour mobile)
            document.addEventListener('click', (e) => {
                if (!overlayBtn.contains(e.target) && !overlayMenu.contains(e.target)) {
                    overlayMenu.classList.add('hidden');
                    overlayBtn.classList.remove('active');
                }
            });

            // Empêcher la fermeture quand on clique dans le menu
            overlayMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllOverlayAgendas();
            });
        }
    }

/* ========================================
    Gestionnaire des call-backs
   ======================================== */

    // Configuration des callbacks du calendrier
    setupCalendarCallbacks() {
        // clic sur un event // Modifier
        this.calendarManager.setOnEventClick((event) => {
            this.handleEditEvent(event);
        });
        // clic sur une date // Ajouter
        this.calendarManager.setOnDateClick((dateStr) => {
            this.handleAddEvent(dateStr);
        });
        // Modification permanente d'un élément
        this.calendarManager.onEventChange((ev) => {
            this.updateEventOnServer({ id: ev.id, title: ev.title, start: ev.start, end: ev.end, description: ev.extendedProps.description, color: ev.backgroundColor });
        });
        // Suppression permanente d'un élément
        this.calendarManager.onEventRemove((id) => {
            this.deleteEventOnServer(id);
        });
        //changement de periode visible dans l'agenda
        this.calendarManager.onVisiblePeriodChange = (start, end) => {
            if (this.currentAgenda) {
                this.reloadAllEvents(); // Simple : recharger tous les événements
            }
        };
    }

/* ========================================
    Gestionnaire des call-backs
   ======================================== */

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

            //Attend la fin de l'initialisation
            await this.init();

        } catch (err) {
            console.error(err);
            this.loginView.showMessage('Erreur réseau', true);
        }
    }

    // Gestion de l'inscription
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
    // gestion de la deconnexion
    handleLogout() {
        this.currentUser = null;
        this.loginView.clear();
        this.calendarManager.destroy();
        this.headerView.hide();
        localStorage.removeItem('token');
        this.loginView.show();
        
        // Arrêter le polling des notifications
        this.stopNotificationPolling();
        // Ne pas effacer this.notifiedEvents pour garder l'historique
    }

    // gestion de l'ajout d'un evenement avec en param la date cliquee
    handleAddEvent(dateStr) {
        this.editingEventId = null;
        this.modalView.populateAgendaSelector(this.agendas, this.currentAgenda.id);
        this.modalView.openForAdd(dateStr);
    }

    // gere la modif d'un evenement
    handleEditEvent(event) {
        this.editingEventId = event.id;
        
        // Déterminer l'agenda de l'événement
        const eventAgendaId = event.extendedProps.agendaId || this.currentAgenda.id;
        
        // prepare les data pour la modale
        const eventData = {
            title: event.extendedProps.originalTitle || event.title.replace(/^.+?\s/, ''),
            start: this.formatDateTimeLocal(new Date(event.start)),
            end: event.end ? this.formatDateTimeLocal(new Date(event.end)) : '',
            description: event.extendedProps.description || '',
            emoji: event.extendedProps.emoji || '📅',
            agendaId: eventAgendaId
        };
        
        this.modalView.populateAgendaSelector(this.agendas, eventAgendaId);
        this.modalView.openForEdit(eventData);
    }

    // gestion de la sauvegarde d'un evenemnt (ajout ou modification)
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
            const oldAgendaId = oldEvent.extendedProps.agendaId;
            
            const displayTitle = `${formData.emoji} ${formData.title}`;
            this.calendarManager.updateEvent(this.editingEventId, {
                title: displayTitle,
                start: formData.start,
                end: formData.end || formData.start,
                extendedProps: {
                    description: formData.description,
                    emoji: formData.emoji,
                    originalTitle: formData.title,
                    agendaId: formData.agendaId
                }
            });
            // Suppression permanente -> appelle l'API PUT /api/events/:id
            const success = await this.updateEventOnServer({ id: this.editingEventId, title: formData.title, start: new Date(formData.start), end: formData.end ? new Date(formData.end) : new Date(formData.start), description: formData.description, emoji: formData.emoji, agendaId: formData.agendaId });
            
            // Si échec, restaurer les anciennes valeurs
            if (!success) {
                this.calendarManager.updateEvent(this.editingEventId, oldData);
                return; // Ne pas fermer la modal
            }
            
            // Si l'agenda a changé, recharger les événements des deux agendas
            if (oldAgendaId !== formData.agendaId) {
                // Supprimer l'événement du calendrier (il sera rechargé depuis le bon agenda)
                const ev = this.calendarManager.getEventById(this.editingEventId);
                if (ev) ev.remove();
                
                // Recharger les événements de l'agenda actuel et des agendas superposés
                await this.loadEventsFromOneAgenda(this.currentAgenda.id);
                for (const agendaId of this.selectedAgendas) {
                    await this.loadEventsFromOneAgenda(agendaId);
                }
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

            // Permanent creation au serveur via POST /api/events
            // On crée d'abord localement (pour une UX instantanée), puis on appelle
            // le backend. Le backend renvoie l'_id MongoDB ; on remplace alors
            // l'id local (timestamp) par l'id retourné pour garder la cohérence.
            const created = await this.createEventOnServer({ id: localId, title: formData.title, start: new Date(formData.start), end: formData.end ? new Date(formData.end) : new Date(formData.start), description: formData.description, emoji: formData.emoji, agendaId: formData.agendaId });
            if (created && created.id) {
                const ev = this.calendarManager.getEventById(localId);
                if (ev) {
                    ev.setProp('id', created.id);
                    // Ajouter l'agendaId dans les extendedProps
                    ev.setExtendedProp('agendaId', formData.agendaId);
                }
                
                // Si l'événement est créé dans un agenda différent de l'agenda actuel
                // et que cet agenda n'est pas superposé, l'événement ne sera pas visible
                // On peut soit le supprimer du calendrier, soit basculer vers cet agenda
                if (formData.agendaId !== this.currentAgenda.id && !this.selectedAgendas.includes(formData.agendaId)) {
                    // Supprimer l'événement du calendrier (il n'est pas dans un agenda visible)
                    if (ev) ev.remove();
                }
            } else {
                // Si la création a échoué, supprimer l'événement local
                const ev = this.calendarManager.getEventById(localId);
                if (ev) ev.remove();
            }
        }

        this.modalView.close();
    }

    // Création d'événement permanent
    async createEventOnServer(eventData) {
        const token = localStorage.getItem('token');
        if (!token) return;
        if (!eventData.agendaId) {
            console.error("Aucun agenda sélectionné pour l'ajout de l'événement !");
            return;
        }

        try {
            const body = {
                title: eventData.title,
                start: eventData.start ? eventData.start.toISOString() : undefined,
                end: eventData.end ? eventData.end.toISOString() : undefined,
                description: eventData.description,
                emoji: eventData.emoji,
                agendaId: eventData.agendaId
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


    // Modification d'événement permanent
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

    // Suppression d'événement permanent
    async deleteEventOnServer(id) {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        } catch (err) {
            console.error('Delete event failed:', err);
        }
    }

    // gestion de la suppression d'un evenement
    handleDeleteEvent() {
        if (this.modalView.confirmDelete()) {
            this.calendarManager.removeEvent(this.editingEventId);
            // Suppression permanente
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

            // Update du header pour afficher le sélecteur
            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
            
            // Update du menu de superposition
            this.updateOverlayMenu();

        } catch (error) {
            console.error('Erreur lors du chargement des agendas :', error);
        }
    }

    // Création du menu simple avec les checkboxes
    updateOverlayMenu() {
        const overlayList = document.getElementById('agenda-overlay-list');
        if (!overlayList) return;

        overlayList.innerHTML = '';

        // Pour chaque agenda, créer une checkbox (SAUF l'agenda principal actuellement sélectionné)
        this.agendas.forEach(agenda => {
            // Exclure l'agenda actuellement sélectionné comme principal
            if (this.currentAgenda && agenda.id === this.currentAgenda.id) {
                return; // Skip cet agenda
            }

            const item = document.createElement('div');
            item.className = 'agenda-overlay-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.selectedAgendas.includes(agenda.id);
            if (checkbox.checked) {
                item.classList.add('selected');
            }
            
            // Selection / désélection
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    // Ajouter l'agenda à la liste
                    this.selectedAgendas.push(agenda.id);
                    item.classList.add('selected');
                } else {
                    // Retirer l'agenda de la liste
                    this.selectedAgendas = this.selectedAgendas.filter(id => id !== agenda.id);
                    item.classList.remove('selected');
                }
                this.reloadAllEvents(); // Recharger tous les événements
            });

            const label = document.createElement('label');
            label.textContent = agenda.name;
            label.style.cursor = 'pointer';
            label.addEventListener('click', () => checkbox.click());

            item.appendChild(checkbox);
            item.appendChild(label);
            overlayList.appendChild(item);
        });
    }

    // Tout décocher
    clearAllOverlayAgendas() {
        this.selectedAgendas = [];
        this.updateOverlayMenu();
        this.reloadAllEvents();
    }

    // Recharge TOUS les événements (agenda principal + sélectionnés)
    async reloadAllEvents() {
        // Vider COMPLÈTEMENT le calendrier (y compris les jours fériés)
        this.calendarManager.removeAllEvents(false);

        // Liste de tous les agendas à afficher (agenda courant + sélectionnés)
        const agendasToShow = [...this.selectedAgendas];
        if (this.currentAgenda) {
            agendasToShow.push(this.currentAgenda.id);
        }

        // Charger les événements de chaque agenda
        for (const agendaId of agendasToShow) {
            await this.loadEventsFromOneAgenda(agendaId);
        }
    }

    // Charge les événements d'UN agenda avec filtrage rapide
    async loadEventsFromOneAgenda(agendaId) {
        const token = localStorage.getItem('token');
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
            
            // Optimisation (chargement seulement la période visible + 1 mois)
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
            const agenda = this.agendas.find(a => a.id === agendaId);
            const agendaName = agenda ? agenda.name : 'Agenda';
            
            const isHolidaysAgenda = agendaName === 'Jours fériés';
            const isMainAgenda = this.currentAgenda && agendaId === this.currentAgenda.id;
            
            let backgroundColor;
            if (isHolidaysAgenda) {
                backgroundColor = '#e74c3c'; // Rouge pour les jours fériés
            } else if (isMainAgenda) {
                backgroundColor = '#3498db'; // Bleu pour l'agenda principal
            } else {
                backgroundColor = 'rgba(102, 126, 234, 0.6)'; // Bleu translucide pour les autres
            }

            // Ajouter chaque événement au calendrier
            events.forEach(ev => {
                const emoji = ev.emoji || '📅';
                // Exception spéciale : les jours fériés n'ont pas de particules
                let title;
                if (isMainAgenda || isHolidaysAgenda) {
                    title = `${emoji} ${ev.title}`;
                } else {
                    title = `${emoji} ${ev.title} [${agendaName}]`;
                }
                
                // Configuration spéciale pour les jours fériés : ROUGE !
                const eventConfig = {
                    id: `${agendaId}-${ev.id}`,
                    title: title,
                    start: ev.start,
                    backgroundColor: backgroundColor,
                    extendedProps: {
                        description: ev.description,
                        emoji: emoji,
                        originalTitle: ev.title
                    }
                };

                if (ev.end) {
                    eventConfig.end = ev.end;
                }

                if (isHolidaysAgenda) {
                    eventConfig.backgroundColor = '#dc3545'; // Rouge vif
                    eventConfig.textColor = '#ffffff'; // Texte blanc
                    eventConfig.classNames = ['holiday-event']; // Classe CSS personnalisée
                }
                
                this.calendarManager.addEvent(eventConfig, { silent: true });
            });
        } catch (err) {
            console.error('Erreur chargement agenda:', err);
        }
    }

    // Filtre les événements selon les critères
    async handleFilterEvents() {
        const filterKeywords = document.getElementById('filter-keywords').value.trim().toLowerCase();
        const filterStart = document.getElementById('filter-start').value;
        const filterEnd = document.getElementById('filter-end').value;
        
        // Récupérer les emojis sélectionnés
        const selectedEmojiButtons = document.querySelectorAll('.emoji-btn.selected');
        const filterEmojis = Array.from(selectedEmojiButtons).map(btn => btn.dataset.emoji);

        // Les dates de début et de fin sont obligatoires
        if (!filterStart || !filterEnd) {
            alert('Veuillez sélectionner une date de début et une date de fin');
            return;
        }

        const startDate = new Date(filterStart);
        const endDate = new Date(filterEnd);

        // Validation des dates
        if (startDate > endDate) {
            alert('La date de début doit être antérieure à la date de fin');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            //Détermine tous les agendas visibles (en cas de superposition)
            const agendasToCheck = [...this.selectedAgendas];
            if (this.currentAgenda) {
                agendasToCheck.push(this.currentAgenda.id);
            }

            let allEvents = [];

            //Charger les événements pour chacun
            for (const agendaId of agendasToCheck) {
                const res = await fetch(`/api/events?agendaId=${agendaId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) continue;

                const events = await res.json();
                const agenda = this.agendas.find(a => a.id === agendaId);
                const agendaName = agenda ? agenda.name : 'Agenda';
                
                // Ajouter une référence à l’agenda pour l’affichage
                events.forEach(ev => ev._agendaName = agendaName);

                allEvents = allEvents.concat(events);
            }

            //Filtre tous les événements selon les critères
            const filteredEvents = allEvents.filter(ev => {
                const eventStart = new Date(ev.start);
                const eventEmoji = ev.emoji || '📅';
                const eventTitle = (ev.title || '').toLowerCase();
                const eventDescription = (ev.extendedProps?.description || '').toLowerCase();
                
                // Filtre par mots-clés (titre ou description)
                let matchKeywords = true;
                if (filterKeywords) {
                    matchKeywords = eventTitle.includes(filterKeywords) || eventDescription.includes(filterKeywords);
                }
                
                // Filtre par période (les dates sont obligatoires)
                const inPeriod = eventStart >= startDate && eventStart <= endDate;
                
                // Filtre par emoji (plusieurs possibles)
                const matchEmoji = filterEmojis.length === 0 || filterEmojis.includes(eventEmoji);

                return matchKeywords && inPeriod && matchEmoji;
            });

            //Afficher le résultat
            this.displayFilterResults(filteredEvents);

        } catch (err) {
            console.error('Erreur lors du filtrage:', err);
            alert('Erreur lors du filtrage des événements');
        }
    }


    // Affiche les résultats du filtre
    displayFilterResults(events) {
        const resultsDiv = document.getElementById('filter-results');
        const resultsList = document.getElementById('filter-results-list');

        if (events.length === 0) {
            resultsList.innerHTML = '<li>❌ Aucun événement trouvé pour ces critères</li>';
        } else {
            resultsList.innerHTML = events.map(ev => {
                const emoji = ev.emoji || '📅';
                const startDate = new Date(ev.start).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const endDate = ev.end ? new Date(ev.end).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '';
                const description = ev.extendedProps?.description || ev.description || '';
                const agendaName = ev._agendaName ? ` (${ev._agendaName})` : '';

                return `
                    <li>
                        <strong>${emoji} ${ev.title}${agendaName}</strong>
                        <small>📅 ${startDate}</small>
                        ${endDate ? `<small>🕒 ${endDate}</small>` : ''}
                        ${description ? `<small>📝 ${description}</small>` : ''}
                    </li>
                `;
            }).join('');
        }

        resultsDiv.style.display = 'block';
    }


    // Réinitialise le filtre
    handleClearFilter() {
        document.getElementById('filter-keywords').value = '';
        document.getElementById('filter-start').value = '';
        document.getElementById('filter-end').value = '';
        
        // Désélectionner tous les boutons emoji
        document.querySelectorAll('.emoji-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const resultsDiv = document.getElementById('filter-results');
        resultsDiv.style.display = 'none';
        document.getElementById('filter-results-list').innerHTML = '';
    }

/* ========================================
    Système de notifications
   ======================================== */

    // Démarre le polling pour vérifier les événements à venir
    startNotificationPolling() {
        // Vérifier immédiatement à la connexion
        this.checkUpcomingEvents();
        
        // Calculer le délai jusqu'à la prochaine minute pile (secondes = 0)
        const now = new Date();
        const secondsUntilNextMinute = 60 - now.getSeconds();
        const msUntilNextMinute = secondsUntilNextMinute * 1000 - now.getMilliseconds();
        
        // Attendre jusqu'à la prochaine minute pile, puis vérifier toutes les minutes
        this.notificationTimeout = setTimeout(() => {
            this.checkUpcomingEvents();
            
            // Maintenant on est synchronisé, vérifier toutes les 60 secondes exactement
            this.notificationInterval = setInterval(() => {
                this.checkUpcomingEvents();
            }, 60 * 1000);
        }, msUntilNextMinute);
    }

    // Arrête le polling (lors de la déconnexion)
    stopNotificationPolling() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
        }
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }
    }

    // Vérifie les événements à venir et envoie des notifications
    async checkUpcomingEvents() {
        const token = localStorage.getItem('token');
        if (!token || !this.currentAgenda) return;

        try {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Récupérer tous les événements de tous les agendas visibles
            const agendasToCheck = [this.currentAgenda.id, ...this.selectedAgendas];
            let allEvents = [];

            for (const agendaId of agendasToCheck) {
                const res = await fetch(`/api/events?agendaId=${agendaId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const events = await res.json();
                    allEvents = allEvents.concat(events);
                }
            }

            // Vérifier chaque événement
            allEvents.forEach(event => {
                const eventStart = new Date(event.start);
                const timeDiff = eventStart - now;

                // Ne notifier que pour les événements futurs dans les prochaines 24h
                if (timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000) {
                    // Vérifier les différents seuils de notification
                    this.checkNotificationThreshold(event, timeDiff);
                }
            });

        } catch (err) {
            console.error('Erreur lors de la vérification des événements:', err);
        }
    }

    // Vérifie si une notification doit être envoyée pour un événement
    checkNotificationThreshold(event, timeDiff) {
        const eventId = event._id || event.id;
        const thresholds = [
            { time: 24 * 60 * 60 * 1000, label: '24 heures', key: '24h' },
            { time: 12 * 60 * 60 * 1000, label: '12 heures', key: '12h' },
            { time: 6 * 60 * 60 * 1000, label: '6 heures', key: '6h' },
            { time: 1 * 60 * 60 * 1000, label: '1 heure', key: '1h' }
        ];

        thresholds.forEach(threshold => {
            const notificationKey = `${eventId}-${threshold.key}`;
            
            // Si on n'a pas encore notifié pour ce seuil et qu'on est dans la fenêtre
            // (entre le seuil et 5 minutes avant le seuil pour éviter de rater)
            if (!this.notifiedEvents.has(notificationKey) && 
                timeDiff <= threshold.time && 
                timeDiff > (threshold.time - 5 * 60 * 1000)) {
                
                this.showNotification(event, threshold.label);
                this.notifiedEvents.add(notificationKey);
                this.saveNotifiedEvents(); // Sauvegarder dans localStorage
            }
        });
    }

    // Affiche une notification
    showNotification(event, timeLabel) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = 'notification';
        
        const emoji = event.emoji || '📅';
        const eventDate = new Date(event.start);
        const formattedDate = eventDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        notification.innerHTML = `
            <div class="notification-icon">${emoji}</div>
            <div class="notification-content">
                <div class="notification-title">Rappel : ${event.title}</div>
                <div class="notification-time">Dans ${timeLabel}</div>
                <div class="notification-date">${formattedDate} à ${formattedTime}</div>
            </div>
            <button class="notification-close">✕</button>
        `;

        // Ajouter l'événement de fermeture
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('notification-exit');
            setTimeout(() => notification.remove(), 300);
        });

        // Ajouter la notification au conteneur
        container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => notification.classList.add('notification-show'), 10);

        // Auto-fermeture après 10 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('notification-exit');
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
    }

    // Charge l'historique des notifications depuis localStorage
    loadNotifiedEvents() {
        try {
            const stored = localStorage.getItem('notifiedEvents');
            if (stored) {
                const data = JSON.parse(stored);
                const now = new Date().getTime();
                
                // Ne garder que les notifications des 7 derniers jours
                // (après 7 jours, on peut re-notifier pour un événement récurrent)
                const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
                
                data.forEach(item => {
                    // item format: { key: "eventId-24h", timestamp: 1234567890 }
                    if (item.timestamp > sevenDaysAgo) {
                        this.notifiedEvents.add(item.key);
                    }
                });
                
                // Sauvegarder la version nettoyée
                this.saveNotifiedEvents();
            }
        } catch (err) {
            console.error('Erreur lors du chargement des notifications:', err);
        }
    }

    // Sauvegarde l'historique des notifications dans localStorage
    saveNotifiedEvents() {
        try {
            const now = new Date().getTime();
            const data = Array.from(this.notifiedEvents).map(key => ({
                key: key,
                timestamp: now
            }));
            localStorage.setItem('notifiedEvents', JSON.stringify(data));
        } catch (err) {
            console.error('Erreur lors de la sauvegarde des notifications:', err);
        }
    }
}

// Démarrage de l'appli
document.addEventListener('DOMContentLoaded', async() => {
    const app = new App();
    const token = localStorage.getItem('token');
    if (token) {
        // essayer de définir le nom d'utilisateur de l'en-tête à partir du token si possible
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


