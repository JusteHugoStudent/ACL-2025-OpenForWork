// Gere la fenetre modale (ajouter/modifier événement/ le pop up)

class ModalView {
    constructor() {
        // HTML de la modale
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modal-title');
        
        // Champs du formulaire
        this.inputTitle = document.getElementById('input-title');
        this.inputStart = document.getElementById('input-start');
        this.inputEnd = document.getElementById('input-end');
        this.inputDescription = document.getElementById('input-description');
        this.inputColor = document.getElementById('input-color');
        
        // Boutons
        this.btnSave = document.getElementById('btn-save');
        this.btnDelete = document.getElementById('btn-delete');
        this.btnCancel = document.getElementById('btn-cancel');
        
        // Initialiser l'event de fermeture en cliquant à l'extérieur
        this.initCloseOnClickOutside();
    }

    // Permet de fermer la modal en cliquant à l'extérieur
    initCloseOnClickOutside() {
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    // Ouvre la modal en mode AJOUT
    openForAdd(dateStr = '') {
        this.modalTitle.textContent = 'Ajouter un événement';
        this.btnDelete.classList.add('hidden');
        
        // Vider les champs
        this.inputTitle.value = '';
        this.inputDescription.value = '';
        this.inputColor.value = '📅';
        
        // Preremplir les dates si fourni
        if (dateStr) {
            this.inputStart.value = dateStr + 'T09:00';
            this.inputEnd.value = dateStr + 'T10:00';
        } 
        else {
            this.inputStart.value = '';
            this.inputEnd.value = '';
        }
        
        this.modal.classList.remove('hidden');
    }

    // eventDAta : Data de l'evenement a modifier
    openForEdit(eventData) {
        this.modalTitle.textContent = 'Modifier l\'événement';
        this.btnDelete.classList.remove('hidden');
        
        // Remplir les champs
        this.inputTitle.value = eventData.title;
        this.inputStart.value = eventData.start;
        this.inputEnd.value = eventData.end;
        this.inputDescription.value = eventData.description || '';
        this.inputColor.value = eventData.emoji || '📅';
        
        this.modal.classList.remove('hidden');
    }

    // Ferme la modale
    close() {
        this.modal.classList.add('hidden');
    }

    // Récupère les données du formulaire
    getFormData() {
        return {
            title: this.inputTitle.value.trim(),
            start: this.inputStart.value,
            end: this.inputEnd.value,
            description: this.inputDescription.value,
            emoji: this.inputColor.value
        };
    }

    // Vérifie si le formulaire est valide
    isValid() {
        const data = this.getFormData();
        return data.title !== '' && data.start !== '';
    }

    // Affiche un message d'erreur
    showError(message) {
        alert(message);
    }

    // Demande une confirmation de suppression
    confirmDelete() {
        return confirm('Voulez-vous vraiment supprimer cet événement ?');
    }

    // Attache un callback au bouton Enregistrer
    onSaveClick(callback) {
        this.btnSave.addEventListener('click', callback);
    }

    // Attache un callback au bouton Supprimer
    onDeleteClick(callback) {
        this.btnDelete.addEventListener('click', callback);
    }

    // Attache un callback au bouton Annuler
    onCancelClick(callback) {
        this.btnCancel.addEventListener('click', callback);
    }
}