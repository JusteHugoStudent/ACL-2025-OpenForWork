// Contrôleur frontend responsable de la gestion des agendas
// Gère le chargement, la création, la sélection et la superposition des agendas


class AgendaControllerFront {
    // Constructeur du contrôleur d'agendas

    // prend en parametre agendaService pour les appels API agendas
    // et headerView pour la Vue de l'en-tête, pour l'afficher le sélecteur
    // et eventController pour créer les événements lors de l'import
     
    constructor(agendaService, headerView, eventController = null) {
        this.agendaService = agendaService;
        this.headerView = headerView;
        this.eventController = eventController;
        
        // État des agendas
        this.agendas = [];
        this.currentAgenda = null;
        this.selectedAgendas = []; // IDs des agendas en superposition
    }
    
    // Récupère tous les agendas de l'utilisateur depuis le serveur
    // Met à jour l'affichage du sélecteur d'agendas
    // retourne La liste des agendas
     
    async loadAgendas() {
        const token = getToken();
        if (!token) return [];

        try {
            // Utilise AgendaService pour récupérer les agendas
            const agendas = await this.agendaService.fetchAll();
            this.agendas = agendas;

            // Met à jour le header pour afficher le sélecteur
            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
            
            // Met à jour le menu de superposition
            this.updateOverlayMenu();

            return this.agendas;
        } catch (error) {
            console.error('Erreur lors du chargement des agendas :', error);
            return [];
        }
    }

    
    // Crée un nouvel agenda avec validation
    // prend en paramettre le nom de l'agenda à créer
    // prend en paramettre color (optionnel) - Couleur hex de l'agenda
    // options: { setCurrent: true } - si false, ne remplace pas this.currentAgenda (utile pour import)
    // retourne L'agenda créé ou null en cas d'erreur
     
    async createAgenda(name, color = THEME_COLORS.DEFAULT_AGENDA, { setCurrent = true } = {}) {
        // Validation avec validationUtils
        if (!isNotEmpty(name)) {
            alert(ERROR_MESSAGES.AGENDA.MISSING_NAME);
            return null;
        }

        if (name.length > 15) {
            alert("Le nom de l'agenda ne peut pas dépasser 15 caractères !");
            return null;
        }

        try {
            // Créer l'agenda via le service avec le nom et la couleur
            const created = await this.agendaService.create(name, color);
            console.log('📝 Agenda créé:', created);

            // Recharger tous les agendas
            await this.loadAgendas();
            console.log('📚 Agendas rechargés:', this.agendas);

            // Définir le nouvel agenda comme courant (récupère depuis la liste rechargée)
            if (setCurrent) {
                const newAgenda = this.agendas.find(a => a.id === created.id);
                console.log('🔍 Nouvel agenda trouvé:', newAgenda);
                if (newAgenda) {
                    this.currentAgenda = newAgenda;
                    this.selectedAgendas = this.selectedAgendas.filter(id => id !== newAgenda.id);
                    console.log('✅ CurrentAgenda mis à jour:', this.currentAgenda);
                    this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
                    this.updateOverlayMenu();
                }
            }

            return created;
        } catch (error) {
            console.error('Erreur création agenda:', error);
            alert(ERROR_MESSAGES.AGENDA.CREATE_FAILED);
            return null;
        }
    }


    // Change l'agenda principal actuellement affiché
    // prend en paramettre agenda pour le nouvel agenda à afficher
     
    switchAgenda(agenda) {
        // Retire l'ancien agenda principal des agendas sélectionnés s'il y était
        if (this.currentAgenda) {
            this.selectedAgendas = this.selectedAgendas.filter(id => id !== this.currentAgenda.id);
        }
        
        // Définit le nouvel agenda principal
        this.currentAgenda = agenda;
        
        // Retire le nouvel agenda des sélections si présent
        this.selectedAgendas = this.selectedAgendas.filter(id => id !== agenda.id);
        
        // Mett à jour le menu overlay
        this.updateOverlayMenu();
    }

    
    // Toggle la superposition d'un agenda (checkbox dans le menu overlay)
    // prend en paramettre agendaId - ID de l'agenda à ajouter/retirer de la superposition
    // retourne un bool true si l'agenda est maintenant visible, false sinon
     
    toggleAgendaOverlay(agendaId) {
        const index = this.selectedAgendas.indexOf(agendaId);
        
        if (index > -1) {
            // L'agenda est déjà sélectionné, le retirer
            this.selectedAgendas.splice(index, 1);
            return false;
        } else {
            // Ajoute l'agenda à la sélection
            this.selectedAgendas.push(agendaId);
            return true;
        }
    }

    
    // Met à jour le menu de superposition des agendas (checkboxes)
    // Affiche tous les agendas sauf l'agenda principal
    
