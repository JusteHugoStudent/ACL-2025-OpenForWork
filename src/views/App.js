// Orchestrateur principal
// Ce fichier agit comme un coordinateur léger qui:
// - Initialise les services, contrôleurs et vues
// - Gère l'authentification et la navigation principale
// - Coordonne les interactions entre les différents contrôleurs
 
// La logique métier a été déplacée dans les contrôleurs spécialisés :
// - AgendaControllerFront : Gestion des agendas
// - EventControllerFront : Gestion des événements  
// - NotificationController : Système de notifications
// - FilterController : Filtrage et export des événements
// L'initialisation UI a été déplacée dans AppUIManager.js


class App {
    constructor() {
        // Services (Accès API)
        this.authService = new AuthService();
        this.agendaService = new AgendaService();
        this.eventService = new EventService();
        
        // Vues (Interface utilisateur) 
        this.loginView = new LoginView();
        this.headerView = new HeaderView();
        this.modalView = new ModalView();
        this.calendarManager = new CalendarManager();
        
        // Controleurs (Logique métier)
        this.agendaController = new AgendaControllerFront(this.agendaService, this.headerView);
        this.eventController = new EventControllerFront(this.eventService, this.calendarManager, this.modalView);
        this.notificationController = new NotificationController();
        this.filterController = new FilterController(this.eventController);
        
        // Gestionnaire UI 
        this.uiManager = new AppUIManager(this);
        
        // État de l'appli
        this.currentUser = null;
        this.isReloading = false; // Protection contre les rechargements multiples
        
        // Initialisation des evenements
        this.uiManager.initEvents();
    }

    // Initialise l'application après connexion réussie
    // Charge les agendas, initialise le calendrier et démarre les notifications
    
    async init() {
        // Charge tous les agendas de l'utilisateur
        await this.agendaController.loadAgendas();

        // Initialise le calendrier FullCalendar (une seule fois)
        if (!this.calendarManager.calendar) {
            await this.calendarManager.init();
            this.uiManager.setupCalendarCallbacks();
        }

        // Initialise la vue par défaut (premier agenda + jours fériés)
        await this.agendaController.initializeDefaultView();

        // Charge les événements visibles
        await this.reloadAllEvents();
        
        // Démarre le système de notifications (une seule fois)
        if (!this.notificationController.pollingInterval) {
            this.notificationController.startPolling();
        }
    }

// GESTIONNAIRES D'ÉVÉNEMENTS UI
   

// AUTHENTIFICATION
   

    // Gère la connexion d'un utilisateur
     
    async handleLogin(username, password) {
        // Validation avec validationUtils
        if (!isNotEmpty(username) || !isNotEmpty(password)) {
            this.loginView.showMessage(ERROR_MESSAGES.AUTH.MISSING_CREDENTIALS, true);
            return;
        }

        try {
            // Utilise AuthService pour se connecter
            const result = await this.authService.login(username, password);
            
            if (!result.success) {
                this.loginView.showMessage(result.error, true);
                return;
            }

            // Sauvegarde le token avec storageUtils
            saveToken(result.data.token);
            this.currentUser = result.data.username || username;
            
            // Met à jour l'interface
            this.headerView.setUserName(this.currentUser);
            this.loginView.hide();
            this.headerView.show();

            // Initialise l'application
            await this.init();
            
        } catch (err) {
            console.error(err);
            this.loginView.showMessage('Erreur réseau', true);
        }
    }

    // Gère l'inscription d'un nouvel utilisateur
     
    async handleSignup(username, password) {
        // Validation avec validationUtils
        if (!isNotEmpty(username) || !isNotEmpty(password)) {
            this.loginView.showSignupMessage(ERROR_MESSAGES.AUTH.MISSING_CREDENTIALS, true);
            return;
        }
        
        try {
            // Utilise AuthService pour s'inscrire
            const result = await this.authService.signup(username, password);
            
            if (!result.success) {
                this.loginView.showSignupMessage(result.error, true);
                return;
            }
            
            // Si l'inscription réussit
            this.loginView.showSignupMessage(result.message || 'Inscription réussie ! Vous pouvez maintenant vous connecter.', false);
            this.loginView.clear();
            
        } catch (err) {
            console.error(err);
            this.loginView.showSignupMessage('Erreur réseau', true);
        }
    }

    // Gère la déconnexion de l'utilisateur
     
    handleLogout() {
        this.currentUser = null;
        this.loginView.clear();
        this.calendarManager.destroy();
        this.headerView.hide();
        
        // Utilise storageUtils pour supprimer le token
        removeToken();
        this.loginView.show();
        
        // Arrête le système de notifications
        this.notificationController.stopPolling();
        
        // Note: On ne vide PAS le cache des notifications à la déconnexion
        // pour éviter de re-notifier les mêmes événements à la reconnexion
        // this.notificationController.clearAll();
        
        console.log('👋 Déconnexion');
    }

// Gestion des evenements

