/**
 * ============================================
 * APP.JS - ORCHESTRATEUR PRINCIPAL
 * ============================================
 * 
 * Ce fichier agit comme un coordinateur léger qui:
 * - Initialise les services, contrôleurs et vues
 * - Gère l'authentification et la navigation principale
 * - Coordonne les interactions entre les différents contrôleurs
 * 
 * La logique métier a été déplacée dans les contrôleurs spécialisés :
 * - AgendaControllerFront : Gestion des agendas
 * - EventControllerFront : Gestion des événements  
 * - NotificationController : Système de notifications
 * - FilterController : Filtrage et export des événements
 * 
 * L'initialisation UI a été déplacée dans AppUIManager.js
 * (anciennement ~508 lignes → maintenant ~250 lignes)
 */

class App {
    constructor() {
        // ===== 1. SERVICES (Accès API) =====
        this.authService = new AuthService();
        this.agendaService = new AgendaService();
        this.eventService = new EventService();
        
        // ===== 2. VUES (Interface utilisateur) =====
        this.loginView = new LoginView();
        this.headerView = new HeaderView();
        this.modalView = new ModalView();
        this.calendarManager = new CalendarManager();
        
        // ===== 3. CONTRÔLEURS (Logique métier) =====
        this.agendaController = new AgendaControllerFront(this.agendaService, this.headerView);
        this.eventController = new EventControllerFront(this.eventService, this.calendarManager, this.modalView);
        this.notificationController = new NotificationController();
        this.filterController = new FilterController(this.eventController);
        
        // ===== 4. GESTIONNAIRE UI =====
        this.uiManager = new AppUIManager(this);
        
        // ===== 5. ÉTAT DE L'APPLICATION =====
        this.currentUser = null;
        this.isReloading = false; // Protection contre les rechargements multiples
        
        // ===== 6. INITIALISATION DES ÉVÉNEMENTS =====
        this.uiManager.initEvents();
    }

    /**
     * Initialise l'application après connexion réussie
     * Charge les agendas, initialise le calendrier et démarre les notifications
     */
    async init() {
        // Charger tous les agendas de l'utilisateur
        await this.agendaController.loadAgendas();

        // Initialiser le calendrier FullCalendar (une seule fois)
        if (!this.calendarManager.calendar) {
            await this.calendarManager.init();
            this.uiManager.setupCalendarCallbacks();
        }

        // Initialiser la vue par défaut (premier agenda + jours fériés)
        await this.agendaController.initializeDefaultView();

        // Charger les événements visibles
        await this.reloadAllEvents();
        
        // Démarrer le système de notifications (une seule fois)
        if (!this.notificationController.pollingInterval) {
            this.notificationController.startPolling();
        }
    }

/* ========================================
    GESTIONNAIRES D'ÉVÉNEMENTS UI
   ======================================== */

/* ========================================
    AUTHENTIFICATION
   ======================================== */

    /**
     * Gère la connexion d'un utilisateur
     */
    async handleLogin(username, password) {
        // Validation avec validationUtils
        if (!isNotEmpty(username) || !isNotEmpty(password)) {
            this.loginView.showMessage(ERROR_MESSAGES.AUTH.MISSING_CREDENTIALS, true);
            return;
        }

        try {
            // Utiliser AuthService pour se connecter
            const result = await this.authService.login(username, password);
            
            if (!result.success) {
                this.loginView.showMessage(result.error, true);
                return;
            }

            // Sauvegarder le token avec storageUtils
            saveToken(result.data.token);
            this.currentUser = result.data.username || username;
            
            // Mettre à jour l'interface
            this.headerView.setUserName(this.currentUser);
            this.loginView.hide();
            this.headerView.show();

            // Initialiser l'application
            await this.init();
            
        } catch (err) {
            console.error(err);
            this.loginView.showMessage('Erreur réseau', true);
        }
    }

