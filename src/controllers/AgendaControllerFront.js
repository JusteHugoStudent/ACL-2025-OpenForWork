/**
 * AgendaControllerFront.js
 * Contrôleur frontend responsable de la gestion des agendas
 * Gère le chargement, la création, la sélection et la superposition des agendas
 */

class AgendaControllerFront {
    /**
     * Constructeur du contrôleur d'agendas
     * @param {AgendaService} agendaService - Service pour les appels API agendas
     * @param {HeaderView} headerView - Vue de l'en-tête pour afficher le sélecteur
     */
    constructor(agendaService, headerView) {
        this.agendaService = agendaService;
        this.headerView = headerView;
        
        // État des agendas
        this.agendas = [];
        this.currentAgenda = null;
        this.selectedAgendas = []; // IDs des agendas en superposition
    }

    /**
     * Récupère tous les agendas de l'utilisateur depuis le serveur
     * Met à jour l'affichage du sélecteur d'agendas
     * @returns {Promise<Array>} La liste des agendas
     */
    async loadAgendas() {
        const token = getToken();
        if (!token) return [];

        try {
            // Utiliser AgendaService pour récupérer les agendas
            const agendas = await this.agendaService.fetchAll();
            this.agendas = agendas;

            // Mettre à jour le header pour afficher le sélecteur
            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
            
            // Mettre à jour le menu de superposition
            this.updateOverlayMenu();

            return this.agendas;
        } catch (error) {
            console.error('Erreur lors du chargement des agendas :', error);
            return [];
        }
    }

    /**
     * Crée un nouvel agenda avec validation
     * @param {string} name - Nom de l'agenda à créer
     * @returns {Promise<Object|null>} L'agenda créé ou null en cas d'erreur
     */
    async createAgenda(name) {
        // Validation avec validationUtils
        if (!isNotEmpty(name)) {
            alert(ERROR_MESSAGES.AGENDA.MISSING_NAME);
            return null;
        }

        if (name.length > 15) {
            alert("Le nom de l'agenda ne peut pas dépasser 15 caractères !");
            return null;
        }

        try {
            // Créer l'agenda via le service (passer juste le nom, pas un objet)
            const created = await this.agendaService.create(name);

            // Recharger tous les agendas
            await this.loadAgendas();

            // Définir le nouvel agenda comme courant
            this.currentAgenda = created;

            // Mettre à jour l'affichage
            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
            this.updateOverlayMenu();

            return created;
        } catch (error) {
            console.error('Erreur création agenda:', error);
            alert(ERROR_MESSAGES.AGENDA.CREATE_FAILED);
            return null;
        }
    }

    /**
     * Change l'agenda principal actuellement affiché
     * @param {Object} agenda - Le nouvel agenda à afficher
     */
    switchAgenda(agenda) {
        // Retirer l'ancien agenda principal des agendas sélectionnés s'il y était
        if (this.currentAgenda) {
            this.selectedAgendas = this.selectedAgendas.filter(id => id !== this.currentAgenda.id);
        }
        
        // Définir le nouvel agenda principal
        this.currentAgenda = agenda;
        
        // Retirer le nouvel agenda des sélections si présent
        this.selectedAgendas = this.selectedAgendas.filter(id => id !== agenda.id);
        
        // Mettre à jour le menu overlay
        this.updateOverlayMenu();
    }

    /**
     * Toggle la superposition d'un agenda (checkbox dans le menu overlay)
     * @param {string} agendaId - ID de l'agenda à ajouter/retirer de la superposition
     * @returns {boolean} true si l'agenda est maintenant visible, false sinon
     */
    toggleAgendaOverlay(agendaId) {
        const index = this.selectedAgendas.indexOf(agendaId);
        
        if (index > -1) {
            // L'agenda est déjà sélectionné, le retirer
            this.selectedAgendas.splice(index, 1);
            return false;
        } else {
            // Ajouter l'agenda à la sélection
            this.selectedAgendas.push(agendaId);
            return true;
        }
    }

