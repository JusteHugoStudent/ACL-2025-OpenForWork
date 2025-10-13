//Gere UNIQUEMENT la page de connexion

class LoginView {
    constructor() {
        // Element HTML de la page de connexion
        this.pageLogin = document.getElementById('page-login');
        this.btnLogin = document.getElementById('btn-login');
        this.btnRegister = document.getElementById('btn-register');
        this.inputUsername = document.getElementById('username');
        this.inputPassword = document.getElementById('password');
        this.messageBox = document.getElementById('login-message');
    }

    // Attache un callback au bouton de connexion

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

    onRegisterClick(callback) {
        if (!this.btnRegister) return;
        this.btnRegister.addEventListener('click', () => {
            const username = this.inputUsername.value;
            const password = this.inputPassword.value;
            callback(username, password);
        });
    }

    // Cache la page de connexion
    hide() {
        this.pageLogin.classList.add('hidden');
    }

    //Affiche la page de connexion
    show() {
        this.pageLogin.classList.remove('hidden');
    }

    // Vide les champs du formulaire
    clear() {
        this.inputUsername.value = '';
        this.inputPassword.value = '';
    }

    showMessage(msg, isError = false) {
        if (!this.messageBox) return;
        this.messageBox.textContent = msg;
        this.messageBox.style.color = isError ? 'crimson' : 'green';
    }

    // Recup le nom d'utilisateur
    getUsername() {
        return this.inputUsername.value;
    }

    // Recup le nom d'utilisateur
    getPassword() {
        return this.inputPassword.value;
    }
}