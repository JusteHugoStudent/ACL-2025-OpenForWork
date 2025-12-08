// Gestionnaire d'interface utilisateur
// Ce fichier contient toutes les méthodes d'initialisation des événements UI
// et la configuration des callbacks pour App.js.
// Responsabilités :
// - Initialisation des événements des boutons et formulaires
// - Configuration des callbacks du calendrier
// - Gestion du menu de superposition des agendas
// - Gestion du filtrage des événements


class AppUIManager {
    // Initialise le gestionnaire UI avec l'instance de l'app
    // prend en paramettre app - Instance de l'application principale
    
    constructor(app) {
        this.app = app;
    }

    // Initialise tous les gestionnaires d'événements (boutons, callbacks)
     
    initEvents() {
        this.initAuthEvents();
        this.initAgendaEvents();
        this.initCalendarEvents();
        this.initOverlayMenu();
        this.initFilterEvents();
        this.initGlobalEvents();
        this.initContactEvents();
    }

    // Initialise les événements d'authentification
     
    initAuthEvents() {
        this.app.loginView.onLoginClick((username, password) => {
            this.app.handleLogin(username, password);
        });

        this.app.loginView.onSignupClick((username, password) => {
            this.app.handleSignup(username, password);
        });

        this.app.headerView.onLogoutClick(() => {
            this.app.handleLogout();
        });
        
        // Bouton pour vider le cache des notifications (debug)
        const btnClearCache = document.getElementById('btn-clear-notif-cache');
        if (btnClearCache) {
            btnClearCache.addEventListener('click', () => {
                this.app.notificationController.clearAll();
                this.app.notificationController.checkNotifications();
                alert('Affichage des notifications à venir');
            });
        }
    }

    // Initialise les événements de gestion des agendas
     
    initAgendaEvents() {
        this.app.headerView.onAgendaChange = (agenda) => {
            this.app.agendaController.switchAgenda(agenda);
            this.app.reloadAllEvents();
        };

        this.app.headerView.onAddAgendaClick(() => {
            this.openAgendaModal();
        });

        // Bouton pour modifier l'agenda courant
        const btnEditAgenda = document.getElementById('btn-edit-agenda');
        if (btnEditAgenda) {
            btnEditAgenda.addEventListener('click', () => {
                this.openEditAgendaModal();
            });
        }

        // Callback pour l'export : déclenche l'export de l'agenda courant
        this.app.headerView.onExportClick(() => {
            this.app.agendaController.exportCurrentAgendaToFile().catch(err => {
                console.error('Export failed:', err);
                alert('Erreur lors de l\'export de l\'agenda.');
            });
        });
        
        // Callback pour l'import : reçoit un File et lance l'import (crée un nouvel agenda)
        this.app.headerView.onImportClick(async (file) => {
            if (!file) return;

            try {
                const created = await this.app.agendaController.importAgendaFromFile(file);
                if (created) {
                    // Recharge l'affichage / les événements
                    await this.app.reloadAllEvents();
                    alert(`Agenda importé : ${created.name || file.name.replace(/\.[^/.]+$/, '')}`);
                } else {
                    // importAgendaFromFile signale déjà les erreurs ; on peut informer l'utilisateur si rien n'a été créé
                    console.warn('Import terminé sans création d\'agenda.');
                }
            } catch (err) {
                console.error('Import failed:', err);
                alert('Erreur lors de l\'import du fichier JSON.');
            }
        });
    }

    // Initialise les événements du calendrier (modale)
     
    initCalendarEvents() {
        this.app.modalView.onSaveClick(() => {
            this.app.handleSaveEvent();
        });

        this.app.modalView.onDeleteClick(async () => {
            const deleted = await this.app.eventController.deleteEditingEvent();
            if (deleted) {
                this.app.reloadAllEvents();
            }
        });

        this.app.modalView.onCancelClick(() => {
            this.app.modalView.close();
        });
    }

    // Initialise le menu de superposition des agendas
     
