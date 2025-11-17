/**
 * NotificationController.js
 * Système de notifications pour les événements à venir
 */

class NotificationController {
    constructor() {
        this.pollingInterval = null;
        this.notifiedEvents = this.loadNotifiedEvents();
        this.requestNotificationPermission();
    }

    /**
     * Demande la permission pour les notifications navigateur
     */
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    /**
     * Démarre le polling synchronisé sur les minutes réelles
     */
    startPolling() {
        if (this.pollingInterval) {
            console.log('⚠️ Polling déjà actif, ignoré');
            return;
        }

        console.log('🚀 Démarrage du système de notifications');
        
        // Vérifier immédiatement
        this.checkNotifications();
        
        // Calculer le temps jusqu'à la prochaine minute pile
        const now = new Date();
        const seconds = now.getSeconds();
        const msUntilNextMinute = (60 - seconds) * 1000 - now.getMilliseconds();
        
        console.log(`⏰ Prochaine vérification dans ${Math.ceil(msUntilNextMinute / 1000)} secondes (à ${new Date(Date.now() + msUntilNextMinute).toLocaleTimeString()})`);
        
        // Attendre jusqu'à la minute suivante
        setTimeout(() => {
            // Vérifier à la minute pile
            this.checkNotifications();
            
            // Puis continuer toutes les minutes
            this.pollingInterval = setInterval(() => {
                this.checkNotifications();
            }, 60000);
        }, msUntilNextMinute);
    }

    /**
     * Arrête le polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('🛑 Système de notifications arrêté');
        }
    }

    /**
     * Vérifie les événements à venir et envoie les notifications
     */
    async checkNotifications() {
        const token = getToken();
        if (!token) {
            console.log('⚠️ Pas de token, vérification ignorée');
            return;
        }

        console.log('🔔 Vérification des notifications...', new Date().toLocaleTimeString());

        try {
            const now = new Date();
            const nowTime = now.getTime();

            // Récupérer tous les événements des prochaines 24h
            const response = await fetch('/api/events', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                console.log('❌ Erreur récupération événements:', response.status);
                return;
            }

            const events = await response.json();
            console.log(`📊 ${events.length} événements trouvés`);
            
            // Log des événements à venir dans les 24h
            const upcomingEvents = events.filter(e => {
                const eventStart = new Date(e.start);
                const timeUntil = eventStart.getTime() - nowTime;
                return timeUntil > 0 && timeUntil < 24 * 60 * 60 * 1000;
            });
            
            if (upcomingEvents.length > 0) {
                console.log(`📅 ${upcomingEvents.length} événement(s) à venir dans les 24h:`);
                upcomingEvents.forEach(e => {
                    const eventStart = new Date(e.start);
                    const minutesUntil = Math.floor((eventStart.getTime() - nowTime) / (60 * 1000));
                    const hoursUntil = Math.floor(minutesUntil / 60);
                    console.log(`  - "${e.title}" dans ${hoursUntil}h${minutesUntil % 60}min (${eventStart.toLocaleString()})`);
                });
            } else {
                console.log('ℹ️ Aucun événement à venir dans les 24h');
            }

            // Utilisation des seuils configurés dans NOTIFICATION_CONFIG
            const thresholds = NOTIFICATION_CONFIG.THRESHOLDS.map(t => ({
                minutes: t.time / (60 * 1000), // Convertir ms en minutes
                label: t.label
            }));

            let notificationsSent = 0;

            events.forEach(event => {
                const eventStart = new Date(event.start);
                const timeUntilEvent = eventStart.getTime() - nowTime;
                
                // Ignorer les événements passés
                if (timeUntilEvent < 0) return;

                // Convertir en minutes pour le log
                const minutesUntil = Math.floor(timeUntilEvent / (60 * 1000));

                thresholds.forEach(threshold => {
                    const thresholdMs = threshold.minutes * 60 * 1000;
                    const timeDiff = Math.abs(timeUntilEvent - thresholdMs);
                    const minutesDiff = Math.floor(timeDiff / (60 * 1000));
                    
                    // Utiliser la fenêtre de tolérance configurée
                    if (timeDiff < NOTIFICATION_CONFIG.TOLERANCE_WINDOW) {
                        const notifKey = `${event._id}-${threshold.minutes}`;
                        
                        console.log(`⏰ Événement "${event.title}" dans ${minutesUntil} min - Seuil ${threshold.label} (diff: ${minutesDiff} min)`);
                        
                        // Vérifier si pas déjà notifié
                        if (!this.notifiedEvents.has(notifKey)) {
                            console.log(`✅ Envoi notification pour "${event.title}" - ${threshold.label}`);
                            this.sendNotification(event, threshold.label);
                            this.notifiedEvents.add(notifKey);
                            this.saveNotifiedEvents();
                            notificationsSent++;
                        } else {
                            console.log(`⏭️ Déjà notifié pour "${event.title}" - ${threshold.label}`);
                        }
                    }
                });
            });

            console.log(`📬 ${notificationsSent} notification(s) envoyée(s)`);

            // Nettoyer les anciennes notifications (>7 jours)
            this.cleanOldNotifications();

        } catch (error) {
            console.error('❌ Erreur notifications:', error);
        }
    }

