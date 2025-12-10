// Tests unitaires pour le middleware d'authentification JWT

const jwt = require('jsonwebtoken');

// Mock du JWT_SECRET pour les tests
const TEST_SECRET = 'test-secret-key-for-testing';
process.env.JWT_SECRET = TEST_SECRET;

// Import du middleware après avoir défini le secret
const authMiddleware = require('../../server/middleware/auth');

describe('authMiddleware', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
        mockReq = {
            headers: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        nextFunction = jest.fn();
    });

    describe('Token absent', () => {
        it('devrait retourner 401 si aucun header Authorization', () => {
            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'no token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('Token malformé', () => {
        it('devrait retourner 401 si le format n\'est pas "Bearer <token>"', () => {
            mockReq.headers.authorization = 'InvalidFormat';

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'bad token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('devrait retourner 401 si le préfixe n\'est pas Bearer', () => {
            mockReq.headers.authorization = 'Basic sometoken';

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'bad token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('devrait retourner 401 si trop de parties dans le header', () => {
            mockReq.headers.authorization = 'Bearer token extra';

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'bad token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('Token invalide', () => {
        it('devrait retourner 401 si le token est invalide', () => {
            mockReq.headers.authorization = 'Bearer invalid.token.here';

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'invalid token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('devrait retourner 401 si le token est expiré', () => {
            // Créer un token expiré
            const expiredToken = jwt.sign(
                { userId: '123', username: 'test' },
                TEST_SECRET,
                { expiresIn: '-1s' }
            );
            mockReq.headers.authorization = `Bearer ${expiredToken}`;

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'invalid token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('devrait retourner 401 si le token est signé avec un autre secret', () => {
            const wrongSecretToken = jwt.sign(
                { userId: '123', username: 'test' },
                'wrong-secret',
                { expiresIn: '1h' }
            );
            mockReq.headers.authorization = `Bearer ${wrongSecretToken}`;

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'invalid token' });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('Token valide', () => {
        it('devrait appeler next() avec un token valide', () => {
            const validToken = jwt.sign(
                { userId: '123', username: 'testuser' },
                TEST_SECRET,
                { expiresIn: '1h' }
            );
            mockReq.headers.authorization = `Bearer ${validToken}`;

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('devrait ajouter les infos user décodées dans req.user', () => {
            const payload = { userId: '456', username: 'john' };
            const validToken = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
            mockReq.headers.authorization = `Bearer ${validToken}`;

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockReq.user).toBeDefined();
            expect(mockReq.user.userId).toBe('456');
            expect(mockReq.user.username).toBe('john');
        });

        it('devrait gérer un token avec des données supplémentaires', () => {
            const payload = {
                userId: '789',
                username: 'admin',
                role: 'admin',
                customField: 'test'
            };
            const validToken = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
            mockReq.headers.authorization = `Bearer ${validToken}`;

            authMiddleware(mockReq, mockRes, nextFunction);

            expect(mockReq.user.role).toBe('admin');
            expect(mockReq.user.customField).toBe('test');
            expect(nextFunction).toHaveBeenCalled();
        });
    });
});
