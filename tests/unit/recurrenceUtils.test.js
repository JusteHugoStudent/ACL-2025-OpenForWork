// Tests unitaires pour les utilitaires de récurrence
// Note: Ces fonctions sont côté frontend (src/utils/recurrenceUtils.js)

describe('recurrenceUtils', () => {
    // Réimplémentation des fonctions pour les tests

    function generateRecurringOccurrences(event, rangeStart, rangeEnd) {
        const occurrences = [];

        if (!event.recurrence || event.recurrence.type === 'none') {
            return [event];
        }

        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const duration = eventEnd - eventStart;

        const recurrence = event.recurrence;
        let recurrenceEnd;
        if (recurrence.endDate) {
            recurrenceEnd = new Date(recurrence.endDate);
            recurrenceEnd.setHours(23, 59, 59, 999);
        } else {
            recurrenceEnd = rangeEnd;
        }
        const interval = recurrence.interval || 1;

        let currentDate = new Date(eventStart);
        let occurrenceCount = 0;
        const MAX_OCCURRENCES = 1000;

        while (currentDate <= recurrenceEnd && currentDate <= rangeEnd && occurrenceCount < MAX_OCCURRENCES) {
            if (currentDate >= rangeStart) {
                if (recurrence.type === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
                    const dayOfWeek = currentDate.getDay();
                    if (recurrence.daysOfWeek.includes(dayOfWeek)) {
                        occurrences.push(createOccurrence(event, currentDate, duration, occurrenceCount));
                        occurrenceCount++;
                    }
                } else {
                    occurrences.push(createOccurrence(event, currentDate, duration, occurrenceCount));
                    occurrenceCount++;
                }
            }
            currentDate = getNextOccurrence(currentDate, recurrence.type, interval);
        }

        return occurrences;
    }

    function createOccurrence(event, startDate, duration, index) {
        const endDate = new Date(startDate.getTime() + duration);
        return {
            ...event,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            isRecurring: true,
            occurrenceIndex: index,
            originalEventId: event.id || event._id,
            originalStart: event.start,
            originalEnd: event.end
        };
    }

    function getNextOccurrence(currentDate, type, interval) {
        const nextDate = new Date(currentDate);
        switch (type) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + interval);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + interval);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + interval);
                break;
        }
        return nextDate;
    }

    function hasRecurrence(event) {
        if (!event || !event.recurrence) return false;
        return event.recurrence.type !== 'none';
    }

    function getRecurrenceDescription(recurrence) {
        if (!recurrence || recurrence.type === 'none') {
            return 'Aucune récurrence';
        }

        const descriptions = {
            daily: 'Tous les jours',
            weekly: 'Toutes les semaines',
            monthly: 'Tous les mois',
            yearly: 'Tous les ans'
        };

        let desc = descriptions[recurrence.type] || '';

        if (recurrence.type === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
            const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
            const days = recurrence.daysOfWeek.map(d => dayNames[d]).join(', ');
            desc += ` (${days})`;
        }

        if (recurrence.endDate) {
            const endDate = new Date(recurrence.endDate);
            desc += ` jusqu'au ${endDate.toLocaleDateString('fr-FR')}`;
        }

        return desc;
    }

    // ============================================
    // TESTS
    // ============================================

    describe('hasRecurrence', () => {
        it('devrait retourner false si pas de récurrence', () => {
            expect(hasRecurrence({})).toBe(false);
            expect(hasRecurrence({ recurrence: null })).toBe(false);
        });

        it('devrait retourner false si type est "none"', () => {
            expect(hasRecurrence({ recurrence: { type: 'none' } })).toBe(false);
        });

        it('devrait retourner true pour une récurrence active', () => {
            expect(hasRecurrence({ recurrence: { type: 'daily' } })).toBe(true);
            expect(hasRecurrence({ recurrence: { type: 'weekly' } })).toBe(true);
            expect(hasRecurrence({ recurrence: { type: 'monthly' } })).toBe(true);
            expect(hasRecurrence({ recurrence: { type: 'yearly' } })).toBe(true);
        });
    });

    describe('getRecurrenceDescription', () => {
        it('devrait retourner "Aucune récurrence" si pas de récurrence', () => {
            expect(getRecurrenceDescription(null)).toBe('Aucune récurrence');
            expect(getRecurrenceDescription(undefined)).toBe('Aucune récurrence');
            expect(getRecurrenceDescription({ type: 'none' })).toBe('Aucune récurrence');
        });

        it('devrait décrire la récurrence quotidienne', () => {
            expect(getRecurrenceDescription({ type: 'daily' })).toBe('Tous les jours');
        });

        it('devrait décrire la récurrence hebdomadaire', () => {
            expect(getRecurrenceDescription({ type: 'weekly' })).toBe('Toutes les semaines');
        });

        it('devrait décrire la récurrence hebdomadaire avec jours spécifiques', () => {
            const recurrence = { type: 'weekly', daysOfWeek: [1, 3, 5] };
            expect(getRecurrenceDescription(recurrence)).toBe('Toutes les semaines (Lun, Mer, Ven)');
        });

        it('devrait décrire la récurrence mensuelle', () => {
            expect(getRecurrenceDescription({ type: 'monthly' })).toBe('Tous les mois');
        });

        it('devrait décrire la récurrence annuelle', () => {
            expect(getRecurrenceDescription({ type: 'yearly' })).toBe('Tous les ans');
        });

        it('devrait inclure la date de fin si présente', () => {
            const recurrence = { type: 'daily', endDate: '2025-12-31' };
            const desc = getRecurrenceDescription(recurrence);
            expect(desc).toContain('Tous les jours');
            expect(desc).toContain("jusqu'au");
        });
    });

    describe('generateRecurringOccurrences', () => {
        const baseEvent = {
            id: 'event-1',
            title: 'Test Event',
            start: '2025-01-01T10:00:00.000Z',
            end: '2025-01-01T11:00:00.000Z'
        };

        describe('Sans récurrence', () => {
            it('devrait retourner l\'événement original si pas de récurrence', () => {
                const event = { ...baseEvent };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2025-01-31');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(1);
                expect(occurrences[0]).toEqual(event);
            });

            it('devrait retourner l\'événement original si type est "none"', () => {
                const event = { ...baseEvent, recurrence: { type: 'none' } };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2025-01-31');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(1);
            });
        });

        describe('Récurrence quotidienne', () => {
            it('devrait générer des occurrences quotidiennes', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'daily', interval: 1 }
                };
                const rangeStart = new Date('2025-01-01T00:00:00.000Z');
                const rangeEnd = new Date('2025-01-07T23:59:59.999Z');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(7);
                expect(occurrences[0].occurrenceIndex).toBe(0);
                expect(occurrences[6].occurrenceIndex).toBe(6);
            });

            it('devrait respecter la date de fin de récurrence', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'daily', interval: 1, endDate: '2025-01-03' }
                };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2025-01-31');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(3);
            });

            it('devrait gérer un intervalle > 1', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'daily', interval: 2 }
                };
                const rangeStart = new Date('2025-01-01T00:00:00.000Z');
                const rangeEnd = new Date('2025-01-07T23:59:59.999Z');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(4); // Jours 1, 3, 5, 7
            });
        });

        describe('Récurrence hebdomadaire', () => {
            it('devrait générer des occurrences pour les jours spécifiés', () => {
                const event = {
                    ...baseEvent,
                    start: '2025-01-06T10:00:00.000Z', // Lundi
                    end: '2025-01-06T11:00:00.000Z',
                    recurrence: { type: 'weekly', daysOfWeek: [1] } // Lundi seulement
                };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2025-01-31');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                // 4 lundis en janvier 2025 (6, 13, 20, 27)
                expect(occurrences.length).toBeGreaterThanOrEqual(4);
                occurrences.forEach(occ => {
                    const date = new Date(occ.start);
                    expect(date.getDay()).toBe(1); // Lundi
                });
            });

            it('devrait gérer plusieurs jours par semaine', () => {
                const event = {
                    ...baseEvent,
                    start: '2025-01-06T10:00:00.000Z', // Lundi
                    end: '2025-01-06T11:00:00.000Z',
                    recurrence: { type: 'weekly', daysOfWeek: [1, 3, 5] } // Lun, Mer, Ven
                };
                const rangeStart = new Date('2025-01-06T00:00:00.000Z');
                const rangeEnd = new Date('2025-01-12T23:59:59.999Z'); // Une semaine

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(3);
            });
        });

        describe('Récurrence mensuelle', () => {
            it('devrait générer des occurrences mensuelles', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'monthly', interval: 1 }
                };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2025-06-30');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(6); // Jan, Fév, Mar, Avr, Mai, Juin
            });
        });

        describe('Récurrence annuelle', () => {
            it('devrait générer des occurrences annuelles', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'yearly', interval: 1 }
                };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2027-12-31');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences).toHaveLength(3); // 2025, 2026, 2027
            });
        });

        describe('Propriétés des occurrences', () => {
            it('devrait marquer les occurrences comme récurrentes', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'daily' }
                };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2025-01-03');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                occurrences.forEach(occ => {
                    expect(occ.isRecurring).toBe(true);
                    expect(occ.originalEventId).toBe('event-1');
                    expect(occ.originalStart).toBe(baseEvent.start);
                    expect(occ.originalEnd).toBe(baseEvent.end);
                });
            });

            it('devrait conserver la durée de l\'événement', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'daily' }
                };
                const rangeStart = new Date('2025-01-01');
                const rangeEnd = new Date('2025-01-03');

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                occurrences.forEach(occ => {
                    const start = new Date(occ.start);
                    const end = new Date(occ.end);
                    const duration = end - start;
                    expect(duration).toBe(60 * 60 * 1000); // 1 heure
                });
            });
        });

        describe('Limites de sécurité', () => {
            it('devrait limiter le nombre d\'occurrences à 1000', () => {
                const event = {
                    ...baseEvent,
                    recurrence: { type: 'daily' }
                };
                const rangeStart = new Date('2020-01-01');
                const rangeEnd = new Date('2030-12-31'); // 10+ ans

                const occurrences = generateRecurringOccurrences(event, rangeStart, rangeEnd);

                expect(occurrences.length).toBeLessThanOrEqual(1000);
            });
        });
    });
});
