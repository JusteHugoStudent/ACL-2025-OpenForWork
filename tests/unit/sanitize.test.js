// Tests unitaires pour le middleware de sanitization
const {
    escapeHtml,
    sanitizeObject,
    sanitizeWithSkip,
    sanitizeInputMiddleware
} = require('../../server/middleware/sanitize');

describe('Sanitize Middleware', () => {
    describe('escapeHtml', () => {
        it('should escape HTML special characters', () => {
            const input = '<script>alert("xss")</script>';
            const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
            expect(escapeHtml(input)).toBe(expected);
        });

        it('should escape ampersands', () => {
            expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
        });

        it('should escape single quotes', () => {
            expect(escapeHtml("it's")).toBe('it&#x27;s');
        });

        it('should return non-strings unchanged', () => {
            expect(escapeHtml(123)).toBe(123);
            expect(escapeHtml(null)).toBe(null);
            expect(escapeHtml(undefined)).toBe(undefined);
            expect(escapeHtml(true)).toBe(true);
        });

        it('should handle empty strings', () => {
            expect(escapeHtml('')).toBe('');
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize nested objects', () => {
            const input = {
                title: '<b>Bold</b>',
                nested: {
                    html: '<script>evil()</script>'
                }
            };
            const result = sanitizeObject(input);
            expect(result.title).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt;');
            expect(result.nested.html).toBe('&lt;script&gt;evil()&lt;&#x2F;script&gt;');
        });

        it('should sanitize arrays', () => {
            const input = ['<a>', '<b>'];
            const result = sanitizeObject(input);
            expect(result).toEqual(['&lt;a&gt;', '&lt;b&gt;']);
        });

        it('should handle null and undefined', () => {
            expect(sanitizeObject(null)).toBe(null);
            expect(sanitizeObject(undefined)).toBe(undefined);
        });

        it('should preserve numbers and booleans', () => {
            const input = { count: 42, active: true };
            const result = sanitizeObject(input);
            expect(result.count).toBe(42);
            expect(result.active).toBe(true);
        });
    });

    describe('sanitizeWithSkip', () => {
        it('should skip specified fields', () => {
            const input = {
                username: '<script>',
                password: '<secret>'
            };
            const result = sanitizeWithSkip(input, ['password']);
            expect(result.username).toBe('&lt;script&gt;');
            expect(result.password).toBe('<secret>'); // Not sanitized
        });

        it('should use default skip fields (password, token)', () => {
            const input = {
                title: '<b>',
                password: '<pass>',
                token: '<jwt>'
            };
            const result = sanitizeWithSkip(input);
            expect(result.title).toBe('&lt;b&gt;');
            expect(result.password).toBe('<pass>');
            expect(result.token).toBe('<jwt>');
        });
    });

    describe('sanitizeInputMiddleware', () => {
        it('should sanitize request body', () => {
            const req = {
                body: { title: '<script>alert(1)</script>' },
                query: {}
            };
            const res = {};
            const next = jest.fn();

            sanitizeInputMiddleware(req, res, next);

            expect(req.body.title).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
            expect(next).toHaveBeenCalled();
        });

        it('should sanitize query params', () => {
            const req = {
                body: {},
                query: { search: '<img onerror=alert(1)>' }
            };
            const res = {};
            const next = jest.fn();

            sanitizeInputMiddleware(req, res, next);

            expect(req.query.search).toBe('&lt;img onerror=alert(1)&gt;');
            expect(next).toHaveBeenCalled();
        });

        it('should preserve passwords in body', () => {
            const req = {
                body: { username: '<user>', password: '<pass123>' },
                query: {}
            };
            const res = {};
            const next = jest.fn();

            sanitizeInputMiddleware(req, res, next);

            expect(req.body.username).toBe('&lt;user&gt;');
            expect(req.body.password).toBe('<pass123>');
            expect(next).toHaveBeenCalled();
        });
    });
});
