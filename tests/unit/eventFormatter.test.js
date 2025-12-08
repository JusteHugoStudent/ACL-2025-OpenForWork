// Tests unitaires pour les utilitaires de formatage des événements

const { formatEventDates, formatEventResponse, formatEventForCalendar } = require('../../server/utils/eventFormatter');

describe('eventFormatter', () => {

    describe('formatEventDates', () => {
        it('devrait formater un événement all-day en YYYY-MM-DD', () => {
            const event = {
                start: new Date('2025-12-25T12:00:00.000Z'),
                end: new Date('2025-12-25T12:00:00.000Z'),
                allDay: true
            };

            const result = formatEventDates(event);

            expect(result.start).toBe('2025-12-25');
            expect(result.end).toBe('2025-12-25');
            expect(result.isAllDay).toBe(true);
        });

        it('devrait garder les dates complètes pour un événement avec heures', () => {
            const startDate = new Date('2025-12-25T14:00:00.000Z');
            const endDate = new Date('2025-12-25T16:00:00.000Z');
            const event = {
                start: startDate,
                end: endDate,
                allDay: false
            };

            const result = formatEventDates(event);

            expect(result.start).toEqual(startDate);
            expect(result.end).toEqual(endDate);
            expect(result.isAllDay).toBe(false);
        });

        it('devrait traiter allDay undefined comme false', () => {
            const event = {
                start: new Date('2025-12-25T14:00:00.000Z'),
                end: new Date('2025-12-25T16:00:00.000Z')
            };

            const result = formatEventDates(event);

            expect(result.isAllDay).toBe(false);
        });
    });

    describe('formatEventResponse', () => {
        it('devrait formater un événement complet pour la réponse API', () => {
            const event = {
                _id: '12345',
                title: 'Réunion',
                start: new Date('2025-12-25T14:00:00.000Z'),
                end: new Date('2025-12-25T16:00:00.000Z'),
                allDay: false,
                description: 'Description test',
                emoji: '📅',
                recurrence: { type: 'none' }
            };

            const result = formatEventResponse(event, 'agenda123');

            expect(result.id).toBe('12345');
            expect(result.title).toBe('Réunion');
            expect(result.description).toBe('Description test');
            expect(result.emoji).toBe('📅');
            expect(result.agendaId).toBe('agenda123');
            expect(result.allDay).toBe(false);
        });

        it('devrait omettre agendaId si non fourni', () => {
            const event = {
                _id: '12345',
                title: 'Test',
                start: new Date(),
                end: new Date()
            };

            const result = formatEventResponse(event);

            expect(result.agendaId).toBeUndefined();
        });
    });

    describe('formatEventForCalendar', () => {
        it('devrait formater un événement pour FullCalendar', () => {
            const event = {
                _id: '12345',
                title: 'Événement',
                start: new Date('2025-12-25T14:00:00.000Z'),
                end: new Date('2025-12-25T16:00:00.000Z'),
                allDay: false,
                description: 'Ma description',
                emoji: '🎉'
            };

            const result = formatEventForCalendar(event);

            expect(result.id).toBe('12345');
            expect(result.title).toBe('Événement');
            expect(result.extendedProps.description).toBe('Ma description');
            expect(result.emoji).toBe('🎉');
            expect(result.recurrence).toEqual({ type: 'none' });
        });
    });
});
