
# Documentation Technique/routes API - OpenForWork Calendar

## 1. Présentation du projet

### 1.1 Objectif
**OpenForWork Calendar** est une application web de gestion de calendrier collaborative permettant aux utilisateurs de gérer plusieurs agendas avec des événements récurrents.

### 1.2 Fonctionnalités principales
- **Multi-agendas** : Création et gestion de plusieurs agendas avec couleurs personnalisées
- **Événements récurrents** : Support des récurrences quotidiennes, hebdomadaires, mensuelles et annuelles
- **Import/Export** : Sauvegarde et restauration des agendas au format JSON
- **Jours fériés** : Agenda des jours fériés français pré-intégré
- **Interface responsive** : Adaptation mobile et desktop

---

## 2. Architecture générale

### 2.1 Technologies utilisées

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Backend** | Node.js + Express | Framework léger et rapide pour API REST |
| **Base de données** | MongoDB + Mongoose | NoSQL flexible pour données imbriquées (agendas → événements) |
| **Authentification** | JWT (JSON Web Token) | Stateless, sécurisé, standard industrie |
| **Frontend** | Vanilla JavaScript | Pas de framework lourd, charge rapide |
| **Calendrier** | FullCalendar | Librairie mature avec drag & drop |
| **Tests** | Jest + Supertest | Standard pour tests Node.js |
| **Contact Admin | EmailJS | service de mail simple Javascript, si vous voulez les logs demandé aux élèves |

### 2.2 Structure des dossiers

```
ACL-2025-OpenForWork/
│
├── server/                    # BACKEND
│   ├── config/
│   │   └── constants.js       # Constantes (couleurs, noms)
│   ├── middleware/
│   │   ├── auth.js            # Vérification JWT
│   │   ├── validation.js      # Validation des données entrantes
│   │   └── sanitize.js        # Protection XSS
│   ├── models/
│   │   ├── userModel.js       # Schéma utilisateur
│   │   ├── agendaModel.js     # Schéma agenda
│   │   └── eventModel.js      # Schéma événement
│   └── routes/
│       ├── auth.routes.js     # /api/register, /api/login
│       ├── agenda.routes.js   # /api/agendas CRUD
│       └── event.routes.js    # /api/events CRUD
│
├── src/                       # FRONTEND
│   ├── controllers/
│   │   ├── AgendaController.js    # Logique principale (gestion état)
│   │   └── AgendaImportExport.js  # Import/Export agendas
│   ├── views/
│   │   ├── ModalView.js       # Modales (création/édition événement)
│   │   ├── HeaderView.js      # Barre de navigation + sélecteur agenda
│   │   ├── SidebarView.js     # Sidebar avec mini-calendrier
│   │   └── AppUIManager.js    # Gestion globale UI (thème, responsive)
│   ├── utils/
│   │   ├── recurrenceUtils.js # Génération occurrences récurrentes
│   │   └── apiClient.js       # Appels API centralisés
│   └── css/                   # Styles CSS
│
├── tests/                     # TESTS
│   ├── unit/                  # Tests unitaires
│   └── integration/           # Tests d'intégration API
│
├── doc/                       # DOCUMENTATION
│   └── RouteAPI.md            # Documentation API REST
│
├── serveur.js                 # Point d'entrée serveur
└── package.json               # Dépendances npm
```

---

## 3. Backend

### 3.1 Base de données MongoDB

#### Modèle User (utilisateur)
```javascript
{
  _id: ObjectId,
  username: String,           // Unique, 3-30 caractères
  password: String,           // Hashé avec bcrypt (10 rounds)
  agendas: [ObjectId]         // Références vers les agendas
}
```

#### Modèle Agenda
```javascript
{
  _id: ObjectId,
  name: String,               // Max 50 caractères
  color: String,              // Format hex (#RGB ou #RRGGBB)
  events: [ObjectId]          // Références vers les événements
}
```

