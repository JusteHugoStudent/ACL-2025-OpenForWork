// Tests unitaires pour le middleware de validation

const {
    validateEvent,
    validateAgenda,
    validateCredentials
} = require('../../server/middleware/validation');

describe('validation middleware', () => {

    describe('validateCredentials', () => {
        it('devrait valider des credentials corrects', () => {
            const result = validateCredentials({
                username: 'testuser',
                password: 'password123'
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('devrait rejeter un username manquant', () => {
            const result = validateCredentials({
                password: 'password123'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Le nom d'utilisateur est obligatoire");
        });

        it('devrait rejeter un username trop court', () => {
            const result = validateCredentials({
                username: 'ab',
                password: 'password123'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Le nom d'utilisateur doit contenir au moins 3 caractères");
        });

        it('devrait rejeter un username trop long', () => {
            const result = validateCredentials({
                username: 'a'.repeat(31),
                password: 'password123'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Le nom d'utilisateur ne peut pas dépasser 30 caractères");
        });

        it('devrait rejeter un password manquant', () => {
            const result = validateCredentials({
                username: 'testuser'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Le mot de passe est obligatoire');
        });

        it('devrait rejeter un password trop court', () => {
            const result = validateCredentials({
                username: 'testuser',
                password: '12345'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Le mot de passe doit contenir au moins 6 caractères');
        });
    });

    describe('validateEvent', () => {
        it('devrait valider un événement correct', () => {
            const result = validateEvent({
                title: 'Réunion',
                start: '2025-12-25T14:00:00.000Z'
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('devrait rejeter un titre manquant', () => {
            const result = validateEvent({
                start: '2025-12-25T14:00:00.000Z'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Le titre est obligatoire');
        });

        it('devrait rejeter un titre trop long', () => {
            const result = validateEvent({
                title: 'a'.repeat(201),
                start: '2025-12-25T14:00:00.000Z'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Le titre ne peut pas dépasser 200 caractères');
        });

        it('devrait rejeter une date de début manquante', () => {
            const result = validateEvent({
                title: 'Test'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('La date de début est obligatoire');
        });

        it('devrait rejeter une date de début invalide', () => {
            const result = validateEvent({
                title: 'Test',
                start: 'invalid-date'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('La date de début est invalide');
        });

        it('devrait rejeter une description trop longue', () => {
            const result = validateEvent({
                title: 'Test',
                start: '2025-12-25T14:00:00.000Z',
                description: 'a'.repeat(1001)
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('La description ne peut pas dépasser 1000 caractères');
        });

        it('devrait rejeter un type de récurrence invalide', () => {
            const result = validateEvent({
                title: 'Test',
                start: '2025-12-25T14:00:00.000Z',
                recurrence: { type: 'invalid' }
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Type de récurrence invalide');
        });

        it('devrait accepter les types de récurrence valides', () => {
            const validTypes = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

            validTypes.forEach(type => {
                const result = validateEvent({
                    title: 'Test',
                    start: '2025-12-25T14:00:00.000Z',
                    recurrence: { type }
                });

                expect(result.valid).toBe(true);
            });
        });
    });

    describe('validateAgenda', () => {
        it('devrait valider un agenda correct', () => {
            const result = validateAgenda({
                name: 'Mon Agenda'
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('devrait rejeter un nom manquant', () => {
            const result = validateAgenda({});

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Le nom de l'agenda est obligatoire");
        });

        it('devrait rejeter un nom trop long', () => {
            const result = validateAgenda({
                name: 'a'.repeat(51)
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Le nom de l'agenda ne peut pas dépasser 50 caractères");
        });

        it('devrait accepter une couleur hex valide (#RGB)', () => {
            const result = validateAgenda({
                name: 'Test',
                color: '#FFF'
            });

            expect(result.valid).toBe(true);
        });

        it('devrait accepter une couleur hex valide (#RRGGBB)', () => {
            const result = validateAgenda({
                name: 'Test',
                color: '#3498db'
            });

            expect(result.valid).toBe(true);
        });

        it('devrait rejeter une couleur invalide', () => {
            const result = validateAgenda({
                name: 'Test',
                color: 'rouge'
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('La couleur doit être au format hexadécimal (#RGB ou #RRGGBB)');
        });
    });
});
