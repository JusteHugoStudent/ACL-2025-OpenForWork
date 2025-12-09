// Gestion de la page de connexion
// Cette vue gère l'affichage et les interactions avec la page
// de connexion/inscription (carte flip avec deux faces).
// Responsabilités :
// - Gérer les champs de formulaire (connexion et inscription)
// - Attacher les callbacks aux boutons
// - Afficher les messages de succès/erreur
// - Gérer l'affichage/masquage de la page

class LoginView {
    constructor() {
        // Élément HTML de la page de connexion
        this.pageLogin = document.getElementById('page-login');
        this.btnLogin = document.getElementById('btn-login');

        // Champs de connexion (card-front)
        this.inputUsername = document.getElementById('username');
        this.inputPassword = document.getElementById('password');
        this.messageBox = document.getElementById('login-message');

        // Champs d'inscription (card-back)
        this.btnSignup = document.getElementById('btn-signup');
        this.inputSignupUsername = document.getElementById('signup-username');
        this.inputSignupPassword = document.getElementById('signup-password');
        this.signupMessageBox = document.getElementById('signup-message');

        // Éléments pour les onglets
        this.authTabs = document.querySelectorAll('.auth-tab');
        this.cardWrapper = document.querySelector('.card-3d-wrapper');

        this.initTabs();
    }

    // Initialise les onglets de connexion/inscription
    initTabs() {
        const cardFront = document.querySelector('.card-front');
        const cardBack = document.querySelector('.card-back');
        const isMobile = window.innerWidth <= 768;

        this.authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Retirer la classe active de tous les onglets
                this.authTabs.forEach(t => t.classList.remove('active'));

                // Ajouter la classe active à l'onglet cliqué
                tab.classList.add('active');

                // Basculer la carte différemment selon mobile ou desktop
                if (isMobile || window.innerWidth <= 768) {
                    // Sur mobile : simple affichage/masquage
                    if (targetTab === 'signup') {
                        cardFront.style.display = 'none';
                        cardBack.style.display = 'block';
                    } else {
                        cardFront.style.display = 'block';
                        cardBack.style.display = 'none';
                    }
                } else {
                    // Sur desktop : effet 3D
                    if (targetTab === 'signup') {
                        this.cardWrapper.style.transform = 'rotateY(180deg)';
                    } else {
                        this.cardWrapper.style.transform = 'rotateY(0deg)';
                    }
                }
            });
        });
    }

    // Attache un callback au bouton de connexion
    // Gère aussi la validation par la touche Entrée
    // prend en paramettre un callback - Fonction appelée avec (username, password)

    onLoginClick(callback) {
        this.btnLogin.addEventListener('click', () => {
            const username = this.inputUsername.value;
            const password = this.inputPassword.value;
            callback(username, password);
        });

        // Permet de se connecter avec entree
        this.inputPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const username = this.inputUsername.value;
                const password = this.inputPassword.value;
                callback(username, password);
            }
        });
    }

    // Attache un callback au bouton d'inscription
    // Gère aussi la validation par la touche Entrée
    // prend en paramettre un callback - Fonction appelée avec (username, password)

    onSignupClick(callback) {
        if (!this.btnSignup) return;
        this.btnSignup.addEventListener('click', () => {
            const username = this.inputSignupUsername.value;
            const password = this.inputSignupPassword.value;
            callback(username, password);
        });

        // Permet de s'inscrire avec entree
        if (this.inputSignupPassword) {
            this.inputSignupPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const username = this.inputSignupUsername.value;
                    const password = this.inputSignupPassword.value;
                    callback(username, password);
                }
            });
        }
    }

    // Cache la page de connexion/inscription

    hide() {
        this.pageLogin.classList.add('hidden');
    }

    // Affiche la page de connexion/inscription

    show() {
        this.pageLogin.classList.remove('hidden');
    }

    // Vide tous les champs des formulaires de connexion et d'inscription

    clear() {
        if (this.inputUsername) this.inputUsername.value = '';
        if (this.inputPassword) this.inputPassword.value = '';
        if (this.inputSignupUsername) this.inputSignupUsername.value = '';
        if (this.inputSignupPassword) this.inputSignupPassword.value = '';
    }

    // Affiche un message dans la section connexion 
    // prend en paramettre msg - Message à afficher
    // prend en paramettre un bool isError - true pour un message d'erreur (rouge), false pour succès (vert)

    showMessage(msg, isError = false) {
        if (!this.messageBox) return;
        this.messageBox.textContent = msg;
        this.messageBox.style.color = isError ? 'crimson' : 'green';
    }

    // Affiche un message dans la section inscription 
    // prend en paramettre msg - Message à afficher
    // prend en paramettre un bool isError - true pour un message d'erreur (rouge), false pour succès (vert clair)

    showSignupMessage(msg, isError = false) {
        if (!this.signupMessageBox) return;
        this.signupMessageBox.textContent = msg;
        this.signupMessageBox.style.color = isError ? 'crimson' : '#95e1d3';
    }
}