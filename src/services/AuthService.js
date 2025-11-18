// Service d'authentification

// Classe AuthService - Gestion de l'authentification
 
class AuthService {
    
    
    // Connecte un utilisateur 
    // prend en paramettre username - Nom d'utilisateur
    // prend en paramettre password - Mot de passe
    // retourne un boolean, un token ou un msg d'erreur 
     
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
    
    
    // Inscrit un nouvel utilisateur
    // prend en paramettre username - Nom d'utilisateur
    // prend en paramettre password - Mot de passe
    // retourne un boolean, un msg
     
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
    
    // Vérifie si l'utilisateur est authentifié 
    // return un bool true si un token valide existe

    isAuthenticated() {
        return getToken() !== null;
    }
    
    // Déconnecte l'utilisateur (supprime le token)
     
    logout() {
        removeToken();
    }
}
