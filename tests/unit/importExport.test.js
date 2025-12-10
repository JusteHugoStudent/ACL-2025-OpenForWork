// Tests unitaires pour les fonctionnalités d'import/export des agendas
// Ces tests vérifient la logique de parsing, validation et formatage

describe('AgendaImportExport', () => {

    // ============================================
    // HELPERS DE TEST
    // ============================================

    // Structure JSON valide pour l'import
    const createValidExportJson = (overrides = {}) => ({
        agenda: {
            name: 'Mon Agenda',
            color: '#3498db',
            ...overrides.agenda
        },
        events: overrides.events || [
            {
                title: 'Événement 1',
                start: '2025-12-25T10:00:00.000Z',
                end: '2025-12-25T11:00:00.000Z',
                description: 'Description test',
                emoji: '📅'
            }
        ],
        exportDate: overrides.exportDate || new Date().toISOString(),
        version: overrides.version || '1.0'
    });

    // ============================================
    // VALIDATION DU FORMAT JSON
    // ============================================

    describe('Validation du format JSON', () => {

        function validateImportJson(jsonString) {
            try {
                const data = JSON.parse(jsonString);
                const errors = [];

                // Vérifier la présence des champs requis
                if (!data.agenda) {
                    errors.push('Champ "agenda" manquant');
                } else {
                    if (!data.agenda.name || typeof data.agenda.name !== 'string') {
                        errors.push('Nom d\'agenda manquant ou invalide');
                    }
                    if (data.agenda.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(data.agenda.color)) {
                        errors.push('Couleur d\'agenda invalide');
                    }
                }

                if (!data.events || !Array.isArray(data.events)) {
                    errors.push('Champ "events" manquant ou invalide');
                } else {
                    data.events.forEach((event, index) => {
                        if (!event.title) {
                            errors.push(`Événement ${index + 1}: titre manquant`);
                        }
                        if (!event.start) {
                            errors.push(`Événement ${index + 1}: date de début manquante`);
                        }
                    });
                }

                return {
                    valid: errors.length === 0,
                    errors,
                    data: errors.length === 0 ? data : null
                };
            } catch (e) {
                return {
                    valid: false,
                    errors: ['JSON invalide: ' + e.message],
                    data: null
                };
            }
        }

        it('devrait valider un JSON d\'export correct', () => {
            const json = JSON.stringify(createValidExportJson());
            const result = validateImportJson(json);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.data).toBeDefined();
        });

        it('devrait rejeter un JSON invalide', () => {
            const result = validateImportJson('not valid json');

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('JSON invalide');
        });

        it('devrait rejeter un JSON sans champ agenda', () => {
            const json = JSON.stringify({ events: [] });
            const result = validateImportJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Champ "agenda" manquant');
        });

        it('devrait rejeter un JSON sans nom d\'agenda', () => {
            const json = JSON.stringify({ agenda: { color: '#FFF' }, events: [] });
            const result = validateImportJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Nom d\'agenda manquant ou invalide');
        });

        it('devrait rejeter un JSON avec couleur invalide', () => {
            const json = JSON.stringify({
                agenda: { name: 'Test', color: 'rouge' },
                events: []
            });
            const result = validateImportJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Couleur d\'agenda invalide');
        });

        it('devrait rejeter un JSON sans champ events', () => {
            const json = JSON.stringify({ agenda: { name: 'Test' } });
            const result = validateImportJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Champ "events" manquant ou invalide');
        });

        it('devrait rejeter un événement sans titre', () => {
            const json = JSON.stringify({
                agenda: { name: 'Test' },
                events: [{ start: '2025-01-01T10:00:00Z' }]
            });
            const result = validateImportJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Événement 1: titre manquant');
        });

        it('devrait rejeter un événement sans date de début', () => {
            const json = JSON.stringify({
                agenda: { name: 'Test' },
                events: [{ title: 'Test Event' }]
            });
            const result = validateImportJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Événement 1: date de début manquante');
        });

        it('devrait accepter un agenda sans événements', () => {
            const json = JSON.stringify({
                agenda: { name: 'Test' },
                events: []
            });
            const result = validateImportJson(json);

            expect(result.valid).toBe(true);
        });
    });

    // ============================================
    // FORMATAGE DES ÉVÉNEMENTS POUR L'EXPORT
    // ============================================

    describe('Formatage des événements pour l\'export', () => {

        function formatEventsForExport(rawEvents) {
            return rawEvents.map(event => {
                const formatted = {
                    title: event.title,
                    start: event.start,
                    end: event.end,
                    description: event.description || '',
                    emoji: event.emoji || '📅',
                    allDay: event.allDay || false
                };

                // Inclure la récurrence si présente et active
                if (event.recurrence && event.recurrence.type !== 'none') {
                    formatted.recurrence = {
                        type: event.recurrence.type,
                        interval: event.recurrence.interval || 1,
                        endDate: event.recurrence.endDate || null,
                        daysOfWeek: event.recurrence.daysOfWeek || null
                    };
                }

                return formatted;
            });
        }

        it('devrait formater un événement simple', () => {
            const rawEvents = [{
                _id: 'evt-1',
                title: 'Réunion',
                start: '2025-01-01T10:00:00Z',
                end: '2025-01-01T11:00:00Z',
                userId: 'user-123', // Champ interne
                agendaId: 'agenda-1' // Champ interne
            }];

            const formatted = formatEventsForExport(rawEvents);

            expect(formatted[0]).toEqual({
                title: 'Réunion',
                start: '2025-01-01T10:00:00Z',
                end: '2025-01-01T11:00:00Z',
                description: '',
                emoji: '📅',
                allDay: false
            });
            expect(formatted[0]._id).toBeUndefined();
            expect(formatted[0].userId).toBeUndefined();
            expect(formatted[0].agendaId).toBeUndefined();
        });

        it('devrait conserver la récurrence active', () => {
            const rawEvents = [{
                title: 'Hebdo',
                start: '2025-01-06T10:00:00Z',
                end: '2025-01-06T11:00:00Z',
                recurrence: {
                    type: 'weekly',
                    interval: 1,
                    daysOfWeek: [1, 3, 5],
                    endDate: '2025-12-31'
                }
            }];

            const formatted = formatEventsForExport(rawEvents);

            expect(formatted[0].recurrence).toEqual({
                type: 'weekly',
                interval: 1,
                daysOfWeek: [1, 3, 5],
                endDate: '2025-12-31'
            });
        });

        it('devrait ignorer la récurrence "none"', () => {
            const rawEvents = [{
                title: 'Simple',
                start: '2025-01-01T10:00:00Z',
                end: '2025-01-01T11:00:00Z',
                recurrence: { type: 'none' }
            }];

            const formatted = formatEventsForExport(rawEvents);

            expect(formatted[0].recurrence).toBeUndefined();
        });

        it('devrait conserver l\'emoji personnalisé', () => {
            const rawEvents = [{
                title: 'Fête',
                start: '2025-01-01T10:00:00Z',
                end: '2025-01-01T11:00:00Z',
                emoji: '🎉'
            }];

            const formatted = formatEventsForExport(rawEvents);

            expect(formatted[0].emoji).toBe('🎉');
        });

        it('devrait définir l\'emoji par défaut si absent', () => {
            const rawEvents = [{
                title: 'Sans emoji',
                start: '2025-01-01T10:00:00Z',
                end: '2025-01-01T11:00:00Z'
            }];

            const formatted = formatEventsForExport(rawEvents);

            expect(formatted[0].emoji).toBe('📅');
        });

        it('devrait gérer les événements journée entière', () => {
            const rawEvents = [{
                title: 'Jour férié',
                start: '2025-01-01',
                end: '2025-01-02',
                allDay: true
            }];

            const formatted = formatEventsForExport(rawEvents);

            expect(formatted[0].allDay).toBe(true);
        });
    });

    // ============================================
    // NORMALISATION DES DONNÉES D'IMPORT
    // ============================================

    describe('Normalisation des données d\'import', () => {

        function normalizeImportedEvent(event) {
            return {
                title: (event.title || event.summary || event.name || 'Sans titre').slice(0, 200),
                start: event.start || event.startDate || event.begin,
                end: event.end || event.endDate || event.finish || event.start,
                description: (event.description || event.desc || '').slice(0, 1000),
                emoji: event.emoji || event.icon || '📅',
                allDay: event.allDay ?? event.all_day ?? false,
                recurrence: event.recurrence || { type: 'none' }
            };
        }

        it('devrait normaliser les alias de champs', () => {
            const event = {
                summary: 'Titre alternatif',
                startDate: '2025-01-01T10:00:00Z',
                endDate: '2025-01-01T11:00:00Z',
                desc: 'Description courte'
            };

            const normalized = normalizeImportedEvent(event);

            expect(normalized.title).toBe('Titre alternatif');
            expect(normalized.start).toBe('2025-01-01T10:00:00Z');
            expect(normalized.end).toBe('2025-01-01T11:00:00Z');
            expect(normalized.description).toBe('Description courte');
        });

        it('devrait tronquer un titre trop long', () => {
            const event = {
                title: 'a'.repeat(250),
                start: '2025-01-01T10:00:00Z'
            };

            const normalized = normalizeImportedEvent(event);

            expect(normalized.title.length).toBe(200);
        });

        it('devrait tronquer une description trop longue', () => {
            const event = {
                title: 'Test',
                start: '2025-01-01T10:00:00Z',
                description: 'a'.repeat(1500)
            };

            const normalized = normalizeImportedEvent(event);

            expect(normalized.description.length).toBe(1000);
        });

        it('devrait utiliser la date de début comme date de fin si absente', () => {
            const event = {
                title: 'Test',
                start: '2025-01-01T10:00:00Z'
            };

            const normalized = normalizeImportedEvent(event);

            expect(normalized.end).toBe('2025-01-01T10:00:00Z');
        });

        it('devrait définir "Sans titre" si titre manquant', () => {
            const event = {
                start: '2025-01-01T10:00:00Z'
            };

            const normalized = normalizeImportedEvent(event);

            expect(normalized.title).toBe('Sans titre');
        });

        it('devrait gérer le champ allDay avec différents formats', () => {
            const event1 = { title: 'T1', start: '2025-01-01', allDay: true };
            const event2 = { title: 'T2', start: '2025-01-01', all_day: true };

            expect(normalizeImportedEvent(event1).allDay).toBe(true);
            expect(normalizeImportedEvent(event2).allDay).toBe(true);
        });
    });

    // ============================================
    // GÉNÉRATION DU NOM DE FICHIER
    // ============================================

    describe('Génération du nom de fichier', () => {

        function generateExportFilename(agendaName) {
            const safeName = agendaName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            const date = new Date().toISOString().split('T')[0];
            return `${safeName}_${date}.json`;
        }

        it('devrait générer un nom de fichier valide', () => {
            const filename = generateExportFilename('Mon Agenda');

            expect(filename).toMatch(/^mon-agenda_\d{4}-\d{2}-\d{2}\.json$/);
        });

        it('devrait remplacer les caractères spéciaux', () => {
            const filename = generateExportFilename('Agenda (Perso) #1');

            expect(filename).toMatch(/^agenda-perso-1_\d{4}-\d{2}-\d{2}\.json$/);
        });

        it('devrait supprimer les tirets en début et fin', () => {
            const filename = generateExportFilename('---Test---');

            expect(filename).toMatch(/^test_\d{4}-\d{2}-\d{2}\.json$/);
        });

        it('devrait gérer les accents', () => {
            const filename = generateExportFilename('Événements Été');

            // Les accents sont remplacés par des tirets
            expect(filename).toMatch(/\.json$/);
            expect(filename).not.toContain('é');
        });
    });

    // ============================================
    // FUSION D'AGENDAS
    // ============================================

    describe('Fusion d\'agendas', () => {

        function mergeAgendas(agendas) {
            const allEvents = [];
            agendas.forEach(agenda => {
                agenda.events.forEach(event => {
                    allEvents.push({
                        ...event,
                        sourceAgenda: agenda.name
                    });
                });
            });
            return allEvents;
        }

        it('devrait fusionner les événements de plusieurs agendas', () => {
            const agendas = [
                { name: 'Perso', events: [{ title: 'E1' }, { title: 'E2' }] },
                { name: 'Travail', events: [{ title: 'E3' }] }
            ];

            const merged = mergeAgendas(agendas);

            expect(merged).toHaveLength(3);
        });

        it('devrait ajouter la source de chaque événement', () => {
            const agendas = [
                { name: 'Perso', events: [{ title: 'E1' }] },
                { name: 'Travail', events: [{ title: 'E2' }] }
            ];

            const merged = mergeAgendas(agendas);

            expect(merged[0].sourceAgenda).toBe('Perso');
            expect(merged[1].sourceAgenda).toBe('Travail');
        });

        it('devrait gérer un agenda vide', () => {
            const agendas = [
                { name: 'Vide', events: [] },
                { name: 'Plein', events: [{ title: 'E1' }] }
            ];

            const merged = mergeAgendas(agendas);

            expect(merged).toHaveLength(1);
        });

        it('devrait gérer des agendas sans événements', () => {
            const agendas = [
                { name: 'Vide1', events: [] },
                { name: 'Vide2', events: [] }
            ];

            const merged = mergeAgendas(agendas);

            expect(merged).toHaveLength(0);
        });
    });
});
