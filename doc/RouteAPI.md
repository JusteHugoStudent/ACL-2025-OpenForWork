# Routes API - OpenForWork

## Authentification

### GET `/api/health`
**Description :** Vérifie que le serveur API est opérationnel.

**Authentification :** Non requise

**Réponse :**
```json
{
  "ok": true
}
```

---

### POST `/api/register`
**Description :** Crée un nouveau compte utilisateur avec un agenda par défaut et l'agenda des jours fériés (s'il existe).

**Authentification :** Non requise

**Body :**
```json
{
  "username": "string (requis)",
  "password": "string (requis)"
}
```

**Fonctionnement :**
1. Vérifie que l'utilisateur n'existe pas déjà
2. Hashe le mot de passe avec bcrypt (10 rounds)
3. Crée l'utilisateur dans MongoDB
4. Crée automatiquement un agenda "Default"
5. Lie l'agenda "Jours fériés" s'il existe
6. Sauvegarde l'utilisateur avec ses agendas

**Réponses :**
- `201` : Compte créé avec succès
  ```json
  {
    "message": "user created"
  }
  ```
- `400` : Champs manquants
- `409` : Nom d'utilisateur déjà pris
- `500` : Erreur serveur

---

### POST `/api/login`
**Description :** Authentifie un utilisateur et génère un token JWT valide 7 jours.

**Authentification :** Non requise

**Body :**
```json
{
  "username": "string (requis)",
  "password": "string (requis)"
}
```

**Fonctionnement :**
1. Recherche l'utilisateur dans MongoDB
2. Compare le mot de passe avec bcrypt
3. Génère un token JWT signé avec le secret (payload : `{id, username}`)
4. Retourne le token et le nom d'utilisateur

