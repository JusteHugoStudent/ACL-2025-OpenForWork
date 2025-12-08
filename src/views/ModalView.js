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
        
        // Champs de récurrence
        this.inputRecurrence = document.getElementById('input-recurrence');
        this.recurrenceOptions = document.getElementById('recurrence-options');
        this.inputRecurrenceEnd = document.getElementById('input-recurrence-end');
        this.weeklyDays = document.getElementById('weekly-days');
        
        // Boutons
        this.btnSave = document.getElementById('btn-save');
        this.btnDelete = document.getElementById('btn-delete');
        this.btnCancel = document.getElementById('btn-cancel');
        
        // Initialise l'événement de fermeture en cliquant à l'extérieur
        this.initCloseOnClickOutside();
        
        // Initialise la fermeture avec la touche Échap
        this.initEscapeKeyHandler();
        
        // Gère l'affichage des options de récurrence
        this.initRecurrenceHandlers();
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
    
    // Touche Echap pour quitter ajout Event
    initEscapeKeyHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    // Initialise les gestionnaires d'événements pour la récurrence
    initRecurrenceHandlers() {
        this.inputRecurrence.addEventListener('change', () => {
            const type = this.inputRecurrence.value;
            
            if (type === 'none') {
                this.recurrenceOptions.classList.add('hidden');
                this.weeklyDays.classList.add('hidden');
            } else {
                this.recurrenceOptions.classList.remove('hidden');
                
                // Afficher les jours de la semaine uniquement pour récurrence hebdomadaire
                if (type === 'weekly') {
                    this.weeklyDays.classList.remove('hidden');
                } else {
                    this.weeklyDays.classList.add('hidden');
                }
            }
        });
    }

    // Ouvre la modale en mode AJOUT d'un nouvel événement
    // Réinitialise tous les champs et cache le bouton Supprimer 
    // prend en paramettre dateStr - Date au format YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss (optionnel) pour pré-remplir les dates
    // prend en paramettre dateObj - Objet Date JavaScript (optionnel) pour les vues avec heure
    
    openForAdd(dateStr = '', dateObj = null) {
        this.modalTitle.textContent = 'Ajouter un événement';
        this.btnDelete.classList.add('hidden');
        
        // Vide les champs
        this.inputTitle.value = '';
        this.inputDescription.value = '';
        this.inputColor.value = '📅';
        
        // Réinitialise la récurrence
        this.inputRecurrence.value = 'none';
        this.inputRecurrenceEnd.value = '';
        this.recurrenceOptions.classList.add('hidden');
        this.weeklyDays.classList.add('hidden');
        this.clearWeeklyDays();
        
        // Preremplit les dates si fourni
        if (dateStr) {
            // Si dateStr contient déjà l'heure (format complet), l'utiliser directement
            if (dateStr.includes('T')) {
                const startDate = new Date(dateStr);
                const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 heure
                
                this.inputStart.value = this.formatDateTimeLocal(startDate);
                this.inputEnd.value = this.formatDateTimeLocal(endDate);
            } else {
                // Sinon, ajouter une heure par défaut (vue mensuelle)
                this.inputStart.value = dateStr + 'T09:00';
                this.inputEnd.value = dateStr + 'T10:00';
            }
        } 
        else {
            this.inputStart.value = '';
            this.inputEnd.value = '';
        }
        
        this.modal.classList.remove('hidden');
    }
    
    // Formate un objet Date en chaîne compatible datetime-local (YYYY-MM-DDTHH:mm)
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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
        
        // Remplit les champs de récurrence
        if (eventData.recurrence) {
            this.inputRecurrence.value = eventData.recurrence.type || 'none';
            
            // Convertir la date de fin si nécessaire
            if (eventData.recurrence.endDate) {
                const endDate = new Date(eventData.recurrence.endDate);
                this.inputRecurrenceEnd.value = endDate.toISOString().split('T')[0];
            } else {
                this.inputRecurrenceEnd.value = '';
            }
            
            if (eventData.recurrence.type !== 'none') {
                this.recurrenceOptions.classList.remove('hidden');
            }
            
            if (eventData.recurrence.type === 'weekly' && eventData.recurrence.daysOfWeek) {
                this.weeklyDays.classList.remove('hidden');
                this.setWeeklyDays(eventData.recurrence.daysOfWeek);
            }
        } else {
            this.inputRecurrence.value = 'none';
            this.recurrenceOptions.classList.add('hidden');
        }
        
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
    // retourne un objet contenant {title, start, end, description, agendaId, emoji, recurrence}
     
    getFormData() {
        const recurrenceType = this.inputRecurrence.value;
        
        const data = {
            title: this.inputTitle.value.trim(),
            start: this.inputStart.value,
            end: this.inputEnd.value,
            description: this.inputDescription.value.trim(),
            agendaId: this.inputAgenda.value,
            emoji: this.inputColor.value
        };
        
        // Ajouter les données de récurrence si activée
        if (recurrenceType !== 'none') {
            data.recurrence = {
                type: recurrenceType,
                interval: 1,
                endDate: this.inputRecurrenceEnd.value || null
            };
            
            // Pour récurrence hebdomadaire, récupérer les jours sélectionnés
            if (recurrenceType === 'weekly') {
                data.recurrence.daysOfWeek = this.getSelectedWeeklyDays();
            }
        } else {
            data.recurrence = { type: 'none' };
        }
        
        return data;
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

    // Récupère les jours de la semaine sélectionnés
    getSelectedWeeklyDays() {
        const checkboxes = this.weeklyDays.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    // Coche les jours de la semaine
    setWeeklyDays(days) {
        this.clearWeeklyDays();
        days.forEach(day => {
            const checkbox = this.weeklyDays.querySelector(`input[value="${day}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    // Décoche tous les jours de la semaine
    clearWeeklyDays() {
        const checkboxes = this.weeklyDays.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }
}