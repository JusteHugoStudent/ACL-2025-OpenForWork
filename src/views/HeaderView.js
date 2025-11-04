// Gerer l'en-tete de l'application (nom utilisateur, deconnexion)
class HeaderView {
    constructor() {
        this.pageAgenda = document.getElementById('page-agenda');
        this.userName = document.getElementById('user-name');
        this.btnLogout = document.getElementById('btn-logout');
        this.newAgendaBtn = document.getElementById('newAgendaBtn');
        this.agendaSelect = document.getElementById('agendaSelect'); // récupère le select existant
    }

    setUserName(name) {
        this.userName.textContent = 'Connecté : ' + name;
    }

    onLogoutClick(callback) {
        this.btnLogout.addEventListener('click', callback);
    }

    show() {
        this.pageAgenda.classList.remove('hidden');
    }

    hide() {
        this.pageAgenda.classList.add('hidden');
    }

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

    // Permet d'attacher un callback au select d'agenda
    onAgendaChangeCallback(callback) {
        this.onAgendaChange = callback;
    }

    // bouton "nouvel agenda"
    onAddAgendaClick(callback) {
        this.newAgendaBtn.addEventListener('click', callback);
    }
}
