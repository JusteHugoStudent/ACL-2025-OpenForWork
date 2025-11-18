// Gestionnaire d'interface utilisateur
// Ce fichier contient toutes les méthodes d'initialisation des événements UI
// et la configuration des callbacks pour App.js.
// Responsabilités :
// - Initialisation des événements des boutons et formulaires
// - Configuration des callbacks du calendrier
// - Gestion du menu de superposition des agendas
// - Gestion du filtrage des événements


class AppUIManager {
    // Initialise le gestionnaire UI avec l'instance de l'app
    // prend en paramettre app - Instance de l'application principale
    
    constructor(app) {
        this.app = app;
    }

    // Initialise tous les gestionnaires d'événements (boutons, callbacks)
     
    initEvents() {
        this.initAuthEvents();
        this.initAgendaEvents();
        this.initCalendarEvents();
        this.initOverlayMenu();
        this.initFilterEvents();
        this.initGlobalEvents();
    }

    // Initialise les événements d'authentification
     
    initAuthEvents() {
        this.app.loginView.onLoginClick((username, password) => {
            this.app.handleLogin(username, password);
        });

        this.app.loginView.onSignupClick((username, password) => {
            this.app.handleSignup(username, password);
        });

        this.app.headerView.onLogoutClick(() => {
            this.app.handleLogout();
        });
        
        // Bouton pour vider le cache des notifications (debug)
        const btnClearCache = document.getElementById('btn-clear-notif-cache');
        if (btnClearCache) {
            btnClearCache.addEventListener('click', () => {
                this.app.notificationController.clearAll();
                this.app.notificationController.checkNotifications();
                alert('✅ Cache des notifications vidé et vérification forcée !');
            });
        }
    }

    // Initialise les événements de gestion des agendas
     
    initAgendaEvents() {
        this.app.headerView.onAgendaChange = (agenda) => {
            this.app.agendaController.switchAgenda(agenda);
            this.app.reloadAllEvents();
        };

        this.app.headerView.onAddAgendaClick(async () => {
            const name = prompt('Nom du nouvel agenda (max 15 caractères) :');
            if (!name) return;

            const created = await this.app.agendaController.createAgenda(name.trim());
            if (created) {
                this.app.reloadAllEvents();
            }
        });
    }

    // Initialise les événements du calendrier (modale)
     
    initCalendarEvents() {
        this.app.modalView.onSaveClick(() => {
            this.app.handleSaveEvent();
        });

        this.app.modalView.onDeleteClick(async () => {
            const deleted = await this.app.eventController.deleteEditingEvent();
            if (deleted) {
                this.app.reloadAllEvents();
            }
        });

        this.app.modalView.onCancelClick(() => {
            this.app.modalView.close();
        });
    }

    // Initialise le menu de superposition des agendas
     
    initOverlayMenu() {
        const overlayBtn = document.getElementById('agenda-overlay-btn');
        const overlayMenu = document.getElementById('agenda-overlay-menu');
        const clearAllBtn = document.getElementById('clear-all-overlay');

        if (overlayBtn && overlayMenu) {
            // Toggle du menu au clic
            overlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasHidden = overlayMenu.classList.contains('hidden');
                
                overlayMenu.classList.toggle('hidden');
                overlayBtn.classList.toggle('active');
                
                // Met à jour le menu quand on l'ouvre
                if (wasHidden) {
                    this.app.agendaController.updateOverlayMenu();
                }
            });

            // Ferme le menu si clic à l'extérieur
            document.addEventListener('click', (e) => {
                if (!overlayBtn.contains(e.target) && !overlayMenu.contains(e.target)) {
                    overlayMenu.classList.add('hidden');
                    overlayBtn.classList.remove('active');
                }
            });

            // Bouton "Tout décocher"
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    this.app.agendaController.selectedAgendas = [];
                    this.app.agendaController.updateOverlayMenu();
                    this.app.reloadAllEvents();
                });
            }
        }
    }

    // Initialise les événements du filtre
     
    initFilterEvents() {
        const btnFilter = document.getElementById('btn-filter');
        const btnClearFilter = document.getElementById('btn-clear-filter');
        
        if (btnFilter) {
            btnFilter.addEventListener('click', () => {
                this.app.handleFilterEvents();
            });
        }
        
        if (btnClearFilter) {
            btnClearFilter.addEventListener('click', () => {
                this.app.filterController.resetFilter();
            });
        }
        
        // Boutons emoji pour sélection multiple
        const emojiButtons = document.querySelectorAll('.emoji-btn');
        emojiButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.classList.toggle('selected');
            });
        });
    }

    // Initialise les événements globaux
     
    initGlobalEvents() {
        // Écoute les changements d'overlay
        document.addEventListener('agendaOverlayChanged', () => {
            this.app.reloadAllEvents();
        });
    }

    // Configure les callbacks du calendrier FullCalendar
     
    setupCalendarCallbacks() {
        // Clic sur une date : ouvre la modale de création
        this.app.calendarManager.setOnDateClick((dateStr) => {
            const currentAgenda = this.app.agendaController.getCurrentAgenda();
            if (!currentAgenda) {
                alert(ERROR_MESSAGES.AGENDA.MISSING_NAME);
                return;
            }

            this.app.eventController.setEditingEvent(null);
            
            // Remplit le sélecteur d'agendas
            this.app.modalView.populateAgendaSelector(
                this.app.agendaController.getAllAgendas(),
                currentAgenda.id
            );
            
            this.app.modalView.openForAdd(dateStr);
        });

        // Clic sur un événement : ouvre la modale d'édition
        this.app.calendarManager.setOnEventClick((event) => {
            const eventAgendaId = event.extendedProps.agendaId || this.app.agendaController.getCurrentAgenda()?.id;
            
            // Prépare les données pour la modale
            const eventData = {
                title: event.extendedProps.originalTitle || event.title.replace(/^.+?\s/, ''),
                start: formatDateTimeLocal(new Date(event.start)),
                end: event.end ? formatDateTimeLocal(new Date(event.end)) : '',
                description: event.extendedProps.description || '',
                emoji: event.extendedProps.emoji || '📅',
                agendaId: eventAgendaId
            };

            // Stocke l'ID complet (agendaId-eventId) pour le calendrier
            // mais extrait juste l'eventId pour l'API
            this.app.eventController.setEditingEvent(event.id);
            this.app.modalView.openForEdit(eventData, this.app.agendaController.getAllAgendas());
        });

        // Déplacement d'événement (drag & drop) et redimensionnement
        const handleEventChange = async (event) => {
            // Extrait l'eventId réel (format FullCalendar: "agendaId-eventId")
            const realEventId = event.id.includes('-') 
                ? event.id.split('-')[1] 
                : event.id;
            
            await this.app.eventController.updateEvent({
                id: realEventId,
                title: event.extendedProps.originalTitle || event.title,
                start: event.start,
                end: event.end,
                description: event.extendedProps.description,
                emoji: event.extendedProps.emoji,
                agendaId: event.extendedProps.agendaId
            });
        };

        // Assigne le callback pour drag & drop et resize
        this.app.calendarManager.onEventChangeCallback = handleEventChange;

        // Changement de vue ou de date
        this.app.calendarManager.onVisiblePeriodChange = () => {
            this.app.reloadAllEvents();
        };
    }
}
