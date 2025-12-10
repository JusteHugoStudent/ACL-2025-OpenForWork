// Tests d'intégration pour l'API des agendas
// Focus sur validation et authentification - pas de création réelle en base

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Configuration du secret JWT pour les tests
const TEST_SECRET = 'test-secret-key-for-testing';
process.env.JWT_SECRET = TEST_SECRET;

// Mock minimal des modèles MongoDB
jest.mock('../../server/models/agendaModel', () => {
    const MockAgenda = jest.fn().mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = 'agenda-' + Date.now();
        this.save = jest.fn().mockResolvedValue(this);
        this.toJSON = () => ({ ...this, id: this._id });
    });
    MockAgenda.find = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    MockAgenda.findOne = jest.fn().mockResolvedValue(null);
    MockAgenda.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    MockAgenda.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    MockAgenda.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'deleted' });
    return MockAgenda;
});

jest.mock('../../server/models/eventModel', () => ({
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
}));

// Import des routes après les mocks
const agendaRoutes = require('../../server/routes/agenda.routes');

describe('API Agenda Routes', () => {
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
        app.use('/api/agendas', agendaRoutes);
        jest.clearAllMocks();
    });

    // ============================================
    // TESTS D'AUTHENTIFICATION
    // ============================================

    describe('Authentification requise', () => {
        it('devrait rejeter les requêtes sans token', async () => {
            const response = await request(app)
                .get('/api/agendas')
                .expect(401);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un token invalide', async () => {
            const response = await request(app)
                .get('/api/agendas')
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
                .get('/api/agendas')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body.error).toBeDefined();
        });
    });

    // ============================================
    // VALIDATION DES DONNÉES - POST
    // ============================================

    describe('Validation POST /api/agendas', () => {
        it('devrait rejeter un agenda sans nom', async () => {
            const response = await request(app)
                .post('/api/agendas')
                .set('Authorization', `Bearer ${validToken}`)
                .send({})
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un agenda avec nom vide', async () => {
            const response = await request(app)
                .post('/api/agendas')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: '' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un nom trop long (> 50 caractères)', async () => {
            const response = await request(app)
                .post('/api/agendas')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'a'.repeat(51) })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter une couleur invalide (pas hex)', async () => {
            const response = await request(app)
                .post('/api/agendas')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Test', color: 'rouge' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter une couleur invalide (format incorrect)', async () => {
            const response = await request(app)
                .post('/api/agendas')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Test', color: '#GGGGGG' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });

    // ============================================
    // VALIDATION DES DONNÉES - PUT
    // ============================================

    describe('Validation PUT /api/agendas/:id', () => {
        it('devrait rejeter une mise à jour avec nom vide', async () => {
            const response = await request(app)
                .put('/api/agendas/agenda-123')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: '' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter une mise à jour avec nom trop long', async () => {
            const response = await request(app)
                .put('/api/agendas/agenda-123')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'a'.repeat(51) })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter une mise à jour avec couleur invalide', async () => {
            const response = await request(app)
                .put('/api/agendas/agenda-123')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ name: 'Test', color: 'invalid' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });
});