    // Sauvegarde un événement (création ou modification)
     
    async handleSaveEvent() {
        const eventData = this.modalView.getFormData();
        
        // Validation avec validationUtils
        const validation = validateEventData(eventData);
        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        const editingEventId = this.eventController.getEditingEventId();
        
        if (editingEventId) {
            // Mode Edition
            // Extrait l'eventId réel (format: "agendaId-eventId" ou "agendaId-eventId-occurrenceIndex")
            let realEventId;
            if (editingEventId.includes('-')) {
                const parts = editingEventId.split('-');
                // Si 3 parties (agendaId-eventId-occurrenceIndex), prendre la partie du milieu
                realEventId = parts.length === 3 ? parts[1] : parts[1];
            } else {
                realEventId = editingEventId;
            }
            
            const success = await this.eventController.updateEvent({
                id: realEventId,
                ...eventData
            });
            
            if (success) {
                // Recharge tous les événements pour éviter les doublons
                // (car l'événement peut avoir changé d'agenda)
                await this.reloadAllEvents();
                this.modalView.close();
            }
        } else {
            // Mode creation
            const created = await this.eventController.createEvent(eventData);
            
            if (created) {
                // Recharge tous les événements pour afficher le nouveau
                await this.reloadAllEvents();
                this.modalView.close();
            }
        }
    }

    // Filtre les événements selon les critères du formulaire
     
    async handleFilterEvents() {
        const startDateStr = document.getElementById('filter-start').value;
        const endDateStr = document.getElementById('filter-end').value;
        const keywords = document.getElementById('filter-keywords').value.trim();
        
        // Récupére les emojis sélectionnés
        const selectedEmojis = [];
        document.querySelectorAll('.emoji-btn.selected').forEach(btn => {
            selectedEmojis.push(btn.dataset.emoji);
        });

        const visibleAgendaIds = this.agendaController.getVisibleAgendaIds();
        const allAgendas = this.agendaController.getAllAgendas();

        await this.filterController.handleFilterSubmit(
            startDateStr,
            endDateStr,
            visibleAgendaIds,
            allAgendas,
            keywords,
            selectedEmojis
        );
    }

// Chargement des donnees

    // Recharge tous les événements des agendas visibles
     
    async reloadAllEvents() {
        // Protection contre les appels multiples simultanés
        if (this.isReloading) {
            console.log('⚠️ Rechargement déjà en cours, ignoré');
            return;
        }
        
        this.isReloading = true;
        
        try {
            console.log('🔄 Rechargement de tous les événements...');
            
            // Effacer tous les événements du calendrier
            this.calendarManager.removeAllEvents();
            
            console.log('✅ Calendrier vidé');

            // Récupérer les IDs des agendas visibles
            const visibleAgendaIds = this.agendaController.getVisibleAgendaIds();
            const allAgendas = this.agendaController.getAllAgendas();
            const currentAgendaId = this.agendaController.getCurrentAgenda()?.id;

            console.log('📋 Agendas visibles:', visibleAgendaIds);

            // Charger les événements de tous les agendas visibles
            await this.eventController.loadEventsFromMultipleAgendas(
                visibleAgendaIds,
                allAgendas,
                currentAgendaId
            );
            
            console.log('✅ Rechargement terminé');
        } finally {
            this.isReloading = false;
        }
    }
}

// Point d'entrée de l'application

// Démarrage de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', async() => {
    // Rend l'instance globale pour le debug
    window.app = new App();
    const token = getToken();
    
    if (token) {
        // L'utilisateur a déjà un token, essayer de le reconnecter automatiquement
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            app.currentUser = payload.username;
            app.headerView.setUserName(app.currentUser);
            app.headerView.show();
            app.loginView.hide();
            
            // Initialise l'application
            await app.init();
            
        } catch (err) {
            console.error('Token invalide:', err);
            removeToken();
            app.loginView.show();
        }
    } else {
        // Pas de token, affiche la page de connexion
        app.loginView.show();
    }
    
    //les commandes de debug
    console.log('═══════════════════════════════════════');
    console.log('🛠️ COMMANDES DE DEBUG DISPONIBLES:');
    console.log('═══════════════════════════════════════');
    console.log('app.notificationController.testNotification() - Tester une notification');
    console.log('app.notificationController.debugStatus() - Voir l\'état du système');
    console.log('app.notificationController.clearAll() - Vider le cache des notifications');
    console.log('app.notificationController.checkNotifications() - Forcer une vérification');
    console.log('═══════════════════════════════════════');
});
