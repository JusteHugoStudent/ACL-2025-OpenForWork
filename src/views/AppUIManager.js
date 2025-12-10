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
                Toast.info('Affichage des notifications à venir');
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

        // Callback pour l'export : ouvre la modale de sélection d'export
        this.app.headerView.onExportClick(() => {
            this.openExportModal();
        });

        // Callback pour l'import : ouvre la modale de choix d'import
        this.app.headerView.onImportClick(async (file) => {
            if (!file) return;

            // Parse le fichier pour vérifier sa validité
            const parsedData = await this.app.agendaController.parseImportFile(file);
            if (!parsedData) return;

            // Ouvre la modale de choix d'import
            this.openImportModal(file, parsedData);
        });
    }

    /**
     * Ouvre la modale de choix d'import
     */
    openImportModal(file, parsedData) {
        const modal = document.getElementById('import-agenda-modal');
        const mergeSelector = document.getElementById('merge-agenda-selector');
        const newAgendaOptions = document.getElementById('new-agenda-options');
        const targetAgendaSelect = document.getElementById('import-target-agenda');
        const radioNew = document.querySelector('input[name="import-mode"][value="new"]');
        const radioMerge = document.querySelector('input[name="import-mode"][value="merge"]');
        const btnConfirm = document.getElementById('btn-confirm-import');
        const btnCancel = document.getElementById('btn-cancel-import');
        const nameInput = document.getElementById('import-agenda-name');
        const colorInput = document.getElementById('import-agenda-color');
        const colorPreview = document.getElementById('import-color-preview');

        if (!modal) return;

        // Récupère le nom et la couleur depuis le fichier importé
        const importedName = parsedData?.agenda?.name || parsedData?.name || file.name.replace(/\.[^/.]+$/, '');
        const importedColor = parsedData?.agenda?.color || THEME_COLORS.DEFAULT_AGENDA;

        // Réinitialise l'état
        radioNew.checked = true;
        mergeSelector.classList.add('hidden');
        newAgendaOptions.classList.remove('hidden');

        // Pré-remplit les champs avec les valeurs du fichier
        nameInput.value = importedName.length > 15 ? importedName.slice(0, 15) : importedName;
        colorInput.value = importedColor;
        if (colorPreview) colorPreview.style.backgroundColor = importedColor;

        // Met à jour la prévisualisation en temps réel
        const handleColorChange = (e) => {
            if (colorPreview) colorPreview.style.backgroundColor = e.target.value;
        };
        colorInput.addEventListener('input', handleColorChange);

        // Remplit le sélecteur d'agendas (exclut Jours fériés)
        const agendas = this.app.agendaController.getAllAgendas()
            .filter(a => a.name !== HOLIDAYS_AGENDA_NAME);

        targetAgendaSelect.innerHTML = agendas.map(a =>
            `<option value="${a.id}">${a.name}</option>`
        ).join('');

        // Gère le changement de mode
        const handleModeChange = () => {
            if (radioMerge.checked) {
                mergeSelector.classList.remove('hidden');
                newAgendaOptions.classList.add('hidden');
            } else {
                mergeSelector.classList.add('hidden');
                newAgendaOptions.classList.remove('hidden');
            }
        };

        radioNew.addEventListener('change', handleModeChange);
        radioMerge.addEventListener('change', handleModeChange);

        // Affiche la modale
        modal.classList.remove('hidden');

        // Handler de confirmation
        const handleConfirm = async () => {
            const mode = document.querySelector('input[name="import-mode"]:checked').value;

            if (mode === 'new') {
                // Valide le nom
                const customName = nameInput.value.trim();
                if (!customName) {
                    Toast.warning('Veuillez saisir un nom pour l\'agenda.');
                    return;
                }
            }

            closeModal();

            try {
                if (mode === 'new') {
                    // Crée un nouvel agenda avec nom et couleur personnalisés
                    const customName = nameInput.value.trim();
                    const customColor = colorInput.value;

                    const created = await this.app.agendaController.importAgendaFromJson(
                        parsedData._rawJson,
                        {
                            createNew: true,
                            sourceFilename: parsedData._filename,
                            customName: customName,
                            customColor: customColor
                        }
                    );
                    if (created) {
                        await this.app.reloadAllEvents();
                        Toast.success(`Nouvel agenda créé : ${created.name}`);
                    }
                } else {
                    // Fusionne avec l'agenda sélectionné
                    const targetId = targetAgendaSelect.value;
                    const targetAgenda = this.app.agendaController.getAgendaById(targetId);

                    const result = await this.app.agendaController.mergeEventsToAgenda(
                        parsedData._rawJson,
                        targetId
                    );

                    if (result.success) {
                        await this.app.reloadAllEvents();
                        const message = result.failedCount > 0
                            ? `${result.addedCount} événement(s) ajouté(s) à "${targetAgenda.name}". ${result.failedCount} échec(s).`
                            : `${result.addedCount} événement(s) ajouté(s) à "${targetAgenda.name}".`;
                        Toast.success(message);
                    }
                }
            } catch (err) {
                console.error('Import failed:', err);
                Toast.error('Erreur lors de l\'import.');
            }
        };

        // Handler pour fermer
        const handleClickOutside = (e) => {
            if (e.target === modal) closeModal();
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            radioNew.removeEventListener('change', handleModeChange);
            radioMerge.removeEventListener('change', handleModeChange);
            colorInput.removeEventListener('input', handleColorChange);
            btnConfirm.removeEventListener('click', handleConfirm);
            btnCancel.removeEventListener('click', closeModal);
            modal.removeEventListener('click', handleClickOutside);
        };

        btnConfirm.addEventListener('click', handleConfirm);
        btnCancel.addEventListener('click', closeModal);
        modal.addEventListener('click', handleClickOutside);
    }

    /**
     * Ouvre la modale de sélection d'export
     */
    openExportModal() {
        const modal = document.getElementById('export-agenda-modal');
        const agendaList = document.getElementById('export-agenda-list');
        const mergedOptions = document.getElementById('merged-export-options');
        const radioIndividual = document.querySelector('input[name="export-mode"][value="individual"]');
        const radioMerged = document.querySelector('input[name="export-mode"][value="merged"]');
        const btnConfirm = document.getElementById('btn-confirm-export');
        const btnCancel = document.getElementById('btn-cancel-export');
        const mergedNameInput = document.getElementById('export-merged-name');
        const mergedColorInput = document.getElementById('export-merged-color');
        const colorPreview = document.getElementById('export-color-preview');

        if (!modal) return;

        // Récupère tous les agendas (exclut Jours fériés)
        const agendas = this.app.agendaController.getAllAgendas()
            .filter(a => a.name !== HOLIDAYS_AGENDA_NAME);

        // Remplit la liste des agendas avec checkboxes
        agendaList.innerHTML = agendas.map(a => `
            <label class="export-agenda-item">
                <input type="checkbox" value="${a.id}" ${a.id === this.app.agendaController.currentAgenda?.id ? 'checked' : ''}>
                <span class="agenda-color" style="background-color: ${a.color || '#3498db'}"></span>
                <span>${a.name}</span>
            </label>
        `).join('');

        // Réinitialise l'état
        radioIndividual.checked = true;
        mergedOptions.classList.add('hidden');
        mergedNameInput.value = 'Agenda combiné';
        mergedColorInput.value = '#3498db';
        if (colorPreview) colorPreview.style.backgroundColor = '#3498db';

        // Gère le changement de mode
        const handleModeChange = () => {
            if (radioMerged.checked) {
                mergedOptions.classList.remove('hidden');
            } else {
                mergedOptions.classList.add('hidden');
            }
        };

        radioIndividual.addEventListener('change', handleModeChange);
        radioMerged.addEventListener('change', handleModeChange);

        // Prévisualisation couleur
        const handleColorChange = (e) => {
            if (colorPreview) colorPreview.style.backgroundColor = e.target.value;
        };
        mergedColorInput.addEventListener('input', handleColorChange);

        // Affiche la modale
        modal.classList.remove('hidden');

        // Handler de confirmation
        const handleConfirm = async () => {
            const mode = document.querySelector('input[name="export-mode"]:checked').value;
            const selectedCheckboxes = agendaList.querySelectorAll('input[type="checkbox"]:checked');
            const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);

            if (selectedIds.length === 0) {
                Toast.warning('Veuillez sélectionner au moins un agenda.');
                return;
            }

            closeModal();

            try {
                if (mode === 'individual') {
                    // Export individuel : un fichier par agenda
                    for (const agendaId of selectedIds) {
                        await this.app.agendaController.exportAgendaById(agendaId);
                    }
                    Toast.success(`${selectedIds.length} agenda(s) exporté(s) avec succès.`);
                } else {
                    // Export fusionné : tous les événements dans un fichier
                    const mergedName = mergedNameInput.value.trim() || 'Agenda combiné';
                    const mergedColor = mergedColorInput.value;

                    await this.app.agendaController.exportMergedAgendas(
                        selectedIds,
                        mergedName,
                        mergedColor
                    );
                    Toast.success('Agenda fusionné exporté avec succès.');
                }
            } catch (err) {
                console.error('Export failed:', err);
                Toast.error('Erreur lors de l\'export.');
            }
        };

        // Handler pour fermer
        const handleClickOutside = (e) => {
            if (e.target === modal) closeModal();
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            radioIndividual.removeEventListener('change', handleModeChange);
            radioMerged.removeEventListener('change', handleModeChange);
            mergedColorInput.removeEventListener('input', handleColorChange);
            btnConfirm.removeEventListener('click', handleConfirm);
            btnCancel.removeEventListener('click', closeModal);
            modal.removeEventListener('click', handleClickOutside);
        };

        btnConfirm.addEventListener('click', handleConfirm);
        btnCancel.addEventListener('click', closeModal);
        modal.addEventListener('click', handleClickOutside);
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

                // Positionne et met à jour le menu quand on l'ouvre
                if (wasHidden) {
                    // Positionnement dynamique basé sur la position du bouton
                    const rect = overlayBtn.getBoundingClientRect();
                    const isMobile = window.innerWidth <= 900;

                    if (!isMobile) {
                        // Desktop : en dessous du bouton
                        overlayMenu.style.top = (rect.bottom + 8) + 'px';
                        overlayMenu.style.left = rect.left + 'px';
                    }
                    // Mobile : laisse le CSS gérer (centré)

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

    // Gestion du formulaire de contact admin
    initContactEvents() {
        const btnContact = document.getElementById('btn-contact-admin');
        const modalContact = document.getElementById('modal-contact');
        const btnSend = document.getElementById('btn-send-contact');
        const btnCancel = document.getElementById('btn-cancel-contact');

        // Récuperation des champs du formulaire
        const inputEmail = document.getElementById('contact-email');
        const inputSubject = document.getElementById('contact-subject');
        const inputMessage = document.getElementById('contact-message');

        // Affiche la modale au clic sur le bouton du menu
        if (btnContact) {
            btnContact.addEventListener('click', () => {
                modalContact.classList.remove('hidden');
                inputEmail.focus(); // On met le focus direct sur l'email
            });
        }

        // Bouton Annuler, on cache juste la modale
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                modalContact.classList.add('hidden');
            });
        }

        // Bouton Envoyer, gestion de l'envoi via EmailJS
        if (btnSend) {
            btnSend.addEventListener('click', () => {
                const email = inputEmail.value.trim();
                const subject = inputSubject.value.trim();
                const message = inputMessage.value.trim();

                // On vérifie que tout est rempli sinon on bloque
                if (!email || !subject || !message) {
                    Toast.warning("Faut tout remplir pour envoyer le message !");
                    return;
                }

                // Petit effet visuel pour dire que ça charge
                const oldText = btnSend.innerText;
                btnSend.innerText = "Envoi...";
                btnSend.disabled = true;

                // Parametres à envoyer au template EmailJS
                // les noms (from_name, etc) doivent correspondre à ceux dans le template sur le site
                const params = {
                    from_name: email,
                    to_email: "admulacl8@outlook.com", // Mail de l'admin
                    subject: subject,
                    message: message
                };

                // Envoi via le service
                // Remplacer les ID par ceux du dashboard EmailJS
                emailjs.send('service_nemf0u3', 'template_xmze3ks', params)
                    .then(() => {
                        Toast.success("C'est envoyé ! L'admin a reçu le mail.");
                        modalContact.classList.add('hidden');

                        // On vide les champs pour la prochaine fois
                        inputEmail.value = '';
                        inputSubject.value = '';
                        inputMessage.value = '';
                    })
                    .catch((err) => {
                        console.error('Erreur envoi mail:', err);
                        Toast.error("Oups, erreur lors de l'envoi...");
                    })
                    .finally(() => {
                        // on remet toujoursn le bouton comme avant
                        btnSend.innerText = oldText;
                        btnSend.disabled = false;
                    });
            });
        }

        // Fermeture si on clique sur le fond gris
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

        // Gestion du bouton FAB (Ajout mobile)
        const btnFab = document.getElementById('btn-mobile-add-event');
        if (btnFab) {
            btnFab.addEventListener('click', () => {
                // Simule un clic sur la date d'aujourd'hui pour ouvrir la modale de création
                const today = new Date();
                const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

                if (this.app.calendarManager && this.app.calendarManager.onDateClickCallback) {
                    this.app.calendarManager.onDateClickCallback(dateStr, today);
                }
            });
        }

        // Gestion du bouton Toggle Filtres (Mobile)
        const btnToggleFilters = document.getElementById('btn-mobile-toggle-filters');
        if (btnToggleFilters) {
            btnToggleFilters.addEventListener('click', () => {
                const filters = document.getElementById('filter-chips-container');
                if (filters) {
                    filters.classList.toggle('show');
                    btnToggleFilters.classList.toggle('active');
                }
            });
        }
    }

    // Configure les callbacks du calendrier FullCalendar

    setupCalendarCallbacks() {
        // Clic sur une date : ouvre la modale de création
        this.app.calendarManager.setOnDateClick((dateStr, dateObj) => {
            const currentAgenda = this.app.agendaController.getCurrentAgenda();
            if (!currentAgenda) {
                Toast.warning(ERROR_MESSAGES.AGENDA.MISSING_NAME);
                return;
            }

            this.app.eventController.setEditingEvent(null);

            // Remplit le sélecteur d'agendas
            this.app.modalView.populateAgendaSelector(
                this.app.agendaController.getAllAgendas(),
                currentAgenda.id
            );

            this.app.modalView.openForAdd(dateStr, dateObj);
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
            const isAllDay = event.allDay || event.extendedProps.allDay || false;

            let startValue, endValue;

            if (isAllDay) {
                // Pour les événements all-day, extraire la date LOCALE (pas UTC!)
                // Car FullCalendar renvoie la date en heure locale (ex: Mon Dec 08 2025 00:00:00 GMT+0100)
                const startDate = typeof eventStart === 'string' ? new Date(eventStart) : eventStart;
                const endDate = eventEnd ? (typeof eventEnd === 'string' ? new Date(eventEnd) : eventEnd) : startDate;

                // Extraire année/mois/jour en heure LOCALE
                const startYear = startDate.getFullYear();
                const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
                const startDay = String(startDate.getDate()).padStart(2, '0');
                startValue = `${startYear}-${startMonth}-${startDay}`;

                const endYear = endDate.getFullYear();
                const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
                const endDay = String(endDate.getDate()).padStart(2, '0');
                endValue = `${endYear}-${endMonth}-${endDay}`;
            } else {
                // Pour les événements avec heures, utiliser le format datetime-local
                startValue = formatDateTimeLocal(new Date(eventStart));
                endValue = eventEnd ? formatDateTimeLocal(new Date(eventEnd)) : '';
            }

            const eventData = {
                title: event.extendedProps.originalTitle || event.title.replace(/^.+?\s/, ''),
                start: startValue,
                end: endValue,
                allDay: isAllDay,
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
                Toast.warning('Les événements récurrents ne peuvent pas être déplacés. Modifiez l\'événement pour changer sa récurrence.');
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
                allDay: event.allDay || event.extendedProps.allDay || false,
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
        const colorPreview = document.getElementById('create-color-preview');
        const btnCreate = document.getElementById('btn-create-agenda');
        const btnCancel = document.getElementById('btn-cancel-agenda');

        // Réinitialise les champs
        nameInput.value = '';
        colorInput.value = THEME_COLORS.DEFAULT_AGENDA;
        if (colorPreview) {
            colorPreview.style.backgroundColor = THEME_COLORS.DEFAULT_AGENDA;
        }

        // Met à jour la prévisualisation en temps réel
        const handleColorChange = (e) => {
            if (colorPreview) {
                colorPreview.style.backgroundColor = e.target.value;
            }
        };
        colorInput.addEventListener('input', handleColorChange);

        // Affiche la modale
        modal.classList.remove('hidden');
        nameInput.focus();

        // Gère la création
        const handleCreate = async () => {
            const name = nameInput.value.trim();
            const color = colorInput.value;

            if (!name) {
                Toast.warning('Veuillez saisir un nom pour l\'agenda.');
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
            colorInput.removeEventListener('input', handleColorChange);
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
            Toast.warning('Aucun agenda sélectionné.');
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
                Toast.warning('Veuillez saisir un nom pour l\'agenda.');
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
