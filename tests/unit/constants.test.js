// Tests unitaires pour les constantes

const { THEME_COLORS, HOLIDAYS_AGENDA_NAME } = require('../../server/config/constants');

describe('constants', () => {
    describe('THEME_COLORS', () => {
        it('devrait avoir une couleur par défaut pour les agendas', () => {
            expect(THEME_COLORS.DEFAULT_AGENDA).toBeDefined();
            expect(THEME_COLORS.DEFAULT_AGENDA).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });

        it('devrait avoir une couleur pour les jours fériés', () => {
            expect(THEME_COLORS.JOURS_FERIES).toBeDefined();
            expect(THEME_COLORS.JOURS_FERIES).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });

    describe('HOLIDAYS_AGENDA_NAME', () => {
        it('devrait être défini', () => {
            expect(HOLIDAYS_AGENDA_NAME).toBeDefined();
            expect(HOLIDAYS_AGENDA_NAME).toBe('Jours fériés');
        });
    });
});