    /**
     * Met à jour le menu de superposition des agendas (checkboxes)
     * Affiche tous les agendas sauf l'agenda principal
     */
    updateOverlayMenu() {
        const overlayList = document.getElementById('agenda-overlay-list');
        if (!overlayList) {
            console.error('❌ Element #agenda-overlay-list non trouvé');
            return;
        }

        // Vider la liste
        overlayList.innerHTML = '';

        // Filtrer pour exclure l'agenda principal
        const otherAgendas = this.agendas.filter(a => 
            !this.currentAgenda || a.id !== this.currentAgenda.id
        );

        if (otherAgendas.length === 0) {
            overlayList.innerHTML = '<li style="padding: 10px; color: #666;">Aucun autre agenda</li>';
            return;
        }

        // Créer une checkbox pour chaque agenda
        otherAgendas.forEach(agenda => {
            
            const li = document.createElement('div');
            li.className = 'agenda-overlay-item';
            if (this.selectedAgendas.includes(agenda.id)) {
                li.classList.add('selected');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `overlay-${agenda.id}`;
            checkbox.checked = this.selectedAgendas.includes(agenda.id);
            
            // Callback au changement de la checkbox
            checkbox.addEventListener('change', (e) => {
                const isChecked = this.toggleAgendaOverlay(agenda.id);
                e.target.checked = isChecked;
                
                // Mettre à jour la classe selected
                if (isChecked) {
                    li.classList.add('selected');
                } else {
                    li.classList.remove('selected');
                }
                
                // Déclencher l'événement pour notifier App.js de recharger les événements
                const event = new CustomEvent('agendaOverlayChanged', {
                    detail: { agendaId: agenda.id, isVisible: isChecked }
                });
                document.dispatchEvent(event);
            });

            const label = document.createElement('label');
            label.htmlFor = `overlay-${agenda.id}`;
            label.textContent = agenda.name;

            li.appendChild(checkbox);
            li.appendChild(label);
            overlayList.appendChild(li);
        });
    }

    /**
     * Initialise l'affichage par défaut avec le premier agenda et les jours fériés
     * @returns {Promise<void>}
     */
    async initializeDefaultView() {
        if (this.agendas.length === 0) {
            console.warn('Aucun agenda disponible');
            return;
        }

        // Sélectionner le premier agenda comme agenda principal
        this.currentAgenda = this.agendas[0];

        // Ajouter automatiquement les jours fériés en superposition
        const holidaysAgenda = this.agendas.find(a => a.name === HOLIDAYS_AGENDA_NAME);
        if (holidaysAgenda && !this.selectedAgendas.includes(holidaysAgenda.id)) {
            this.selectedAgendas.push(holidaysAgenda.id);
        }

        // Mettre à jour l'affichage
        this.updateOverlayMenu();
    }

    /**
     * Obtient la liste de tous les agendas visibles (principal + superposés)
     * @returns {Array<string>} Liste des IDs d'agendas visibles
     */
    getVisibleAgendaIds() {
        const visibleIds = [...this.selectedAgendas];
        if (this.currentAgenda) {
            visibleIds.push(this.currentAgenda.id);
        }
        
        // Éliminer les doublons
        return [...new Set(visibleIds)];
    }

    /**
     * Trouve un agenda par son ID
     * @param {string} agendaId - ID de l'agenda recherché
     * @returns {Object|null} L'agenda trouvé ou null
     */
    getAgendaById(agendaId) {
        return this.agendas.find(a => a.id === agendaId) || null;
    }

    /**
     * Obtient l'agenda principal actuel
     * @returns {Object|null} L'agenda courant
     */
    getCurrentAgenda() {
        return this.currentAgenda;
    }

    /**
     * Obtient tous les agendas chargés
     * @returns {Array} Liste de tous les agendas
     */
    getAllAgendas() {
        return this.agendas;
    }
}
