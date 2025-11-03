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

    updateAgendaSelector(agendas, activeAgenda) {
        console.log("ici ça select");
        const header = document.getElementById('header');
        let select = document.getElementById('agendaSelect');

        if (!select) {
            const selectHTML = `
            <select id="agendaSelect" style="margin-left: 10px;">
                ${agendas.map(a => `<option value="${a.id}" ${a.id === activeAgenda?.id ? 'selected' : ''}>${a.name}</option>`).join('')}
            </select>
            `;
            header.insertAdjacentHTML('beforeend', selectHTML);
            select = document.getElementById('agendaSelect');
        } else {
            select.innerHTML = agendas.map(a => `<option value="${a.id}" ${a.id === activeAgenda?.id ? 'selected' : ''}>${a.name}</option>`).join('');
        }

        select.onchange = e => {
                    console.log("Changement select, valeur :", e.target.value);

            const selected = agendas.find(a => String(a.id) === e.target.value);
                    console.log("Agenda sélectionné :", selected);

            if (this.onAgendaChange) this.onAgendaChange(selected);
        };

    }

}