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
        if (!this.agendaSelect) return; // sécurité

        // Met à jour les options
        this.agendaSelect.innerHTML = agendas.map(a => 
         ii}
 .nd
;

    // Attache un callback au bouton "Nouvel agenda"
    // prend en paramettre un callback - Fonction appelée lors du clic sur le bonewAgendaBtn.addEventListener('click', callback);
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
