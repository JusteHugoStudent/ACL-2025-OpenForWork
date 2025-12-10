// Contrôleur de base pour la gestion des agendas
// Gère le CRUD et la sélection des agendas
// Les fonctionnalités d'import/export sont dans AgendaImportExport.js
// La superposition est dans AgendaOverlay.js

class AgendaController {
    /**
     * Constructeur du contrôleur d'agendas
     * @param {AgendaService} agendaService - Service API pour les agendas
     * @param {HeaderView} headerView - Vue de l'en-tête
     * @param {EventControllerFront} eventController - Contrôleur des événements (pour import)
     */
    constructor(agendaService, headerView, eventController = null) {
        this.agendaService = agendaService;
        this.headerView = headerView;
        this.eventController = eventController;

        // État des agendas
        this.agendas = [];
        this.currentAgenda = null;
        this.selectedAgendas = []; // IDs des agendas en superposition
    }

    /**
     * Récupère tous les agendas de l'utilisateur depuis le serveur
     * @returns {Promise<Array>} Liste des agendas
     */
    async loadAgendas() {
        const token = getToken();
        if (!token) return [];

        try {
            const agendas = await this.agendaService.fetchAll();
            this.agendas = agendas;

            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
            this.updateOverlayMenu();

            return this.agendas;
        } catch (error) {
            console.error('Erreur lors du chargement des agendas :', error);
            return [];
        }
    }

    /**
     * Crée un nouvel agenda avec validation
     * @param {string} name - Nom de l'agenda
     * @param {string} color - Couleur hex de l'agenda
     * @param {Object} options - { setCurrent: true } pour définir comme agenda courant
     * @returns {Promise<Object|null>} L'agenda créé ou null
     */
    async createAgenda(name, color = THEME_COLORS.DEFAULT_AGENDA, { setCurrent = true } = {}) {
        if (!isNotEmpty(name)) {
            Toast.warning(ERROR_MESSAGES.AGENDA.MISSING_NAME);
            return null;
        }

        if (name.length > 15) {
            Toast.warning("Le nom de l'agenda ne peut pas dépasser 15 caractères !");
            return null;
        }

        try {
            const created = await this.agendaService.create(name, color);
            await this.loadAgendas();

            if (setCurrent) {
                const newAgenda = this.agendas.find(a => a.id === created.id);
                if (newAgenda) {
                    this.currentAgenda = newAgenda;
                    this.selectedAgendas = this.selectedAgendas.filter(id => id !== newAgenda.id);
                    this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
                    this.updateOverlayMenu();
                }
            }

            return created;
        } catch (error) {
            console.error('Erreur création agenda:', error);
            Toast.error(ERROR_MESSAGES.AGENDA.CREATE_FAILED);
            return null;
        }
    }

    /**
     * Change l'agenda principal actuellement affiché
     * @param {Object} agenda - Nouvel agenda à afficher
     */
    switchAgenda(agenda) {
        if (this.currentAgenda) {
            this.selectedAgendas = this.selectedAgendas.filter(id => id !== this.currentAgenda.id);
        }

        this.currentAgenda = agenda;
        this.selectedAgendas = this.selectedAgendas.filter(id => id !== agenda.id);

        this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
        this.updateOverlayMenu();
    }

    /**
     * Initialise l'affichage par défaut avec le premier agenda et les jours fériés
     */
    async initializeDefaultView() {
        if (this.agendas.length === 0) {
            console.warn('Aucun agenda disponible');
            return;
        }

        this.currentAgenda = this.agendas[0];

        const holidaysAgenda = this.agendas.find(a => a.name === HOLIDAYS_AGENDA_NAME);
        if (holidaysAgenda && !this.selectedAgendas.includes(holidaysAgenda.id)) {
            this.selectedAgendas.push(holidaysAgenda.id);
        }

        // Met à jour le sélecteur pour refléter l'agenda courant
        this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);

