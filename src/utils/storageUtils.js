// Utilitaire de gestion du stockage local
// Ce fichier fournit une interface simplifiée et sécurisée
// pour interagir avec le localStorage du navigateur

// Sauvegarde une valeur dans le localStorage
// Gère automatiquement la sérialisation JSON pour les objets/tableaux
// prend en paramettre key - Clé de stockage
// prend en paramettre value - Valeur à stocker (string, number, object, array, etc.)
// retourne un bool true si succès, false si erreur
// example :
// setItem('user', { id: 1, name: 'John' })
// setItem('token', 'abc123')

function setItem(key, value) {
    try {
        const valueToStore = typeof value === 'object' 
            ? JSON.stringify(value) 
            : String(value);
        localStorage.setItem(key, valueToStore);
        return true;
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde de ${key}:`, error);
        return false;
    }
}

// Récupère une valeur du localStorage
// Tente automatiquement de parser en JSON si possible
// prend en paramettre key - Clé de stockage
// prend en paramettre defaultValue - Valeur par défaut si la clé n'existe pas
// retourne la valeur stockée ou defaultValue
// example : 
// const user = getItem('user', null)
// const token = getItem('token', '')
 
function getItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        
        // Si la clé n'existe pas
        if (item === null) {
            return defaultValue;
        }
        
        // Tente de parser en JSON
        try {
            return JSON.parse(item);
        } catch {
            // Si ce n'est pas du JSON, retourner la string brute
            return item;
        }
    } catch (error) {
        console.error(`Erreur lors de la lecture de ${key}:`, error);
        return defaultValue;
    }
}

// Supprime une valeur du localStorage
// prend en paramettre key - Clé à supprimer
// retourne true si succès, false si erreur

function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de ${key}:`, error);
        return false;
    }
}

// Sauvegarde le token d'authentification
// Méthode helper spécifique pour le token
// prend en paramettre token - Token JWT
// retourne true si succès, false si erreur

function saveToken(token) {
    return setItem(STORAGE_KEYS.TOKEN, token);
}

// Récupère le token d'authentification
// reoturne le token ou null s'il n'existe pas
 
function getToken() {
    return getItem(STORAGE_KEYS.TOKEN, null);
}

// Supprime le token d'authentification
// utilisé lors de la déconnexion
// retourne un bool true si succès, false si erreur

function removeToken() {
    return removeItem(STORAGE_KEYS.TOKEN);
}
