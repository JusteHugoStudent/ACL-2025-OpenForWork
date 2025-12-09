// Extension pour les fonctionnalités d'import/export des agendas
// Mixé avec AgendaController via Object.assign ou héritage

const AgendaImportExportMixin = {

    // ========================================
    // EXPORT
    // ========================================

    /**
     * Exporte l'agenda courant en JSON et déclenche le téléchargement
     * @returns {Promise<string|null>} JSON produit ou null
     */
    async exportCurrentAgendaToFile() {
        console.log('Export agenda courant en JSON');
        if (!this.currentAgenda) {
            Toast.warning('Aucun agenda courant à exporter.');
            return null;
        }

        try {
            const agendaData = {
                id: this.currentAgenda.id,
                name: this.currentAgenda.name,
                color: this.currentAgenda.color
            };

            const payload = { agenda: agendaData, events: [] };

            if (this.eventController?.eventService) {
                try {
                    const rawEvents = await this.eventController.eventService.fetchByAgenda(this.currentAgenda.id);
                    payload.events = this._formatEventsForExport(rawEvents);
                } catch (e) {
                    console.warn('Impossible de récupérer les événements pour export :', e);
                }
            }

            const json = JSON.stringify(payload, null, 2);
            this._downloadJson(json, `${this.currentAgenda.name || 'agenda'}.json`);

            return json;
        } catch (error) {
            console.error('Erreur export agenda :', error);
            Toast.error('Erreur lors de l\'export de l\'agenda.');
            return null;
        }
    },

    /**
     * Exporte un agenda spécifique par son ID
     * @param {string} agendaId - ID de l'agenda à exporter
     * @returns {Promise<string|null>} JSON produit ou null
     */
    async exportAgendaById(agendaId) {
        const agenda = this.agendas.find(a => a.id === agendaId);
        if (!agenda) {
            console.error('Agenda non trouvé:', agendaId);
            return null;
        }

        try {
            const agendaData = {
                id: agenda.id,
                name: agenda.name,
                color: agenda.color
            };

            const payload = { agenda: agendaData, events: [] };

            if (this.eventController?.eventService) {
                try {
                    const rawEvents = await this.eventController.eventService.fetchByAgenda(agendaId);
                    payload.events = this._formatEventsForExport(rawEvents);
                } catch (e) {
                    console.warn('Erreur récupération événements:', e);
                }
            }

            const json = JSON.stringify(payload, null, 2);
            this._downloadJson(json, `${agenda.name || 'agenda'}.json`);
            return json;
        } catch (error) {
            console.error('Erreur export agenda:', error);
            return null;
        }
    },

    /**
     * Exporte plusieurs agendas fusionnés en un seul fichier
     * @param {string[]} agendaIds - Liste des IDs d'agendas à fusionner
     * @param {string} mergedName - Nom du fichier fusionné
     * @param {string} mergedColor - Couleur de l'agenda fusionné
     * @returns {Promise<string|null>} JSON produit ou null
     */
    async exportMergedAgendas(agendaIds, mergedName, mergedColor) {
        if (!agendaIds || agendaIds.length === 0) {
            Toast.warning('Aucun agenda sélectionné.');
            return null;
        }

        try {
            const payload = {
                agenda: {
                    id: 'merged-' + Date.now(),
                    name: mergedName || 'Agenda fusionné',
                    color: mergedColor || THEME_COLORS.DEFAULT_AGENDA
                },
                events: []
            };

            for (const agendaId of agendaIds) {
                if (this.eventController?.eventService) {
                    try {
                        const rawEvents = await this.eventController.eventService.fetchByAgenda(agendaId);
                        const cleanedEvents = this._formatEventsForExport(rawEvents);
                        payload.events.push(...cleanedEvents);
                    } catch (e) {
                        console.warn('Erreur récupération événements pour', agendaId, e);
                    }
                }
            }

            const json = JSON.stringify(payload, null, 2);
            this._downloadJson(json, `${mergedName || 'agenda-fusionné'}.json`);
            return json;
        } catch (error) {
            console.error('Erreur export fusionné:', error);
            Toast.error('Erreur lors de l\'export fusionné.');
            return null;
        }
    },

    /**
     * Formate les événements pour l'export (nettoie les champs inutiles)
     * @private
     */
    _formatEventsForExport(rawEvents) {
        return rawEvents.map(ev => ({
            id: ev.id,
            title: ev.title,
            start: ev.start,
            end: ev.end,
            allDay: ev.allDay || false,
            description: ev.description || ev.extendedProps?.description || '',
            emoji: ev.emoji || '📅',
            recurrence: ev.recurrence || { type: 'none' }
        }));
    },

    /**
     * Déclenche le téléchargement d'un fichier JSON
     * @private
     */
    _downloadJson(json, filename) {
        const blob = new Blob([json], { type: 'application/json' });

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
    },

    // ========================================
    // IMPORT
    // ========================================

    /**
     * Importe un agenda depuis une chaîne JSON
     * @param {string} jsonString - Contenu JSON
     * @param {Object} options - Options d'import
     * @returns {Promise<Object|null>} L'agenda créé ou null
     */
    async importAgendaFromJson(jsonString, { createNew = true, sourceFilename = null, customName = null, customColor = null } = {}) {
        try {
            const data = JSON.parse(jsonString);

            const filenameName = sourceFilename ? String(sourceFilename).replace(/\.[^/.]+$/, '') : null;
            let name = customName || filenameName || data?.agenda?.name || data?.name;

            if (!name) {
                Toast.error('Fichier JSON invalide : nom d\'agenda manquant.');
                return null;
            }

            if (name.length > 15) {
                console.warn('Nom d\'agenda trop long, tronqué à 15 caractères.');
                name = name.slice(0, 15);
            }

            const events = Array.isArray(data.events) ? data.events
                : Array.isArray(data?.agenda?.events) ? data.agenda.events
                    : [];

            if (createNew && this.agendaService && typeof this.agendaService.create === 'function') {
                const agendaColor = customColor || data?.agenda?.color || THEME_COLORS.DEFAULT_AGENDA;
                const created = await this.createAgenda(name, agendaColor, { setCurrent: false });

                let createdId = created && created.id ? created.id : null;
                if (!createdId) {
                    await this.loadAgendas();
                    const found = this.agendas.find(a => a.name === name);
                    if (found && found.id) createdId = found.id;
                }
                if (!createdId) {
                    createdId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `local-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
                    if (created) created.id = createdId;
                }

                const failed = await this._importEvents(events, createdId);

                await this.loadAgendas();

                const importedAgenda = this.agendas.find(a => a.id === createdId);
                if (importedAgenda) {
                    this.switchAgenda(importedAgenda);
                }

                this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
                this.updateOverlayMenu();

                if (failed.length > 0) {
                    console.warn(`${failed.length} événement(s) n'ont pas été importé(s).`, failed);
                    Toast.warning(`${failed.length} événement(s) n'ont pas pu être importés (voir console).`);
                }

                return created;
            } else {
                const event = new CustomEvent('agendaJsonImported', { detail: data });
                document.dispatchEvent(event);
                return data;
            }
        } catch (error) {
            console.error('Erreur import JSON agenda :', error);
            Toast.error('Erreur lors de l\'import du fichier JSON.');
            return null;
        }
    },

    /**
     * Lit un File et lance l'import
     * @param {File} file - Fichier à importer
     * @returns {Promise<Object|null>} Résultat de l'import
     */
    async importAgendaFromFile(file) {
        if (!file) {
            Toast.warning('Aucun fichier sélectionné pour l\'import.');
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
                Toast.error('Impossible de lire le fichier sélectionné.');
                resolve(null);
            };
            reader.readAsText(file, 'utf-8');
        });
    },

    /**
     * Fusionne les événements d'un fichier JSON dans un agenda existant
     * @param {string} jsonString - Contenu JSON du fichier
     * @param {string} targetAgendaId - ID de l'agenda cible
     * @returns {Promise<Object>} Résultat de la fusion
     */
    async mergeEventsToAgenda(jsonString, targetAgendaId) {
        try {
            const data = JSON.parse(jsonString);

            const targetAgenda = this.agendas.find(a => a.id === targetAgendaId);
            if (!targetAgenda) {
                Toast.error('Agenda cible introuvable.');
                return { success: false, addedCount: 0, failedCount: 0 };
            }

            const events = Array.isArray(data.events) ? data.events
                : Array.isArray(data?.agenda?.events) ? data.agenda.events
                    : [];

            if (events.length === 0) {
                Toast.info('Aucun événement à importer dans ce fichier.');
                return { success: true, addedCount: 0, failedCount: 0 };
            }

            const failed = await this._importEvents(events, targetAgendaId);
            const addedCount = events.length - failed.length;

            await this.loadAgendas();
            this.switchAgenda(targetAgenda);
            this.headerView.updateAgendaSelector(this.agendas, this.currentAgenda);
            this.updateOverlayMenu();

            return { success: true, addedCount, failedCount: failed.length };
        } catch (error) {
            console.error('Erreur fusion événements :', error);
            Toast.error('Erreur lors de la fusion des événements.');
            return { success: false, addedCount: 0, failedCount: 0 };
        }
    },

    /**
     * Parse un fichier JSON d'import et retourne les données
     * @param {File} file - Fichier à lire
     * @returns {Promise<Object|null>} Données parsées ou null
     */
    async parseImportFile(file) {
        if (!file) return null;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(String(e.target.result));
                    data._rawJson = String(e.target.result);
                    data._filename = file.name;
                    resolve(data);
                } catch (err) {
                    console.error('Erreur parsing JSON:', err);
                    Toast.error('Fichier JSON invalide.');
                    resolve(null);
                }
            };
            reader.onerror = () => {
                Toast.error('Impossible de lire le fichier.');
                resolve(null);
            };
            reader.readAsText(file, 'utf-8');
        });
    },

    /**
     * Importe une liste d'événements dans un agenda
     * @private
     */
    async _importEvents(events, agendaId) {
        const failed = [];

        if (events.length > 0 && typeof this.eventController?.createEvent === 'function') {
            for (const ev of events) {
                const payload = {
                    title: ev.title || ev.summary || ev.name || 'Sans titre',
                    start: ev.start || ev.startDate || ev.begin || null,
                    end: ev.end || ev.endDate || ev.finish || null,
                    description: ev.description ?? ev.extendedProps?.description ?? ev.desc ?? '',
                    emoji: ev.emoji ?? ev.icon ?? null,
                    recurrence: ev.recurrence ?? { type: 'none' },
                    allDay: ev.allDay ?? ev.all_day ?? undefined,
                    agendaId: agendaId
                };
                Object.keys(payload).forEach(k => payload[k] == null && delete payload[k]);

                try {
                    await this.eventController.createEvent(payload);
                } catch (e) {
                    console.warn('Échec création événement importé:', e, payload);
                    failed.push({ error: e?.message || String(e), event: payload });
                }
            }
        }

        return failed;
    }
};

// Applique le mixin à AgendaController
Object.assign(AgendaController.prototype, AgendaImportExportMixin);

// Alias pour compatibilité arrière avec App.js et autres fichiers
const AgendaControllerFront = AgendaController;
