// GEstion de l'en-tête
// Cette vue gère l'affichage et les interactions avec l'en-tête
// de l'application (nom d'utilisateur, déconnexion, sélecteur d'agendas). 
// Responsabilités :
// - Afficher le nom de l'utilisateur connecté
// - Gérer le bouton de déconnexion
// - Mettre à jour le sélecteur d'agendas
// - Gérer le bouton de création d'agenda
// - Afficher/masquer la page principale


class HeaderView {
    constructor() {
        this.pageAgenda = document.getElementById('page-agenda');
        this.userName = document.getElementById('user-name');
        this.btnLogout = document.getElementById('btn-logout');
        this.newAgendaBtn = document.getElementById('newAgendaBtn');
        this.agendaSelect = document.getElementById('agendaSelect'); // récupère le select existant

        // nouveaux boutons Import / Export (crée si absent)
        this.importBtn = document.getElementById('btn-import');
        this.exportBtn = document.getElementById('btn-export');

        const container = (this.agendaSelect && this.agendaSelect.parentElement) || document.querySelector('header') || document.body;

        // input file caché pour l'import
        this.fileInput = document.getElementById('agendaImportInput') || document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json,application/json';
        this.fileInput.style.display = 'none';
        this.fileInput.id = 'agendaImportInput';
        if (!document.body.contains(this.fileInput)) document.body.appendChild(this.fileInput);

        // callback interne pour l'import (reçoit le File)
        this._importCallback = null;

        // wiring import button -> ouvre le sélecteur de fichier
        if (this.importBtn) {
            this.importBtn.addEventListener('click', () => this.fileInput.click());
        }

        // lecture du fichier et appel du callback
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
            if (file && this._importCallback) this._importCallback(file);
            // réinitialise l'input pour permettre de re-sélectionner le même fichier plus tard
            e.target.value = '';
        });
    }

    // Définit le nom de l'utilisateur affiché dans l'en-tête
    // prend en paramettre name - Nom d'utilisateur à afficher

    setUserName(name) {
        this.userName.textContent = 'Connecté : ' + name;
    }

    // Attache un callback au bouton de déconnexion
    // prend en paramettre callback - Fonction appelée lors du clic sur "Déconnexion"
     
    onLogoutClick(callback) {
        this.btnLogout.addEventListener('click', callback);
    }

    // Affiche la page principale de l'application (après connexion)
     
    show() {
        this.pageAgenda.classList.remove('hidden');
    }

    // Cache la page principale de l'application (lors de la déconnexion)
     
    hide() {
        this.pageAgenda.classList.add('hidden');
    }

    // Met à jour le sélecteur d'agendas avec la liste disponible
    // Sélectionne automatiquement l'agenda actif 
    // prend en paramettre agendas - Liste des agendas de l'utilisateur
    // prend en paramettre activeAgenda - Agenda actuellement sélectionné
    
    updateAgendaSelector(agendas, activeAgenda) {
        if (!this.agendaSelect) return;

        // Met à jour les options avec couleur (exclut les jours fériés)
        this.agendaSelect.innerHTML = agendas
            .filter(a => a.name !== HOLIDAYS_AGENDA_NAME)
            .map(a => {
                const color = a.color || THEME_COLORS.DEFAULT_AGENDA;
                return `<option value="${a.id}" style="color: ${color};" ${a.id === activeAgenda?.id ? 'selected' : ''}>${a.name}</option>`;
            }).join('');

        // Applique la couleur au select lui-même
        if (activeAgenda) {
            const selectColor = activeAgenda.name === HOLIDAYS_AGENDA_NAME ? THEME_COLORS.JOURS_FERIES : (activeAgenda.color || THEME_COLORS.DEFAULT_AGENDA);
            this.agendaSelect.style.color = selectColor;
        }

        // Gère le changement d'agenda
        this.agendaSelect.onchange = (e) => {
            const selectedAgenda = agendas.find(a => a.id === e.target.value);
            if (selectedAgenda && this.onAgendaChange) {
                const selectColor = selectedAgenda.name === HOLIDAYS_AGENDA_NAME ? THEME_COLORS.JOURS_FERIES : (selectedAgenda.color || THEME_COLORS.DEFAULT_AGENDA);
                this.agendaSelect.style.color = selectColor;
                this.onAgendaChange(selectedAgenda);
            }
        };
    }

    // Attache un callback au bouton "Nouvel agenda"
    // prend en paramettre un callback - Fonction appelée lors du clic sur le bouton
    onAddAgendaClick(callback) {
        this.newAgendaBtn.addEventListener('click', callback);
    }

    // Attache un callback au bouton d'export
    // callback sans argument (ex: () => controller.exportCurrentAgendaToFile())
    onExportClick(callback) {
        if (!this.exportBtn) return;
        this.exportBtn.addEventListener('click', callback);
    }

    // Attache un callback au bouton d'import
    // callback reçoit le File sélectionné (ex: (file) => controller.importAgendaFromFile(file))
    onImportClick(callback) {
        this._importCallback = callback;
    }
}
