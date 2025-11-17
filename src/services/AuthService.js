/**
 * ============================================
 * SERVICE D'AUTHENTIFICATION
 * ============================================
 * 
 * Ce service gère toutes les interactions avec l'API d'authentification
 * (connexion, inscription, gestion du token).
 */

/**
 * Classe AuthService - Gestion de l'authentification
 */
class AuthService {
    
    /**
     * Connecte un utilisateur
     * 
     * @param {string} username - Nom d'utilisateur
     * @param {string} password - Mot de passe
     * @returns {Promise<Object>} { success: boolean, token?: string, error?: string }
     */
    async login(username, password) {
        try {
            const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                return { 
                    success: false, 
                    error: data.error || 'Erreur de connexion' 
                };
            }
            
            return { 
                success: true, 
                data: {
                    token: data.token,
                    username: data.username
                }
            };
            
        } catch (error) {
            console.error('Erreur login:', error);
            return { 
                success: false, 
                error: 'Erreur réseau - Impossible de se connecter' 
            };
        }
    }
    
    /**
     * Inscrit un nouvel utilisateur
     * 
     * @param {string} username - Nom d'utilisateur
     * @param {string} password - Mot de passe
     * @returns {Promise<Object>} { success: boolean, message?: string, error?: string }
     */
    async signup(username, password) {
        try {
            const response = await fetch(API_ENDPOINTS.AUTH.SIGNUP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                return { 
                    success: false, 
                    error: data.error || 'Erreur d\'inscription' 
                };
            }
            
            return { 
                success: true, 
                message: data.message || 'Inscription réussie' 
            };
            
        } catch (error) {
            console.error('Erreur signup:', error);
            return { 
                success: false, 
                error: 'Erreur réseau - Impossible de s\'inscrire' 
            };
        }
    }
    
    /**
     * Vérifie si l'utilisateur est authentifié
     * 
     * @returns {boolean} true si un token valide existe
     */
    isAuthenticated() {
        return getToken() !== null;
    }
    
    /**
     * Déconnecte l'utilisateur (supprime le token)
     */
    logout() {
        removeToken();
    }
}
