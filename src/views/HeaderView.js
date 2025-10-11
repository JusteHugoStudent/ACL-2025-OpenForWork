// Gerer l'en-tete de l'application (nom utilisateur, deconnexion)

class HeaderView {
    constructor() {
        // elements HTML de l'en-tete
        this.pageAgenda = document.getElementById('page-agenda');
        this.userName = document.getElementById('user-name');
        this.btnLogout = document.getElementById('btn-logout');
    }

    // Affiche le nom de l'utilisateur
    setUserName(name) {
        this.userName.textContent = 'Connecté : ' + name;
    }

    //Attache un callback au bouton de deconnecion
    onLogoutClick(callback) {
        this.btnLogout.addEventListener('click', callback);
    }

    // Affiche la page principale
    show() {
        this.pageAgenda.classList.remove('hidden');
    }

    //Cache la page principale
    hide() {
        this.pageAgenda.classList.add('hidden');
    }
}