    initOverlayMenu() {
        const overlayBtn = document.getElementById('agenda-overlay-btn');
        const overlayMenu = document.getElementById('agenda-overlay-menu');
        const clearAllBtn = document.getElementById('clear-all-overlay');

        if (overlayBtn && overlayMenu) {
            // Toggle du menu au clic
            overlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasHidden = overlayMenu.classList.contains('hidden');
                
                overlayMenu.classList.toggle('hidden');
                overlayBtn.classList.toggle('active');
                
                // Met à jour le menu quand on l'ouvre
                if (wasHidden) {
                    this.app.agendaController.updateOverlayMenu();
                }
            });

            // Ferme le menu si clic à l'extérieur
            document.addEventListener('click', (e) => {
                if (!overlayBtn.contains(e.target) && !overlayMenu.contains(e.target)) {
                    overlayMenu.classList.add('hidden');
                    overlayBtn.classList.remove('active');
                }
            });

            // Bouton "Tout décocher"
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    this.app.agendaController.selectedAgendas = [];
                    this.app.agendaController.updateOverlayMenu();
                    this.app.reloadAllEvents();
                });
            }
        }
    }

    // Initialise les événements du filtre
     
    initFilterEvents() {
        const btnFilter = document.getElementById('btn-filter');
        const btnClearFilter = document.getElementById('btn-clear-filter');
        const btnEmojiFilter = document.getElementById('btn-emoji-filter');
        const btnEmojiClear = document.getElementById('btn-emoji-clear');
        const btnSearch = document.getElementById('btn-search');
        
        // Chips de filtres
        const filterChips = document.querySelectorAll('.filter-chip');
        const datePanel = document.getElementById('date-filter-panel');
        const emojiPanel = document.getElementById('emoji-filter-panel');
        
        filterChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const filterType = chip.dataset.filter;
                
                // Toggle du chip actif
                const wasActive = chip.classList.contains('active');
                
                // Ferme tous les panneaux et désactive tous les chips
                filterChips.forEach(c => c.classList.remove('active'));
                datePanel?.classList.add('hidden');
                emojiPanel?.classList.add('hidden');
                
                // Si le chip n'était pas actif, l'activer et ouvrir son panneau
                if (!wasActive) {
                    chip.classList.add('active');
                    
                    if (filterType === 'date' && datePanel) {
                        // Positionner le panneau sous le chip
                        const rect = chip.getBoundingClientRect();
                        datePanel.style.top = `${rect.bottom + 8}px`;
                        datePanel.style.left = `${rect.left}px`;
                        datePanel.classList.remove('hidden');
                    } else if (filterType === 'emoji' && emojiPanel) {
                        // Positionner le panneau sous le chip
                        const rect = chip.getBoundingClientRect();
                        emojiPanel.style.top = `${rect.bottom + 8}px`;
                        emojiPanel.style.left = `${rect.left}px`;
                        emojiPanel.classList.remove('hidden');
                    }
                }
            });
        });
        
        // Bouton Rechercher principal - Lance la recherche/filtrage
        if (btnSearch) {
            btnSearch.addEventListener('click', () => {
                this.app.handleFilterEvents();
            });
        }
        
        // Boutons Appliquer des panneaux - Ferment juste les panneaux
        if (btnFilter) {
            btnFilter.addEventListener('click', () => {
                datePanel?.classList.add('hidden');
                document.querySelector('[data-filter="date"]')?.classList.remove('active');
            });
        }
        
        if (btnClearFilter) {
            btnClearFilter.addEventListener('click', () => {
                document.getElementById('filter-start').value = '';
                document.getElementById('filter-end').value = '';
                datePanel?.classList.add('hidden');
                document.querySelector('[data-filter="date"]')?.classList.remove('active');
            });
        }
        
        if (btnEmojiFilter) {
            btnEmojiFilter.addEventListener('click', () => {
                emojiPanel?.classList.add('hidden');
                document.querySelector('[data-filter="emoji"]')?.classList.remove('active');
            });
        }
        
        if (btnEmojiClear) {
            btnEmojiClear.addEventListener('click', () => {
                // Désélectionne tous les emojis
                const emojiButtons = document.querySelectorAll('.emoji-btn');
                emojiButtons.forEach(btn => btn.classList.remove('selected'));
                emojiPanel?.classList.add('hidden');
                document.querySelector('[data-filter="emoji"]')?.classList.remove('active');
            });
        }
        
        // Ferme les panneaux si clic à l'extérieur
        document.addEventListener('click', (e) => {
            const isChip = e.target.closest('.filter-chip');
            const isPanel = e.target.closest('.filter-panel');
            
            if (!isChip && !isPanel) {
                filterChips.forEach(c => c.classList.remove('active'));
                datePanel?.classList.add('hidden');
                emojiPanel?.classList.add('hidden');
            }
        });
    }

    // Initialise les événements de contact de l'admin
    initContactEvents() {
        const btnContact = document.getElementById('btn-contact-admin');
        const modalContact = document.getElementById('modal-contact');
        const btnSend = document.getElementById('btn-send-contact');
        const btnCancel = document.getElementById('btn-cancel-contact');
        const inputSubject = document.getElementById('contact-subject');
        const inputMessage = document.getElementById('contact-message');

        // Ouvrir la modale
        if (btnContact) {
            btnContact.addEventListener('click', () => {
                modalContact.classList.remove('hidden');
                inputSubject.focus();
            });
        }

        // Fermer la modale (Annuler)
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                modalContact.classList.add('hidden');
                // Vider les champs si on annule
                inputSubject.value = '';
                inputMessage.value = '';
            });
        }

        // Envoyer le message
        if (btnSend) {
            btnSend.addEventListener('click', async () => {
                const subject = inputSubject.value.trim();
                const message = inputMessage.value.trim();

                if (!subject || !message) {
                    alert("Veuillez remplir le sujet et le message.");
                    return;
                }

                // faudra implementer la logique
                // Pour l'instant, on simule l'envoi dans le terminal
                
                const btnOriginalText = btnSend.innerText;
                btnSend.innerText = "Envoi en cours...";
                btnSend.disabled = true;

                try {
                    console.log(`📨 Envoi message à l'admin :\nSujet: ${subject}\nMessage: ${message}`);
                    
                    // Simulation d'attente réseau (1 seconde)
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    alert("✅ Message envoyé à l'administrateur !");
                    
                    // Fermer et nettoyer
                    modalContact.classList.add('hidden');
                    inputSubject.value = '';
                    inputMessage.value = '';

                } catch (error) {
                    alert("Erreur lors de l'envoi.");
                    console.error(error);
                } finally {
                    btnSend.innerText = btnOriginalText;
                    btnSend.disabled = false;
                }
            });
        }
        
        // Fermer si on clique en dehors de la modale (sur le fond gris)
        if (modalContact) {
            modalContact.addEventListener('click', (e) => {
                if (e.target === modalContact) {
                    modalContact.classList.add('hidden');
                }
            });
        }
    }
    
    // Initialise la grille d'emojis
     
    initEmojiGrid() {
        const container = document.getElementById('filter-emoji-buttons');
        if (!container) return;
        
        // Ne recrée pas si déjà créé
        if (container.children.length > 0) return;
        
        const emojis = ['📅', '🎉', '💼', '🎓', '🏥', '🍕', '🏋️', '✈️', '🎵', '📚', '🎮', '🎨'];
        
        container.innerHTML = '';
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-btn';
            btn.type = 'button';
            btn.textContent = emoji;
            btn.dataset.emoji = emoji;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.classList.toggle('selected');
            });
            container.appendChild(btn);
        });
    }

    // Initialise les événements globaux
     
    initGlobalEvents() {
        // Écoute les changements d'overlay
        document.addEventListener('agendaOverlayChanged', () => {
            this.app.reloadAllEvents();
        });
    }

    // Configure les callbacks du calendrier FullCalendar
     
    setupCalendarCallbacks() {
        // Clic sur une date : ouvre la modale de création
        this.app.calendarManager.setOnDateClick((dateStr) => {
            const currentAgenda = this.app.agendaController.getCurrentAgenda();
            if (!currentAgenda) {
                alert(ERROR_MESSAGES.AGENDA.MISSING_NAME);
                return;
            }

            this.app.eventController.setEditingEvent(null);
            
            // Remplit le sélecteur d'agendas
            this.app.modalView.populateAgendaSelector(
                this.app.agendaController.getAllAgendas(),
                currentAgenda.id
            );
            
            this.app.modalView.openForAdd(dateStr);
        });

        // Clic sur un événement : ouvre la modale d'édition
        this.app.calendarManager.setOnEventClick((event) => {
            const eventAgendaId = event.extendedProps.agendaId || this.app.agendaController.getCurrentAgenda()?.id;
            
            // Bloque l'édition des événements de l'agenda "Jours fériés"
            const agenda = this.app.agendaController.agendas.find(a => a.id === eventAgendaId);
            if (agenda && agenda.name === HOLIDAYS_AGENDA_NAME) {
                return; // Ne rien faire pour les jours fériés
            }
            
            // Pour événement récurrent, utiliser l'ID original et les dates originales
            const eventIdToEdit = event.extendedProps.isRecurring 
                ? event.extendedProps.originalEventId 
                : (event.id.includes('-') ? event.id.split('-')[1] : event.id);

            const eventStart = event.extendedProps.isRecurring && event.extendedProps.originalStart 
                ? new Date(event.extendedProps.originalStart) 
                : event.start;
            
            const eventEnd = event.extendedProps.isRecurring && event.extendedProps.originalEnd
                ? new Date(event.extendedProps.originalEnd)
                : event.end;
            
            // Prépare les données pour la modale
            const eventData = {
                title: event.extendedProps.originalTitle || event.title.replace(/^.+?\s/, ''),
                start: formatDateTimeLocal(new Date(eventStart)),
                end: eventEnd ? formatDateTimeLocal(new Date(eventEnd)) : '',
                description: event.extendedProps.description || '',
                emoji: event.extendedProps.emoji || '📅',
                agendaId: eventAgendaId,
                recurrence: event.extendedProps.recurrence || { type: 'none' }
            };

            // Stocke l'ID réel pour l'API (sans agendaId ni occurrenceIndex)
            this.app.eventController.setEditingEvent(eventIdToEdit);
            this.app.modalView.openForEdit(eventData, this.app.agendaController.getAllAgendas());
        });

        // Déplacement d'événement (drag & drop) et redimensionnement
        const handleEventChange = async (event) => {
            // Bloquer le déplacement des événements récurrents
            if (event.extendedProps.isRecurring) {
                alert('Les événements récurrents ne peuvent pas être déplacés. Modifiez l\'événement pour changer sa récurrence.');
                this.app.reloadAllEvents();
                return;
            }
            
            // Extrait l'eventId réel (format FullCalendar: "agendaId-eventId")
            const realEventId = event.id.includes('-') 
                ? event.id.split('-')[1] 
                : event.id;
            
            await this.app.eventController.updateEvent({
                id: realEventId,
                title: event.extendedProps.originalTitle || event.title,
                start: event.start,
                end: event.end,
                description: event.extendedProps.description,
                emoji: event.extendedProps.emoji,
                agendaId: event.extendedProps.agendaId
            });
        };

        // Assigne le callback pour drag & drop et resize
        this.app.calendarManager.onEventChangeCallback = handleEventChange;

        // Changement de vue ou de date
        this.app.calendarManager.onVisiblePeriodChange = () => {
            this.app.reloadAllEvents();
        };
    }

    // Ouvre la modale de création d'agenda
    openAgendaModal() {
        const modal = document.getElementById('agenda-modal');
        const nameInput = document.getElementById('agenda-name-input');
        const colorInput = document.getElementById('agenda-color-input');
        const btnCreate = document.getElementById('btn-create-agenda');
        const btnCancel = document.getElementById('btn-cancel-agenda');

        // Réinitialise les champs
        nameInput.value = '';
        colorInput.value = THEME_COLORS.DEFAULT_AGENDA;

        // Affiche la modale
        modal.classList.remove('hidden');
        nameInput.focus();

        // Gère la création
        const handleCreate = async () => {
            const name = nameInput.value.trim();
            const color = colorInput.value;

            if (!name) {
                alert('Veuillez saisir un nom pour l\'agenda.');
                return;
            }

            const created = await this.app.agendaController.createAgenda(name, color);
            if (created) {
                closeModal();
                this.app.reloadAllEvents();
            }
        };

        // Gère le clic en dehors
        const handleClickOutside = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        // Ferme la modale et nettoie les listeners
        const closeModal = () => {
            modal.classList.add('hidden');
            btnCreate.removeEventListener('click', handleCreate);
            btnCancel.removeEventListener('click', closeModal);
            modal.removeEventListener('click', handleClickOutside);
        };

        // Attache les listeners
        btnCreate.addEventListener('click', handleCreate);
        btnCancel.addEventListener('click', closeModal);
        modal.addEventListener('click', handleClickOutside);
    }

    /**
     * Ouvre la modale de modification d'agenda
     */
    openEditAgendaModal() {
        const modal = document.getElementById('edit-agenda-modal');
        const nameInput = document.getElementById('edit-agenda-name-input');
        const colorInput = document.getElementById('edit-agenda-color-input');
        const colorPreview = document.getElementById('edit-color-preview');
        const btnApply = document.getElementById('btn-apply-edit-agenda');
        const btnDelete = document.getElementById('btn-delete-agenda');

        if (!modal || !nameInput || !colorInput || !btnApply || !btnDelete) {
            console.error('Éléments de la modale de modification introuvables');
            return;
        }

        // Récupère l'agenda courant
        const currentAgenda = this.app.agendaController.currentAgenda;
        if (!currentAgenda) {
            alert('Aucun agenda sélectionné.');
            return;
        }

        // Pré-remplit les champs
        nameInput.value = currentAgenda.name;
        colorInput.value = currentAgenda.color || THEME_COLORS.DEFAULT_AGENDA;
        if (colorPreview) {
            colorPreview.style.backgroundColor = currentAgenda.color || THEME_COLORS.DEFAULT_AGENDA;
        }

        // Met à jour la prévisualisation en temps réel
        colorInput.addEventListener('input', (e) => {
            if (colorPreview) {
                colorPreview.style.backgroundColor = e.target.value;
            }
        });

        // Affiche la modale
        modal.classList.remove('hidden');

        // Handler pour appliquer les modifications
        const handleApply = async () => {
            const name = nameInput.value.trim();
            const color = colorInput.value;

            if (!name) {
                alert('Veuillez saisir un nom pour l\'agenda.');
                return;
            }

            const updated = await this.app.agendaController.updateAgenda(
                currentAgenda.id,
                name,
                color
            );

            if (updated) {
                closeModal();
                this.app.reloadAllEvents();
            }
        };

        // Handler pour supprimer l'agenda
        const handleDelete = async () => {
            const deleted = await this.app.agendaController.deleteAgenda(currentAgenda.id);
            if (deleted) {
                closeModal();
                this.app.reloadAllEvents();
            }
        };

        // Gère le clic en dehors
        const handleClickOutside = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        // Ferme la modale et nettoie les listeners
        const closeModal = () => {
            modal.classList.add('hidden');
            btnApply.removeEventListener('click', handleApply);
            btnDelete.removeEventListener('click', handleDelete);
            modal.removeEventListener('click', handleClickOutside);
        };

        // Attache les listeners
        btnApply.addEventListener('click', handleApply);
        btnDelete.addEventListener('click', handleDelete);
        modal.addEventListener('click', handleClickOutside);
    }
}
