class RegisterView {
    constructor() {
        // Références DOM
        this.inputUsername = document.getElementById('reg-username');
        this.inputPassword = document.getElementById('reg-password');
        this.btnSubmit = document.getElementById('btn-register-submit');
        this.messageBox = document.getElementById('register-message');
    }

    // Permet d'attacher un callback lorsque l'utilisateur soumet le formulaire
    onSubmit(callback) {
        this.btnSubmit.addEventListener('click', () => {
            const username = this.inputUsername.value;
            const password = this.inputPassword.value;
            callback(username, password);
        });

        // Permet aussi la soumission avec la touche Entrée
        this.inputPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const username = this.inputUsername.value;
                const password = this.inputPassword.value;
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
        this.inputUsername.value = '';
        this.inputPassword.value = '';
    }
}

// Wiring simple: gère la soumission et appelle l'API /api/register
document.addEventListener('DOMContentLoaded', () => {
    const view = new RegisterView();

    view.onSubmit((username, password) => {
        // Envoi POST JSON vers /api/register
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(r => r.json())
        .then(data => {
            if (data.error) {
                // Affiche l'erreur reçue du serveur (ex: username already exists)
                view.showMessage(data.error, true);
                return;
            }
            // Succès: message et reset du formulaire
            view.showMessage('Inscription réussie. Vous pouvez vous connecter.', false);
            view.clear();
        }).catch(err => {
            console.error(err);
            view.showMessage('Erreur réseau', true);
        });
    });
});