    /**
     * Envoie une notification navigateur
     */
    sendNotification(event, timeLabel) {
        const title = event.emoji ? `${event.emoji} ${event.title}` : event.title;
        
        // Notification visuelle dans la page
        this.showInPageNotification(title, timeLabel);
        
        // Notification navigateur (si permissions accordées)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Événement à venir', {
                body: `${title} commence dans ${timeLabel}`,
                icon: '/favicon.ico',
                tag: `event-${event._id}` // Évite les doublons
            });
        }
    }

    /**
     * Affiche une notification visuelle dans la page
     */
    showInPageNotification(title, timeLabel) {
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) return;

        // Créer l'élément de notification
        const toast = document.createElement('div');
        toast.className = 'notification-toast warning';
        toast.innerHTML = `
            <div class="notification-toast-icon">🔔</div>
            <div class="notification-toast-content">
                <div class="notification-toast-title">Événement à venir</div>
                <div class="notification-toast-message">${title} commence dans ${timeLabel}</div>
            </div>
            <button class="notification-toast-close" aria-label="Fermer">×</button>
        `;

        // Ajouter au DOM
        notificationArea.appendChild(toast);

        // Bouton fermer
        const closeBtn = toast.querySelector('.notification-toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });

        // Auto-suppression après la durée configurée
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideDown 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, NOTIFICATION_CONFIG.DISPLAY_DURATION);
    }

    /**
     * Charge les notifications depuis localStorage
     */
    loadNotifiedEvents() {
        try {
            const stored = getItem(STORAGE_KEYS.NOTIFIED_EVENTS);
            if (!stored) return new Set();

            // Si c'est déjà un objet, le convertir en string
            let jsonString = stored;
            if (typeof stored === 'object') {
                jsonString = JSON.stringify(stored);
            }

            const data = JSON.parse(jsonString);
            
            // Si ce n'est pas un tableau, réinitialiser
            if (!Array.isArray(data)) {
                console.warn('Format de notifications invalide, réinitialisation');
                setItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify([]));
                return new Set();
            }

            const now = Date.now();
            const retentionPeriod = now - (NOTIFICATION_CONFIG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);

            // Ne garder que les notifications récentes
            const recent = data.filter(item => {
                return item && item.key && item.timestamp && item.timestamp > retentionPeriod;
            });
            
            return new Set(recent.map(item => item.key));
        } catch (error) {
            console.error('Erreur chargement notifications:', error);
            // Réinitialiser en cas d'erreur
            setItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify([]));
            return new Set();
        }
    }

    /**
     * Sauvegarde les notifications dans localStorage
     */
    saveNotifiedEvents() {
        try {
            const now = Date.now();
            const data = Array.from(this.notifiedEvents).map(key => ({
                key,
                timestamp: now
            }));
            setItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify(data));
        } catch (error) {
            console.error('Erreur sauvegarde notifications:', error);
        }
    }

    /**
     * Nettoie les notifications de plus de 7 jours
     */
    cleanOldNotifications() {
        try {
            const stored = getItem(STORAGE_KEYS.NOTIFIED_EVENTS);
            if (!stored) return;

            // Si c'est déjà un objet, le convertir en string
            let jsonString = stored;
            if (typeof stored === 'object') {
                jsonString = JSON.stringify(stored);
            }

            const data = JSON.parse(jsonString);
            
            // Si ce n'est pas un tableau, réinitialiser
            if (!Array.isArray(data)) {
                setItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify([]));
                return;
            }

            const now = Date.now();
            const retentionPeriod = now - (NOTIFICATION_CONFIG.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);

            const recent = data.filter(item => {
                return item && item.key && item.timestamp && item.timestamp > retentionPeriod;
            });
            
            if (recent.length !== data.length) {
                setItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify(recent));
                this.notifiedEvents = new Set(recent.map(item => item.key));
            }
        } catch (error) {
            console.error('Erreur nettoyage notifications:', error);
            // Réinitialiser en cas d'erreur
            setItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify([]));
            this.notifiedEvents = new Set();
        }
    }

    /**
     * Réinitialise toutes les notifications
     */
    clearAll() {
        this.notifiedEvents.clear();
        setItem(STORAGE_KEYS.NOTIFIED_EVENTS, JSON.stringify([]));
        console.log('🗑️ Cache des notifications vidé');
    }

    /**
     * Fonction de debug pour tester les notifications manuellement
     * À appeler depuis la console: app.notificationController.testNotification()
     */
    testNotification() {
        console.log('🧪 Test de notification...');
        const testEvent = {
            _id: 'test-' + Date.now(),
            title: 'Test de notification',
            emoji: '🔔',
            start: new Date(Date.now() + 60 * 60 * 1000) // Dans 1 heure
        };
        this.sendNotification(testEvent, '1 heure (TEST)');
        console.log('✅ Notification de test envoyée');
    }

    /**
     * Fonction de debug pour afficher l'état du système
     */
    debugStatus() {
        console.log('═══════════════════════════════════════');
        console.log('📊 ÉTAT DU SYSTÈME DE NOTIFICATIONS');
        console.log('═══════════════════════════════════════');
        console.log('Polling actif:', !!this.pollingInterval);
        console.log('Événements notifiés:', this.notifiedEvents.size);
        console.log('Liste:', Array.from(this.notifiedEvents));
        console.log('Permission navigateur:', Notification?.permission || 'Non disponible');
        console.log('═══════════════════════════════════════');
    }
}