#### Modèle Event (événement)
```javascript
{
  _id: ObjectId,
  title: String,              // Max 200 caractères
  start: Date,                // Date de début (ISO)
  end: Date,                  // Date de fin (ISO)
  description: String,        // Max 1000 caractères
  emoji: String,              // Emoji de l'événement
  allDay: Boolean,            // Événement journée entière
  recurrence: {
    type: String,             // "none", "daily", "weekly", "monthly", "yearly"
    interval: Number,         // Intervalle (tous les X jours/semaines...)
    endDate: Date,            // Date de fin de récurrence
    daysOfWeek: [Number]      // Pour weekly: [0=Dim, 1=Lun, ..., 6=Sam]
  }
}
```

#### Relations entre collections
```
User (1) ──────► (N) Agenda (1) ──────► (N) Event
         agendas[]           events[]
```

### 3.2 API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | Vérification serveur |
| `POST` | `/api/register` | Inscription |
| `POST` | `/api/login` | Connexion (retourne JWT) |
| `GET` | `/api/agendas` | Liste des agendas utilisateur |
| `POST` | `/api/agendas` | Créer un agenda |
| `PUT` | `/api/agendas/:id` | Modifier un agenda |
| `DELETE` | `/api/agendas/:id` | Supprimer un agenda |
| `GET` | `/api/events` | Liste des événements (avec filtres) |
| `POST` | `/api/events` | Créer un événement |
| `PUT` | `/api/events/:id` | Modifier un événement |
| `DELETE` | `/api/events/:id` | Supprimer un événement |

> Pour les détails complets de l'API, voir [RouteAPI.md](RouteAPI.md)

### 3.3 Sécurité

#### Authentification JWT
1. L'utilisateur se connecte avec `/api/login`
2. Le serveur vérifie les credentials et génère un token JWT (valide 7 jours)
3. Le client stocke le token dans `localStorage`
4. Chaque requête inclut le header `Authorization: Bearer <token>`
5. Le middleware `auth.js` vérifie le token avant chaque route protégée

```javascript
// Middleware auth.js (simplifié)
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = { id: decoded.id, username: decoded.username };
next();
```

#### Validation des données
Le middleware `validation.js` vérifie :
- Longueur des champs (titre max 200, description max 1000)
- Format des dates (ISO valide)
- Types de récurrence autorisés
- Format des couleurs (hex valide)

#### Protection XSS
Le middleware `sanitize.js` échappe les caractères HTML dangereux (`<`, `>`, `&`, etc.) pour éviter les injections de scripts.

---

## 4. Frontend

### 4.1 Composants principaux

#### AgendaController (`controllers/AgendaController.js`)
- **Rôle** : Contrôleur central, gère l'état de l'application
- **Responsabilités** :
  - Initialisation du calendrier FullCalendar
  - Chargement des agendas et événements depuis l'API
  - Synchronisation entre les vues et les données
  - Gestion du drag & drop des événements

#### ModalView (`views/ModalView.js`)
- **Rôle** : Gestion des modales de création/édition
- **Responsabilités** :
  - Affichage du formulaire d'événement
  - Validation côté client
  - Gestion de la récurrence (UI)
  - Sélection d'emoji (catégorie événement)