    updateOverlayMenu() {
        const overlayList = document.getElementById('agenda-overlay-list');
        if (!overlayList) {
            console.error('❌ Element #agenda-overlay-list non trouvé');
            return;
        }

        // Vide la liste
        overlayList.innerHTML = '';

        // Filtre pour exclure l'agenda principal
        const otherAgendas = this.agendas.filter(a => 
            !this.currentAgenda || a.id !== this.currentAgenda.id
        );

        if (otherAgendas.length === 0) {
            overlayList.innerHTML = '<li style="padding: 10px; color: #666;">Aucun autre agenda</li>';
            return;
        }

        // Crée une checkbox pour chaque agenda
        otherAgendas.forEach(agenda => {
            
            const li = document.createElement('div');
            li.className = 'agenda-overlay-item';
            if (this.selectedAgendas.includes(agenda.id)) {
                li.classList.add('selected');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `overlay-${agenda.id}`;
            checkbox.checked = this.selectedAgendas.includes(agenda.id);
            
            // Callback au changement de la checkbox
            checkbox.addEventListener('change', (e) => {
                const isChecked = this.toggleAgendaOverlay(agenda.id);
                e.target.checked = isChecked;
                
                // Met à jour la classe selected
                if (isChecked) {
                    li.classList.add('selected');
                } else {
                    li.classList.remove('selected');
                }
                
                // Déclenche l'événement pour notifier App.js de recharger les événements
                const event = new CustomEvent('agendaOverlayChanged', {
                    detail: { agendaId: agenda.id, isVisible: isChecked }
                });
                document.dispatchEvent(event);
            });

            const label = document.createElement('label');
            label.htmlFor = `overlay-${agenda.id}`;
            label.textContent = agenda.name;

            li.appendChild(checkbox);
            li.appendChild(label);
            overlayList.appendChild(li);
        });
    }

    
    // Initialise l'affichage par défaut avec le premier agenda et les jours fériés
     
    async initializeDefaultView() {
        if (this.agendas.length === 0) {
            console.warn('Aucun agenda disponible');
            return;
        }

        // Sélectionne le premier agenda comme agenda principal
        this.currentAgenda = this.agendas[0];

        // Ajoute automatiquement les jours fériés en superposition
        const holidaysAgenda = this.agendas.find(a => a.name === HOLIDAYS_AGENDA_NAME);
        if (holidaysAgenda && !this.selectedAgendas.includes(holidaysAgenda.id)) {
            this.selectedAgendas.push(holidaysAgenda.id);
        }

        // Met à jour l'affichage
        this.updateOverlayMenu();
    }

    
    // Obtient la liste de tous les agendas visibles (principal + superposés)
    // retouen une liste des IDs d'agendas visibles
     
    getVisibleAgendaIds() {
        const visibleIds = [...this.selectedAgendas];
        if (this.currentAgenda) {
            visibleIds.push(this.currentAgenda.id);
        }
        
        // Élimine les doublons
        return [...new Set(visibleIds)];
    }

    
    // Trouve un agenda par son ID
    // prend en paramettre agendaId - ID de l'agenda recherché
    // retourne l'agenda trouvé ou null
     
    getAgendaById(agendaId) {
        return this.agendas.find(a => a.id === agendaId) || null;
    }

    
    // Obtient l'agenda principal actuel
    // retoune l'agenda courant
     
    getCurrentAgenda() {
        return this.currentAgenda;
    }

    
    // Obtient tous les agendas chargés
    // retourne une liste de tous les agendas
    
    getAllAgendas() {
        return this.agendas;
    }

    // Exporte l'agenda courant en JSON et déclenche le téléchargement d'un fichier .json
    // Retourne la chaîne JSON produite ou null en cas d'erreur
    async exportCurrentAgendaToFile() {
        console.log('Export agenda courant en JSON');
        if (!this.currentAgenda) {
            alert('Aucun agenda courant à exporter.');
            return null;
        }

        try {
            const payload = { agenda: this.currentAgenda };

            // Récupère les événements de l'agenda via eventController ou eventService
            if (this.eventController?.eventService) {
                try {
                    const events = await this.eventController.eventService.fetchByAgenda(this.currentAgenda.id);
                    payload.events = events;
                } catch (e) {
                    console.warn('Impossible de récupérer les événements pour export :', e);
                }
            } else {
                console.warn('EventController non disponible pour l\'export');
            }

            const json = JSON.stringify(payload, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const filename = `${(this.currentAgenda.name || 'agenda')}.json`;

            // Support IE/Edge
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(blob, filename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            }

            return json;
        } catch (error) {
            console.error('Erreur export agenda :', error);
            alert('Erreur lors de l\'export de l\'agenda.');
            return null;
        }
    }

    // Importe un agenda depuis une chaîne JSON.
    // Si createNew = true et que agendaService.create existe, crée un nouvel agenda et ajoute les événements si possible.
    // Sinon émet un CustomEvent 'agendaJsonImported' avec le payload pour que l'application gère l'import.
    async importAgendaFromJson(jsonString, { createNew = true, sourceFilename = null } = {}) {
        try {
            const data = JSON.parse(jsonString);

            const filenameName = sourceFilename ? String(sourceFilename).replace(/\.[^/.]+$/, '') : null;
            let name = filenameName || data?.agenda?.name || data?.name;

            if (!name) {
                alert('Fichier JSON invalide : nom d\'agenda manquant.');
                return null;
            }

            if (name.length > 15) {
                console.warn('Nom d\'agenda trop long, tronqué à 15 caractères.');
                name = name.slice(0, 15);
            }

            // Supporte events à la racine ou sous agenda.events
            const events = Array.isArray(data.events) ? data.events
                         : Array.isArray(data?.agenda?.events) ? data.agenda.events
                         : [];

            if (createNew && this.agendaService && typeof this.agendaService.create === 'function') {
                // Récupère la couleur de l'agenda exporté, ou utilise la couleur par défaut
                const agendaColor = data?.agenda?.color || THEME_COLORS.DEFAULT_AGENDA;
                
                // Utilise la fonction createAgenda locale pour créer l'agenda,
                // sans remplacer l'agenda courant (setCurrent: false)
                const created = await this.createAgenda(name, agendaColor, { setCurrent: false });

                // assure un id pour created (si backend ne renvoie pas d'id)
                let createdId = created && created.id ? created.id : null;
                if (!createdId) {
                    // recharger agendas pour récupérer l'objet créé côté serveur si possible
                    await this.loadAgendas();
                    const found = this.agendas.find(a => a.name === name);
                    if (found && found.id) createdId = found.id;
                }
                if (!createdId) {
                    // fallback id côté client (unique local)
                    createdId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `local-${Date.now()}-${Math.floor(Math.random()*1000000)}`;
                    if (created) created.id = createdId;
                }

                const failed = [];
                
                if (events.length > 0 && (typeof this.eventController?.createEvent === 'function' || typeof this.agendaService.createEvent === 'function')) {
                    for (const ev of events) {
                        // sanitize / normalise
                        const payload = {
                            title: ev.title || ev.summary || ev.name || 'Sans titre',
                            start: ev.start || ev.startDate || ev.begin || null,
                            end: ev.end || ev.endDate || ev.finish || null,
                            description: ev.description ?? ev.extendedProps?.description ?? ev.desc ?? '',
                            emoji: ev.emoji ?? ev.icon ?? null,
                            recurrence: ev.recurrence ?? { type: 'none' },
                            allDay: ev.allDay ?? ev.all_day ?? undefined,
                            location: ev.location ?? ev.place ?? undefined
                        };
                        Object.keys(payload).forEach(k => payload[k] == null && delete payload[k]);

                        try {
                            // Si on a un EventController, appeler createEvent avec agendaId dans l'objet
                            if (typeof this.eventController?.createEvent === 'function') {
                                await this.eventController.createEvent({ ...payload, agendaId: createdId });
                            } else {
                                // Fallback : agendaService.createEvent(agendaId, payload) si c'est l'API attendue
                                await this.agendaService.createEvent(createdId, payload);
                            }
                        } catch (e) {
                            console.warn('Échec création événement importé:', e, payload);
                            failed.push({ error: e?.message || String(e), event: payload });
                        }
                    }
                } else {
                    console.info('Aucun événement à importer ou createEvent non disponible.');
                }

                await this.loadAgendas();
                
                // Sélectionne automatiquement l'agenda importé
                const importedAgenda = this.agendas.find(a => a.id === createdId);
                if (importedAgenda) {
                    this.switchAgenda(importedAgenda);
                }
                
                this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
                this.updateOverlayMenu();

                if (failed.length > 0) {
                    console.warn(`${failed.length} événement(s) n'ont pas été importé(s). Voir console pour détails.`, failed);
                    alert(`${failed.length} événement(s) n'ont pas pu être importés (voir console).`);
                }

                return created;
            } else {
                const event = new CustomEvent('agendaJsonImported', { detail: data });
                document.dispatchEvent(event);
                return data;
            }
        } catch (error) {
            console.error('Erreur import JSON agenda :', error);
            alert('Erreur lors de l\'import du fichier JSON.');
            return null;
        }
    }

    // Lit un File (input type="file") et lance l'import
    // Le nom du fichier est transmis pour nommer le nouvel agenda
    // Retourne la valeur renvoyée par importAgendaFromJson ou null
    async importAgendaFromFile(file) {
        if (!file) {
            alert('Aucun fichier sélectionné pour l\'import.');
            return null;
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const result = await this.importAgendaFromJson(String(e.target.result), { createNew: true, sourceFilename: file.name });
                resolve(result);
            };
            reader.onerror = (e) => {
                console.error('Erreur lecture fichier import :', e);
                alert('Impossible de lire le fichier sélectionné.');
                resolve(null);
            };
            reader.readAsText(file, 'utf-8');
        });
    }
}
