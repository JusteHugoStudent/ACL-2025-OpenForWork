// Tests d'intégration pour l'API des événements
// Focus sur validation et authentification - pas de création réelle en base

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Configuration du secret JWT pour les tests
const TEST_SECRET = 'test-secret-key-for-testing';
process.env.JWT_SECRET = TEST_SECRET;

// Mock minimal des modèles MongoDB pour éviter les erreurs de connexion
jest.mock('../../server/models/eventModel', () => {
    const MockEvent = jest.fn().mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = 'event-' + Date.now();
        this.save = jest.fn().mockResolvedValue(this);
        this.toJSON = () => ({ ...this, id: this._id });
    });
    MockEvent.find = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    MockEvent.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    MockEvent.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    MockEvent.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    MockEvent.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'deleted' });
    return MockEvent;
});

jest.mock('../../server/models/agendaModel', () => ({
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'agenda-1', userId: 'user-123' }) }),
    findOne: jest.fn().mockResolvedValue({ _id: 'agenda-1', userId: 'user-123' })
}));

// Import des routes après les mocks
const eventRoutes = require('../../server/routes/event.routes');

describe('API Event Routes', () => {
    let app;
    let validToken;

    beforeAll(() => {
        validToken = jwt.sign(
            { userId: 'user-123', username: 'testuser' },
            TEST_SECRET,
            { expiresIn: '1h' }
        );
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/events', eventRoutes);
        jest.clearAllMocks();
    });

    // ============================================
    // TESTS D'AUTHENTIFICATION
    // ============================================

    describe('Authentification requise', () => {
        it('devrait rejeter les requêtes sans token', async () => {
            const response = await request(app)
                .get('/api/events')
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un token invalide', async () => {
            const response = await request(app)
                .get('/api/events')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un token expiré', async () => {
            const expiredToken = jwt.sign(
                { userId: 'user-123', username: 'test' },
                TEST_SECRET,
                { expiresIn: '-1s' }
            );

            const response = await request(app)
                .get('/api/events')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body.error).toBeDefined();
        });
    });

    // ============================================
    // VALIDATION DES DONNÉES - POST
    // ============================================

    describe('Validation POST /api/events', () => {
        it('devrait rejeter un événement sans titre', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ start: '2025-12-25T14:00:00.000Z', agendaId: 'agenda-1' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un événement avec titre vide', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: '', start: '2025-12-25T14:00:00.000Z', agendaId: 'agenda-1' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un événement sans date de début', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ title: 'Test', agendaId: 'agenda-1' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un titre trop long (> 200 caractères)', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    title: 'a'.repeat(201),
                    start: '2025-12-25T14:00:00.000Z',
                    agendaId: 'agenda-1'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter une description trop longue (> 1000 caractères)', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    title: 'Test',
                    start: '2025-12-25T14:00:00.000Z',
                    agendaId: 'agenda-1',
                    description: 'a'.repeat(1001)
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un type de récurrence invalide', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    title: 'Test',
                    start: '2025-12-25T14:00:00.000Z',
                    agendaId: 'agenda-1',
                    recurrence: { type: 'invalid-type' }
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter une date de début invalide', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    title: 'Test',
                    start: 'not-a-date',
                    agendaId: 'agenda-1'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });

    // ============================================
    // VALIDATION DES DONNÉES - PUT
    // ============================================

    describe('Validation PUT /api/events/:id', () => {
        it('devrait rejeter une mise à jour avec titre vide', async () => {
            const response = await request(app)
                .put('/api/events/event-123')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    title: '',
                    start: '2025-12-25T14:00:00.000Z'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter une mise à jour avec titre trop long', async () => {
            const response = await request(app)
                .put('/api/events/event-123')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    title: 'a'.repeat(201),
                    start: '2025-12-25T14:00:00.000Z'
                })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });
});