**Réponses :**
- `200` : Connexion réussie
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "john_doe"
  }
  ```
- `400` : Champs manquants
- `404` : Utilisateur introuvable
- `401` : Mot de passe incorrect
- `500` : Erreur serveur

---

## Agendas

**Note :** Toutes les routes nécessitent l'authentification via header `Authorization: Bearer <token>`

### GET `/api/agendas`
**Description :** Récupère tous les agendas de l'utilisateur avec leurs événements complets.

**Authentification :** Requise (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**Fonctionnement :**
1. Décode le token JWT pour récupérer l'ID utilisateur
2. Charge l'utilisateur avec populate sur `agendas` et `events`
3. Formate les données pour le client (IDs, noms, événements)

**Réponse :**
```json
[
  {
    "id": "673abc123def456789012345",
    "name": "Default",
    "events": [
      {
        "id": "673def789abc123456789012",
        "title": "Réunion équipe",
        "start": "2025-11-20T14:00:00.000Z",
        "end": "2025-11-20T15:00:00.000Z",
        "description": "Sprint review",
        "color": "#3788d8"
      }
    ]
  },
  {
    "id": "691dcc4aed499347d97b5929",
    "name": "Jours fériés",
    "events": []
  }
]
```

**Codes d'erreur :**
- `404` : Utilisateur non trouvé
- `401` : Token invalide/expiré
- `500` : Erreur serveur

---

### POST `/api/agendas`
**Description :** Crée un nouvel agenda vide pour l'utilisateur connecté.

**Authentification :** Requise (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**Body :**
```json
{
  "name": "string (requis, max 50 caractères)",
  "color": "string (optionnel, format hex #RGB ou #RRGGBB)"
}
```

**Fonctionnement :**
1. Vérifie le token JWT
2. Valide le nom (requis, max 50 caractères)
3. Valide la couleur si fournie (format hex)
4. Crée un nouvel agenda avec `events: []`
5. Ajoute l'ID de l'agenda dans `user.agendas`
6. Sauvegarde l'utilisateur et l'agenda

**Réponse :**
```json
{
  "id": "673xyz890abc123456789abc",
  "name": "Mon agenda perso",
  "color": "#3498db",
  "events": []
}
```

**Codes d'erreur :**
- `400` : Nom manquant, trop long (> 50 caractères), ou couleur invalide
- `404` : Utilisateur non trouvé
- `401` : Token invalide
- `500` : Erreur serveur

---

### PUT `/api/agendas/:id`
**Description :** Met à jour un agenda existant (nom et/ou couleur).

**Authentification :** Requis (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**URL Params :**
- `id` : ID de l'agenda à modifier

**Body (tous les champs optionnels) :**
```json
{
  "name": "string (max 50 caractères)",
  "color": "string (format hex #RGB ou #RRGGBB)"
}
```

**Réponse :**
```json
{
  "id": "673xyz890abc123456789abc",
  "name": "Agenda modifié",
  "color": "#ff5733"
}
```

**Codes d'erreur :**
- `400` : Nom vide ou trop long, couleur invalide
- `404` : Agenda non trouvé ou non autorisé
- `401` : Token invalide
- `500` : Erreur serveur

---

### DELETE `/api/agendas/:id`
**Description :** Supprime un agenda et tous ses événements associés.

**Authentification :** Requise (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**URL Params :**
- `id` : ID de l'agenda à supprimer

**Fonctionnement :**
1. Vérifie que l'utilisateur possède cet agenda
2. Supprime tous les événements liés à cet agenda
3. Retire l'agenda de la liste `user.agendas`
4. Supprime l'agenda de la collection

**Réponse :**
```json
{
  "message": "agenda deleted successfully"
}
```

**Codes d'erreur :**
- `404` : Agenda non trouvé ou non autorisé
- `401` : Token invalide
- `500` : Erreur serveur

---

## Événements

**Note :** Toutes les routes nécessitent l'authentification via header `Authorization: Bearer <token>`

### GET `/api/events`
**Description :** Récupère les événements d'un ou plusieurs agendas avec filtrage temporel optimisé.

**Authentification :** Requise (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**Query Parameters :**
- `agendaId` (string, optionnel) : Filtre sur un agenda spécifique
- `agendaIds[]` (array, optionnel) : Charge plusieurs agendas simultanément (mode mix)
- `start` (ISO date, optionnel) : Date de début du filtrage
- `end` (ISO date, optionnel) : Date de fin du filtrage

**Fonctionnement :**

**Mode 1 : Agenda unique**
```
GET /api/events?agendaId=673abc123
```
Retourne tous les événements de cet agenda dans la période filtrée.

**Mode 2 : Agendas multiples (mix)**
```
GET /api/events?agendaIds[]=673abc123&agendaIds[]=691dcc4ae
```
Retourne un objet avec les événements groupés par agenda.

**Mode 3 : Tous les agendas**
```
GET /api/events
```
Retourne tous les événements de tous les agendas de l'utilisateur.

**Filtrage temporel :**
- Si `start` et `end` fournis : événements dans cette plage
- Sinon : par défaut ±2 mois autour de la date actuelle
- Logique : événement qui commence, termine ou chevauche la période

**Réponse (mode unique) :**
```json
[
  {
    "id": "673def789abc123456789012",
    "title": "Réunion équipe",
    "start": "2025-11-20T14:00:00.000Z",
    "end": "2025-11-20T15:00:00.000Z",
    "extendedProps": {
      "description": "Sprint review"
    },
    "emoji": "💼",
    "color": "#3788d8",
    "backgroundColor": "#3788d8",
    "recurrence": {
      "type": "none"
    }
  }
]
```

**Réponse (mode multiple) :**
```json
{
  "673abc123def456789012345": [
    { "id": "...", "title": "Événement 1", ... }
  ],
  "691dcc4aed499347d97b5929": [
    { "id": "...", "title": "Jour férié", ... }
  ]
}
```

**Codes d'erreur :**
- `404` : Utilisateur non trouvé
- `401` : Token invalide
- `500` : Erreur serveur

---

### POST `/api/events`
**Description :** Crée un nouvel événement dans un agenda spécifique ou l'agenda par défaut.

**Authentification :** Requise (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**Body :**
```json
{
  "title": "string (requis, max 200 caractères)",
  "start": "ISO date (requis)",
  "end": "ISO date (optionnel, défaut: = start)",
  "description": "string (optionnel, max 1000 caractères)",
  "emoji": "string (optionnel, défaut: 📅)",
  "color": "string (optionnel, défaut: #ffd700)",
  "agendaId": "string (optionnel)",
  "allDay": "boolean (optionnel, défaut: false)",
  "recurrence": {
    "type": "none|daily|weekly|monthly|yearly",
    "interval": "number (défaut: 1)",
    "endDate": "ISO date (optionnel)",
    "daysOfWeek": "number[] (pour weekly, ex: [1,3,5] = Lun,Mer,Ven)"
  }
}
```

**Fonctionnement :**
1. Valide que `end >= start` (sinon erreur 400)
2. Crée l'événement dans MongoDB avec les champs fournis
3. Si `agendaId` fourni :
   - Vérifie que l'agenda existe et appartient à l'utilisateur
   - Ajoute l'événement à cet agenda
4. Sinon :
   - Ajoute à l'agenda par défaut (premier de la liste)
   - Si aucun agenda, crée un agenda "Default"
5. Utilise une transaction MongoDB pour garantir la cohérence

**Réponse :**
```json
{
  "id": "673xyz890def123456789abc",
  "title": "Dentiste",
  "start": "2025-11-25T09:00:00.000Z",
  "end": "2025-11-25T10:00:00.000Z",
  "description": "Contrôle annuel",
  "emoji": "🦷",
  "color": "#ff6b6b",
  "recurrence": {
    "type": "yearly",
    "interval": 1
  },
  "agendaId": "673abc123def456789012345"
}
```

**Codes d'erreur :**
- `400` : Champs manquants ou date de fin < date de début
- `404` : Agenda introuvable
- `403` : Accès non autorisé à cet agenda
- `401` : Token invalide
- `500` : Erreur serveur ou transaction échouée

---

### PUT `/api/events/:id`
**Description :** Met à jour un événement existant (champs, déplacement d'agenda, modification horaire).

**Authentification :** Requise (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**URL Params :**
- `id` : ID de l'événement à modifier

**Body (tous les champs optionnels) :**
```json
{
  "title": "string",
  "start": "ISO date",
  "end": "ISO date",
  "description": "string",
  "emoji": "string",
  "color": "string",
  "agendaId": "string",
  "recurrence": { "type": "none|daily|weekly|monthly|yearly" }
}
```

**Fonctionnement :**
1. Charge l'événement depuis MongoDB
2. Valide que `end >= start` si dates modifiées
3. **Si `agendaId` fourni et différent :**
   - Retire l'événement de TOUS les agendas qui le contiennent
   - Vérifie que le nouvel agenda existe et appartient à l'utilisateur
   - Ajoute l'événement au nouvel agenda
4. Met à jour les champs fournis
5. Sauvegarde l'événement

**Réponse :**
```json
{
  "id": "673xyz890def123456789abc",
  "title": "Dentiste (modifié)",
  "start": "2025-11-25T10:00:00.000Z",
  "end": "2025-11-25T11:00:00.000Z",
  "description": "Contrôle + détartrage",
  "emoji": "🦷",
  "color": "#ff6b6b",
  "recurrence": {
    "type": "yearly",
    "interval": 1
  },
  "agendaId": "691dcc4aed499347d97b5929"
}
```

**Codes d'erreur :**
- `400` : Date de fin < date de début
- `404` : Événement ou nouvel agenda introuvable
- `403` : Accès non autorisé au nouvel agenda
- `401` : Token invalide
- `500` : Erreur serveur

---

### DELETE `/api/events/:id`
**Description :** Supprime définitivement un événement et le retire de tous les agendas.

**Authentification :** Requise (JWT)

**Headers :**
```
Authorization: Bearer <token>
```

**URL Params :**
- `id` : ID de l'événement à supprimer

**Fonctionnement :**
1. Charge l'événement depuis MongoDB
2. Retire l'ID de l'événement de tous les agendas (`$pull` sur tous les agendas)
3. Supprime l'événement de la collection `events`

**Réponse :**
```json
{
  "message": "deleted"
}
```

**Codes d'erreur :**
- `404` : Événement introuvable
- `401` : Token invalide
- `500` : Erreur serveur

---

## Sécurité

### Middleware d'authentification
Toutes les routes `/api/agendas` et `/api/events` passent par le middleware `authMiddleware` qui :
1. Extrait le token du header `Authorization: Bearer <token>`
2. Vérifie et décode le token JWT avec la clé secrète
3. Ajoute `req.user = { id, username }` à la requête
4. Rejette les requêtes avec token invalide/expiré (401)

### Validation des données
- Hashage bcrypt avec 10 rounds pour les mots de passe
- Validation des dates (fin >= début)
- Vérification d'appartenance des agendas à l'utilisateur
- Transactions MongoDB pour garantir la cohérence des données

**Règles de validation :**

| Champ | Règle |
|-------|-------|
| `username` | Requis, 3-30 caractères |
| `password` | Requis, min 6 caractères |
| `agenda.name` | Requis, max 50 caractères |
| `agenda.color` | Optionnel, format hex (#RGB ou #RRGGBB) |
| `event.title` | Requis, max 200 caractères |
| `event.description` | Optionnel, max 1000 caractères |
| `event.start` | Requis, date ISO valide |
| `event.recurrence.type` | none, daily, weekly, monthly, yearly |

---

## Base de données MongoDB

### Collections
- **users** : Utilisateurs avec références aux agendas
- **agendas** : Agendas avec références aux événements
- **events** : Événements autonomes

Tous les documents utilisent des ObjectId MongoDB pour les références.