        this.updateOverlayMenu();
    }

    /**
     * Obtient la liste de tous les agendas visibles (principal + superposés)
     * @returns {string[]} IDs d'agendas visibles
     */
    getVisibleAgendaIds() {
        const visibleIds = [...this.selectedAgendas];
        if (this.currentAgenda) {
            visibleIds.push(this.currentAgenda.id);
        }
        return [...new Set(visibleIds)];
    }

    /**
     * Trouve un agenda par son ID
     * @param {string} agendaId - ID de l'agenda
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

    /**
     * Modifie un agenda existant
     * @param {string} agendaId - ID de l'agenda à modifier
     * @param {string} name - Nouveau nom
     * @param {string} color - Nouvelle couleur
     * @returns {Promise<Object|null>} L'agenda modifié ou null
     */
    async updateAgenda(agendaId, name, color) {
        if (!isNotEmpty(name)) {
            Toast.warning(ERROR_MESSAGES.AGENDA.MISSING_NAME);
            return null;
        }

        if (name.length > 15) {
            Toast.warning("Le nom de l'agenda ne peut pas dépasser 15 caractères !");
            return null;
        }

        try {
            const updated = await this.agendaService.update(agendaId, name, color);
            await this.loadAgendas();

            if (this.currentAgenda && this.currentAgenda.id === agendaId) {
                this.currentAgenda = this.agendas.find(a => a.id === agendaId);
                this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
            }

            const event = new CustomEvent('agendaUpdated', {
                detail: { agendaId, name, color }
            });
            document.dispatchEvent(event);

            return updated;
        } catch (error) {
            console.error('Erreur modification agenda:', error);
            Toast.error('Impossible de modifier l\'agenda.');
            return null;
        }
    }

    /**
     * Supprime un agenda
     * @param {string} agendaId - ID de l'agenda à supprimer
     * @returns {Promise<boolean>} true si succès
     */
    async deleteAgenda(agendaId) {
        if (this.agendas.length <= 2) {
            Toast.warning('Impossible de supprimer le dernier agenda.', 'Vous devez avoir au moins un agenda actif.');
            return false;
        }

        const agenda = this.agendas.find(a => a.id === agendaId);
        if (!agenda) {
            Toast.error('Agenda introuvable.');
            return false;
        }

        const confirmed = confirm(`Voulez-vous vraiment supprimer l'agenda "${agenda.name}" ?\n\nTous les événements associés seront également supprimés.`);
        if (!confirmed) return false;

        try {
            await this.agendaService.delete(agendaId);
            await this.loadAgendas();

            if (this.currentAgenda && this.currentAgenda.id === agendaId) {
                if (this.agendas.length > 0) {
                    const nextAgenda = this.agendas.find(a => a.name !== HOLIDAYS_AGENDA_NAME) || this.agendas[0];
                    this.switchAgenda(nextAgenda);
                } else {
                    this.currentAgenda = null;
                }
            }

            this.selectedAgendas = this.selectedAgendas.filter(id => id !== agendaId);

            const event = new CustomEvent('agendaDeleted', {
                detail: { agendaId }
            });
            document.dispatchEvent(event);

            return true;
        } catch (error) {
            console.error('Erreur suppression agenda:', error);
            Toast.error('Impossible de supprimer l\'agenda.');
            return false;
        }
    }

    // ========================================
    // MÉTHODES D'OVERLAY (déléguées à AgendaOverlay mixin)
    // ========================================

    /**
     * Toggle la superposition d'un agenda
     * @param {string} agendaId - ID de l'agenda
     * @returns {boolean} true si maintenant visible
     */
    toggleAgendaOverlay(agendaId) {
        const index = this.selectedAgendas.indexOf(agendaId);

        if (index > -1) {
            this.selectedAgendas.splice(index, 1);
            return false;
        } else {
            this.selectedAgendas.push(agendaId);
            return true;
        }
    }

    /**
     * Met à jour le menu de superposition des agendas
     */
    updateOverlayMenu() {
        const overlayList = document.getElementById('agenda-overlay-list');
        if (!overlayList) {
            console.error('❌ Element #agenda-overlay-list non trouvé');
            return;
        }

        overlayList.innerHTML = '';

        const otherAgendas = this.agendas.filter(a =>
            !this.currentAgenda || a.id !== this.currentAgenda.id
        );

        if (otherAgendas.length === 0) {
            overlayList.innerHTML = '<li style="padding: 10px; color: #666;">Aucun autre agenda</li>';
            return;
        }

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

            checkbox.addEventListener('change', (e) => {
                const isChecked = this.toggleAgendaOverlay(agenda.id);
                e.target.checked = isChecked;

                if (isChecked) {
                    li.classList.add('selected');
                } else {
                    li.classList.remove('selected');
                }

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
}
