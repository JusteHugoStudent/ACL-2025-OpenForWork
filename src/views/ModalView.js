// Gestion du Modale
// Cette vue gère la fenêtre modale popup pour créer ou modifier
// un événement dans le calendrier. 
// Responsabilités :
// - Afficher/masquer la modale
// - Gérer les champs du formulaire d'événement
// - Valider les données saisies
// - Gérer les modes création/édition
// - Afficher les messages d'erreur


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
        this.inputAgenda = document.getElementById('input-agenda');
        this.inputColor = document.getElementById('input-color');
        
        // Boutons
        this.btnSave = document.getElementById('btn-save');
        this.btnDelete = document.getElementById('btn-delete');
        this.btnCancel = document.getElementById('btn-cancel');
        
        // Initialise l'événement de fermeture en cliquant à l'extérieur
        this.initCloseOnClickOutside();
    }

    // Permet de fermer la modale en cliquant à l'extérieur (sur le fond sombre)
    // Améliore l'expérience utilisateur
     
    initCloseOnClickOutside() {
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    // Ouvre la modale en mode AJOUT d'un nouvel événement
    // Réinitialise tous les champs et cache le bouton Supprimer 
    // prend en paramettre dateStr - Date au format YYYY-MM-DD (optionnel) pour pré-remplir les dates
    
    openForAdd(dateStr = '') {
        this.modalTitle.textContent = 'Ajouter un événement';
        this.btnDelete.classList.add('hidden');
        
        // Vide les champs
        this.inputTitle.value = '';
        this.inputDescription.value = '';
        this.inputColor.value = '📅';
        
        // Preremplit les dates si fourni
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

    // Ouvre la modale en mode ÉDITION d'un événement existant
    // Remplit les champs avec les données de l'événement et affiche le bouton Supprimer 
    // prend en paramettre eventData - Données de l'événement à modifier
    // prend en paramettre agendas - Liste des agendas disponibles pour le sélecteur
    
    openForEdit(eventData, agendas = []) {
        this.modalTitle.textContent = 'Modifier l\'événement';
        this.btnDelete.classList.remove('hidden');
        
        // Remplit les champs
        this.inputTitle.value = eventData.title;
        this.inputStart.value = eventData.start;
        this.inputEnd.value = eventData.end;
        this.inputDescription.value = eventData.description || '';
        this.inputColor.value = eventData.emoji || '📅';
        
        // Remplit le sélecteur d'agendas si fourni
        if (agendas.length > 0) {
            this.populateAgendaSelector(agendas, eventData.agendaId);
        }
        
        this.modal.classList.remove('hidden');
    }

    // Ferme la fenêtre modale
     
    close() {
        this.modal.classList.add('hidden');
    }

    // Récupère toutes les données saisies dans le formulaire 
    // retourne un objet contenant {title, start, end, description, agendaId, emoji}
     
    getFormData() {
        return {
            title: this.inputTitle.value.trim(),
            start: this.inputStart.value,
            end: this.inputEnd.value,
            description: this.inputDescription.value.trim(),
            agendaId: this.inputAgenda.value,
            emoji: this.inputColor.value
        };
    }

    // Vérifie si le formulaire est valide (titre et date de début obligatoires)
    // retourne un bool true si valide, false sinon
     
    isValid() {
        const data = this.getFormData();
        return data.title !== '' && data.start !== '';
    }

    // Affiche un message d'erreur à l'utilisateur 
    // prend en paramettre message - Message d'erreur à afficher
    
    showError(message) {
        alert(message);
    }

    // Demande une confirmation de suppression à l'utilisateur 
    // retourne un bool true si l'utilisateur confirme, false sinon
    
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

    // Définit le callback pour annuler
    onCancelClick(callback) {
        this.btnCancel.addEventListener('click', callback);
    }

    // Remplit le sélecteur d'agendas dans la modale
    // Exclut l'agenda "Jours fériés" (lecture seule) 
    // @prend en paramettre une liste d'agendas - Liste de tous les agendas disponibles
    // prend en paramettre currentAgendaId - ID de l'agenda à sélectionner par défaut
     
    populateAgendaSelector(agendas, currentAgendaId) {
        this.inputAgenda.innerHTML = '';
        
        agendas.forEach(agenda => {
            // Ne pas afficher l'agenda "Jours fériés" (lecture seule)
            if (agenda.name !== HOLIDAYS_AGENDA_NAME) {
                const option = document.createElement('option');
                option.value = agenda.id;
                option.textContent = agenda.name;
                
                // Sélectionne l'agenda actuel par défaut
                if (agenda.id === currentAgendaId) {
                    option.selected = true;
                }
                
                this.inputAgenda.appendChild(option);
            }
        });
    }
}