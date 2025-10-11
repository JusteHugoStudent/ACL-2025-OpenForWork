// Controleur principal a fusionner avec le controlleur par la suite

class App {
    constructor() {
        // creer toute les vue
        this.loginView = new LoginView();
        this.headerView = new HeaderView();
        this.modalView = new ModalView();
        this.calendarManager = new CalendarManager();
        
        // var d'etat
        this.currentUser = null;
        this.editingEventId = null; // ID de l'event en cours de modification
        
        // init
        this.initEvents();
    }

    // Initialise tous les events (callbacks)
    initEvents() {
        // Connexion
        this.loginView.onLoginClick((username, password) => {
            this.handleLogin(username, password);
        });

        // Deconnexion
        this.headerView.onLogoutClick(() => {
            this.handleLogout();
        });

        // Modal - Boutons
        this.modalView.onSaveClick(() => {
            this.handleSaveEvent();
        });

        this.modalView.onDeleteClick(() => {
            this.handleDeleteEvent();
        });

        this.modalView.onCancelClick(() => {
            this.modalView.close();
        });
    }

    // Gere la connexion - Meca basique pour l'instant
    handleLogin(username, password) {
        // pas de verification 
        this.currentUser = username || 'Utilisateur';
        
        // maj l'interface
        this.headerView.setUserName(this.currentUser);
        this.loginView.hide();
        this.headerView.show();
        
        // init le calendrier
        this.calendarManager.init();
        this.setupCalendarCallbacks();
    }

    // Configure les callbacks du calendrier
    setupCalendarCallbacks() {
        // clic sur un event // Modifier
        this.calendarManager.setOnEventClick((event) => {
            this.handleEditEvent(event);
        });

        // clic sur une date // Ajouter
        this.calendarManager.setOnDateClick((dateStr) => {
            this.handleAddEvent(dateStr);
        });
    }

    // gere la deconnexion
    handleLogout() {
        this.currentUser = null;
        this.loginView.clear();
        this.calendarManager.destroy();
        this.headerView.hide();
        this.loginView.show();
    }

    // gere l'ajout d'un evenement avec en param la date cliquee
    handleAddEvent(dateStr) {
        this.editingEventId = null;
        this.modalView.openForAdd(dateStr);
    }

    // gere la modif d'un evenement
    handleEditEvent(event) {
        this.editingEventId = event.id;
        
        // prepare les data pour la modale
        const eventData = {
            title: event.title,
            start: this.formatDateTimeLocal(new Date(event.start)),
            end: event.end ? this.formatDateTimeLocal(new Date(event.end)) : '',
            description: event.extendedProps.description || '',
            color: event.backgroundColor || '#ffd700'
        };
        
        this.modalView.openForEdit(eventData);
    }

    // gere la sauvegarde d'un evenemnt (ajout ou modification)
    handleSaveEvent() {
        // validation
        if (!this.modalView.isValid()) {
            this.modalView.showError('Le titre et la date de début sont obligatoires');
            return;
        }

        // recupere les datas du formulaire
        const formData = this.modalView.getFormData();

        if (this.editingEventId) {
            // modification
            this.calendarManager.updateEvent(this.editingEventId, {
                title: formData.title,
                start: formData.start,
                end: formData.end || formData.start,
                backgroundColor: formData.color,
                borderColor: formData.color,
                extendedProps: {
                    description: formData.description
                }
            });
        } 
        else {
            // ajoute
            this.calendarManager.addEvent({
                id: Date.now().toString(),
                title: formData.title,
                start: formData.start,
                end: formData.end || formData.start,
                backgroundColor: formData.color,
                borderColor: formData.color,
                extendedProps: {
                    description: formData.description
                }
            });
        }

        this.modalView.close();
    }

    // gere la suppression d'un evenement
     
    handleDeleteEvent() {
        if (this.modalView.confirmDelete()) {
            this.calendarManager.removeEvent(this.editingEventId);
            this.modalView.close();
        }
    }

    // formate une date pour les inputs datetime-local,  date / Date a formater, retourne un format ANNEES-MOIS-JOURS-Heurs-mins
     
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

// on demarre l'appli
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
});