    /**
     * Gère l'inscription d'un nouvel utilisateur
     */
    async handleSignup(username, password) {
        // Validation avec validationUtils
        if (!isNotEmpty(username) || !isNotEmpty(password)) {
            this.loginView.showSignupMessage(ERROR_MESSAGES.AUTH.MISSING_CREDENTIALS, true);
            return;
        }
        
        try {
            // Utiliser AuthService pour s'inscrire
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

    /**
     * Gère la déconnexion de l'utilisateur
     */
    handleLogout() {
        this.currentUser = null;
        this.loginView.clear();
        this.calendarManager.destroy();
        this.headerView.hide();
        
        // Utiliser storageUtils pour supprimer le token
        removeToken();
        this.loginView.show();
        
        // Arrêter le système de notifications
        this.notificationController.stopPolling();
        this.notificationController.clearAll(); // Vider le cache des notifications
        
        console.log('👋 Déconnexion : cache des notifications vidé');
    }

/* ========================================
    GESTION DES ÉVÉNEMENTS
   ======================================== */

    /**
     * Sauvegarde un événement (création ou modification)
     */
    async handleSaveEvent() {
        const eventData = this.modalView.getFormData();
        
        // Validation avec validationUtils
        const validation = validateEventData(eventData);
        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        const editingEventId = this.eventController.getEditingEventId();
        
        console.log('🔍 EditingEventId brut:', editingEventId);
        
        if (editingEventId) {
            // MODE ÉDITION
            // Extraire l'eventId réel (format: "agendaId-eventId")
            const realEventId = editingEventId.includes('-') 
                ? editingEventId.split('-')[1] 
                : editingEventId;
            
            console.log('🔍 RealEventId extrait:', realEventId);
            console.log('🔍 EventData à envoyer:', { id: realEventId, ...eventData });
            
            const success = await this.eventController.updateEvent({
                id: realEventId,
                ...eventData
            });
            
            if (success) {
                // Recharger tous les événements pour éviter les doublons
                // (car l'événement peut avoir changé d'agenda)
                await this.reloadAllEvents();
                this.modalView.close();
            }
        } else {
            // MODE CRÉATION
            const created = await this.eventController.createEvent(eventData);
            
            if (created) {
                // Recharger tous les événements pour afficher le nouveau
                await this.reloadAllEvents();
                this.modalView.close();
            }
        }
    }

    /**
     * Filtre les événements selon les critères du formulaire
     */
    async handleFilterEvents() {
        const startDateStr = document.getElementById('filter-start').value;
        const endDateStr = document.getElementById('filter-end').value;
        const keywords = document.getElementById('filter-keywords').value.trim();
        
        // Récupérer les emojis sélectionnés
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

/* ========================================
    CHARGEMENT DES DONNÉES
   ======================================== */

    /**
     * Recharge tous les événements des agendas visibles
     */
    async reloadAllEvents() {
        // Protection contre les appels multiples simultanés
        if (this.isReloading) {
            return;
        }
        
        this.isReloading = true;
        
        try {
            // Effacer tous les événements du calendrier
            this.calendarManager.removeAllEvents();

            // Récupérer les IDs des agendas visibles
            const visibleAgendaIds = this.agendaController.getVisibleAgendaIds();
            const allAgendas = this.agendaController.getAllAgendas();
            const currentAgendaId = this.agendaController.getCurrentAgenda()?.id;

            // Charger les événements de tous les agendas visibles
            await this.eventController.loadEventsFromMultipleAgendas(
                visibleAgendaIds,
                allAgendas,
                currentAgendaId
            );
        } finally {
            this.isReloading = false;
        }
    }
}

/* ========================================
    POINT D'ENTRÉE DE L'APPLICATION
   ======================================== */

// Démarrage de l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', async() => {
    // Rendre l'instance globale pour le debug
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
            
            // Initialiser l'application
            await app.init();
            
        } catch (err) {
            console.error('Token invalide:', err);
            removeToken();
            app.loginView.show();
        }
    } else {
        // Pas de token, afficher la page de connexion
        app.loginView.show();
    }
    
    // Afficher les commandes de debug disponibles
    console.log('═══════════════════════════════════════');
    console.log('🛠️ COMMANDES DE DEBUG DISPONIBLES:');
    console.log('═══════════════════════════════════════');
    console.log('app.notificationController.testNotification() - Tester une notification');
    console.log('app.notificationController.debugStatus() - Voir l\'état du système');
    console.log('app.notificationController.clearAll() - Vider le cache des notifications');
    console.log('app.notificationController.checkNotifications() - Forcer une vérification');
    console.log('═══════════════════════════════════════');
});
