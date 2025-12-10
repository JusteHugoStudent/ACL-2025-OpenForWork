// Tests d'intégration pour l'API d'authentification

const request = require('supertest');
const express = require('express');

// Mock des dépendances pour éviter la connexion MongoDB
jest.mock('../../server/models/userModel', () => ({
    findOne: jest.fn(),
    prototype: {
        save: jest.fn()
    }
}));

jest.mock('../../server/models/agendaModel', () => ({
    findOne: jest.fn(),
    prototype: {
        save: jest.fn()
    }
}));

// Configuration de l'app de test
const authRoutes = require('../../server/routes/auth.routes');

describe('API Auth Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api', authRoutes);
        jest.clearAllMocks();
    });

    describe('GET /api/health', () => {
        it('devrait retourner ok: true', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toEqual({ ok: true });
        });
    });

    describe('POST /api/register', () => {
        it('devrait rejeter un body vide', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({})
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter un username trop court', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({ username: 'ab', password: 'password123' })
                .expect(400);

            expect(response.body.error).toContain('3 caractères');
        });

        it('devrait rejeter un password trop court', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({ username: 'testuser', password: '12345' })
                .expect(400);

            expect(response.body.error).toContain('6 caractères');
        });
    });

    describe('POST /api/login', () => {
        it('devrait rejeter un body vide', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({})
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('devrait rejeter des credentials invalides', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ username: 'ab', password: '123' })
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });
});
