// Service de messages Toast pour remplacer les alert()
// Fournit des notifications visuelles non-bloquantes

class ToastService {
    constructor() {
        this.container = null;
        this.defaultDuration = 4000;
        this.init();
    }

    /**
     * Initialise le conteneur de toasts
     */
    init() {
        if (document.getElementById('toast-container')) {
            this.container = document.getElementById('toast-container');
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.container);

        // Injecte les styles si pas déjà présents
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                #toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 400px;
                    pointer-events: none;
                }

                .toast {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: 12px;
                    background: rgba(30, 30, 40, 0.95);
                    backdrop-filter: blur(10px);
                    color: #fff;
                    font-size: 14px;
                    line-height: 1.4;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    transform: translateX(120%);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: auto;
                    border-left: 4px solid;
                }

                .toast.show {
                    transform: translateX(0);
                    opacity: 1;
                }

                .toast.hide {
                    transform: translateX(120%);
                    opacity: 0;
                }

                .toast-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }

                .toast-content {
                    flex: 1;
                    min-width: 0;
                }

                .toast-title {
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .toast-message {
                    opacity: 0.9;
                    word-wrap: break-word;
                }

                .toast-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.6);
                    cursor: pointer;
                    padding: 0;
                    font-size: 18px;
                    line-height: 1;
                    transition: color 0.2s;
                }

                .toast-close:hover {
                    color: #fff;
                }

                /* Types de toast */
                .toast.success {
                    border-left-color: #10b981;
                }
                .toast.success .toast-icon { color: #10b981; }

                .toast.error {
                    border-left-color: #ef4444;
                }
                .toast.error .toast-icon { color: #ef4444; }

                .toast.warning {
                    border-left-color: #f59e0b;
                }
                .toast.warning .toast-icon { color: #f59e0b; }

                .toast.info {
                    border-left-color: #3b82f6;
                }
                .toast.info .toast-icon { color: #3b82f6; }

                /* Responsive */
                @media (max-width: 480px) {
                    #toast-container {
                        left: 10px;
                        right: 10px;
                        max-width: none;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Affiche un toast
     * @param {Object} options - Options du toast
     * @returns {HTMLElement} L'élément toast créé
     */
    show({ message, title = '', type = 'info', duration = this.defaultDuration }) {
        if (!this.container) this.init();

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${this._escapeHtml(title)}</div>` : ''}
                <div class="toast-message">${this._escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Fermer">×</button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this._removeToast(toast));

        this.container.appendChild(toast);

        // Animation d'entrée
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-remove après duration
        if (duration > 0) {
            setTimeout(() => this._removeToast(toast), duration);
        }

        return toast;
    }

    /**
     * Supprime un toast avec animation
     */
    _removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.remove('show');
        toast.classList.add('hide');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Échappe le HTML pour éviter les XSS
     */
    _escapeHtml(str) {
        if (typeof str !== 'string') return str;
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Méthodes de convenance
    success(message, title = '') {
        return this.show({ message, title, type: 'success' });
    }

    error(message, title = 'Erreur') {
        return this.show({ message, title, type: 'error', duration: 6000 });
    }

    warning(message, title = 'Attention') {
        return this.show({ message, title, type: 'warning', duration: 5000 });
    }

    info(message, title = '') {
        return this.show({ message, title, type: 'info' });
    }
}

// Instance globale
const Toast = new ToastService();
