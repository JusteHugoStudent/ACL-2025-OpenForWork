// views/RegisterView.js

class RegisterView {
    constructor() {
        // Références DOM
        this.inputUsername = document.getElementById('signup-username');
        this.inputPassword = document.getElementById('signup-password');
        this.btnSubmit = document.getElementById('btn-signup');
        this.messageBox = document.getElementById('signup-message');
    }

    // Attache le callback lors de la soumission
    onSubmit(callback) {
        if (!this.btnSubmit || !this.inputUsername || !this.inputPassword) {
            console.warn("RegisterView: éléments du formulaire manquants dans le DOM.");
            return;
        }

        // Clic sur le bouton
        this.btnSubmit.addEventListener('click', () => {
            const username = this.inputUsername.value.trim();
            const password = this.inputPassword.value.trim();

            if (!username || !password) {
                this.showMessage("Veuillez remplir tous les champs.", true);
                return;
            }

            callback(username, password);
        });

        // Appui sur Entrée dans le champ mot de passe
        this.inputPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const username = this.inputUsername.value.trim();
                const password = this.inputPassword.value.trim();

                if (!username || !password) {
                    this.showMessage("Veuillez remplir tous les champs.", true);
                    return;
                }

                callback(username, password);
            }
        });
    }

    // Affiche un message d'état (erreur ou succès)
    showMessage(msg, isError = false) {
        if (!this.messageBox) return;
        this.messageBox.textContent = msg;
        this.messageBox.style.color = isError ? 'crimson' : 'green';
    }

    // Vide le formulaire
    clear() {
        if (this.inputUsername) this.inputUsername.value = '';
        if (this.inputPassword) this.inputPassword.value = '';
    }
}

// Wiring simple : gère la soumission et appelle l'API /api/register
document.addEventListener('DOMContentLoaded', () => {
    const view = new RegisterView();

    view.onSubmit((username, password) => {
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                // Affiche l'erreur reçue du serveur (ex: username déjà pris)
                view.showMessage(data.error, true);
                return;
            }

            // Succès : message + reset
            view.showMessage('Inscription réussie ! Vous pouvez maintenant vous connecter.', false);
            view.clear();
        })
        .catch(err => {
            console.error(err);
            view.showMessage('Erreur réseau ou serveur injoignable.', true);
        });
    });
});
