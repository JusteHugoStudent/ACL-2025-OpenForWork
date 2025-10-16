//Gere la page de connexion et inscription (card flip)

class LoginView {
    constructor() {
        // Element HTML de la page de connexion
        this.pageLogin = document.getElementById('page-login');
        this.btnLogin = document.getElementById('btn-login');
        this.btnRegister = document.getElementById('btn-register');
        
        // Champs de connexion (card-front)
        this.inputUsername = document.getElementById('username');
        this.inputPassword = document.getElementById('password');
        this.messageBox = document.getElementById('login-message');
        
        // Champs d'inscription (card-back)
        this.btnSignup = document.getElementById('btn-signup');
        this.inputSignupUsername = document.getElementById('signup-username');
        this.inputSignupPassword = document.getElementById('signup-password');
        this.signupMessageBox = document.getElementById('signup-message');
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
        if (this.inputUsername) this.inputUsername.value = '';
        if (this.inputPassword) this.inputPassword.value = '';
        if (this.inputSignupUsername) this.inputSignupUsername.value = '';
        if (this.inputSignupPassword) this.inputSignupPassword.value = '';
    }

    showMessage(msg, isError = false) {
        if (!this.messageBox) return;
        this.messageBox.textContent = msg;
        this.messageBox.style.color = isError ? 'crimson' : 'green';
    }

    showSignupMessage(msg, isError = false) {
        if (!this.signupMessageBox) return;
        this.signupMessageBox.textContent = msg;
        this.signupMessageBox.style.color = isError ? 'crimson' : '#95e1d3';
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