#### HeaderView (`views/HeaderView.js`)
- **Rôle** : Barre de navigation supérieure
- **Responsabilités** :
  - Sélecteur d'agenda actif
  - Boutons de navigation (aujourd'hui, précédent, suivant)
  - Affichage du mois/année courant

#### AppUIManager (`views/AppUIManager.js`)
- **Rôle** : Gestion globale de l'interface
- **Responsabilités** :
  - Thème clair/sombre
  - Responsive design (mobile/desktop)
  - Menu overlay des agendas
  - Notifications utilisateur
  - Initialisation du Modale contact admin

### 4.3 Intégration FullCalendar

FullCalendar est configuré avec :
- **Vue par défaut** : `dayGridMonth` (grille mensuelle)
- **Vues disponibles** : Mois, Semaine, Jour
- **Événements** : Chargés dynamiquement via callback
- **Drag & Drop** : Activé pour déplacer/redimensionner

```javascript
// Configuration FullCalendar (simplifié)
const calendar = new FullCalendar.Calendar(calendarEl, {
  initialView: 'dayGridMonth',
  locale: 'fr',
  editable: true,
  selectable: true,
  events: (info, successCallback) => {
    // Chargement des événements via API
    this.loadEventsForRange(info.start, info.end)
      .then(events => successCallback(events));
  }
});
```

---

## 5. Fonctionnalités clés

### 5.1 Multi-agendas

Chaque utilisateur peut créer plusieurs agendas :
- **Agenda par défaut** : Créé automatiquement à l'inscription
- **Jours fériés** : Agenda partagé (lecture seule) avec les jours fériés français
- **Agendas personnalisés** : Couleur et nom personnalisables

**Flux de fonctionnement :**
1. L'utilisateur sélectionne un agenda dans le sélecteur
2. Le contrôleur charge les événements de cet agenda
3. Le calendrier affiche uniquement ces événements
4. Mode "Mix" : possibilité d'afficher plusieurs agendas simultanément

### 5.2 Récurrence des événements

Système de récurrence gérant 4 types :

| Type | Description | Exemple |
|------|-------------|---------|
| `daily` | Tous les X jours | Tous les 2 jours |
| `weekly` | Chaque semaine, jours spécifiques | Lundi et Mercredi |
| `monthly` | Même jour chaque mois | Le 15 de chaque mois |
| `yearly` | Même date chaque année | Anniversaire |

**Algorithme de génération (`recurrenceUtils.js`) :**
1. Récupère l'événement de base avec ses paramètres de récurrence
2. Génère les occurrences dans la plage demandée (start → end)
3. Chaque occurrence :
   - Conserve les mêmes propriétés (titre, durée, emoji)
   - A une date de début/fin décalée selon l'intervalle
   - Est marquée comme `isRecurring: true`
4. Limite de sécurité : max 1000 occurrences

### 5.3 Import/Export

**Export (`AgendaImportExport.js`) :**
1. Sélection de l'agenda à exporter
2. Formatage en JSON structuré :
```json
{
  "agenda": {
    "name": "Mon agenda",
    "color": "#3498db"
  },
  "events": [
    { "title": "...", "start": "...", "end": "...", ... }
  ],
  "exportDate": "2025-12-10T15:00:00Z",
  "version": "1.0"
}
```
3. Téléchargement du fichier `.json`

**Import :**
1. Upload du fichier JSON
2. Validation du format (schéma attendu)
3. Création d'un nouvel agenda ou fusion avec existant
4. Import des événements normalisés

---

## 6. Tests

### 6.1 Types de tests

| Type | Dossier | Objectif |
|------|---------|----------|
| **Unitaires** | `tests/unit/` | Tester les fonctions isolément |
| **Intégration** | `tests/integration/` | Tester les routes API complètes |

### 6.2 Couverture actuelle

```
Test Suites: 10 passed
Tests:       133 passed
Coverage:    41% (lignes)
```

**Composants bien testés (>80%) :**
- Middleware d'authentification (`auth.js`)
- Validation des données (`validation.js`)
- Formatage des événements (`eventFormatter.js`)

**À améliorer :**
- Routes API (15%)
- Modèles MongoDB (33%)

### 6.3 Exécution des tests

```bash
# Lancer tous les tests avec couverture
npm test

# Lancer un fichier de test spécifique
npx jest tests/unit/validation.test.js
```

---

## 7. Déploiement

### 7.1 Prérequis

- **Node.js** 18 ou supérieur
- **MongoDB** 6 ou supérieur (local ou MongoDB Atlas)
- **npm** installé

### 7.2 Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données MongoDB
MONGODB_URI=mongodb://localhost:27017/openforwork

# Secret pour les tokens JWT
JWT_SECRET=votre-secret-tres-long-et-securise

# Port du serveur (optionnel, défaut: 3000)
PORT=3000
```

---

## Annexes

### A. Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrer le serveur |
| `npm test` | Lancer les tests |
| `npm run dev` | Mode développement |
