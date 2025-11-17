/**
 * ============================================
 * HEADERVIEW - GESTION DE L'EN-TÊTE
 * ============================================
 * 
 * Cette vue gère l'affichage et les interactions avec l'en-tête
 * de l'application (nom d'utilisateur, déconnexion, sélecteur d'agendas).
 * 
 * Responsabilités :
 * - Afficher le nom de l'utilisateur connecté
 * - Gérer le bouton de déconnexion
 * - Mettre à jour le sélecteur d'agendas
 * - Gérer le bouton de création d'agenda
 * - Afficher/masquer la page principale
 */

class HeaderView {
    constructor() {
        this.pageAgenda = document.getElementById('page-agenda');
        this.userName = document.getElementById('user-name');
        this.btnLogout = document.getElementById('btn-logout');
        this.newAgendaBtn = document.getElementById('newAgendaBtn');
        this.agendaSelect = document.getElementById('agendaSelect'); // récupère le select existant
    }

    /**
     * Définit le nom de l'utilisateur affiché dans l'en-tête
     * 
     * @param {string} name - Nom d'utilisateur à afficher
     */
    setUserName(name) {
        this.userName.textContent = 'Connecté : ' + name;
    }

    /**
     * Attache un callback au bouton de déconnexion
     * 
     * @param {Function} callback - Fonction appelée lors du clic sur "Déconnexion"
     */
    onLogoutClick(callback) {
        this.btnLogout.addEventListener('click', callback);
    }

    /**
     * Affiche la page principale de l'application (après connexion)
     */
    show() {
        this.pageAgenda.classList.remove('hidden');
    }

    /**
     * Cache la page principale de l'application (lors de la déconnexion)
     */
    hide() {
        this.pageAgenda.classList.add('hidden');
    }

    /**
     * Met à jour le sélecteur d'agendas avec la liste disponible
     * Sélectionne automatiquement l'agenda actif
     * 
     * @param {Array} agendas - Liste des agendas de l'utilisateur
     * @param {Object} activeAgenda - Agenda actuellement sélectionné
     */
    updateAgendaSelector(agendas, activeAgenda) {
        if (!this.agendaSelect) return; // sécurité

        // Met à jour les options
        this.agendaSelect.innerHTML = agendas.map(a => 
            `<option value="${a.id}" ${a.id === activeAgenda?.id ? 'selected' : ''}>${a.name}</option>`
        ).join('');

        // Gestion du changement
        this.agendaSelect.onchange = e => {
            const selected = agendas.find(a => String(a.id) === e.target.value);
            if (this.onAgendaChange) this.onAgendaChange(selected);
        };
    }

    /**
     * Attache un callback au bouton "Nouvel agenda"
     * 
     * @param {Function} callback - Fonction appelée lors du clic sur le bouton
     */
    onAddAgendaClick(callback) {
        this.newAgendaBtn.addEventListener('click', callback);
    }
}
