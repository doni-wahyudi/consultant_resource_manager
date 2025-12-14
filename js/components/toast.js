/**
 * Toast Notification Component
 * Displays temporary notification messages
 * Requirements: 11.3 (error messages and retry)
 */

const Toast = {
    container: null,
    toastQueue: [],
    maxToasts: 5,
    
    init() {
        this.container = document.getElementById('toast-container');
    },
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {Object} options - Additional options
     * @param {number} options.duration - Duration in milliseconds (0 for persistent)
     * @param {Function} options.onRetry - Retry callback for error toasts
     * @param {string} options.action - Action button text
     * @param {Function} options.onAction - Action button callback
     */
    show(message, type = 'info', options = {}) {
        if (!this.container) {
            this.container = document.getElementById('toast-container');
        }
        
        const {
            duration = this.getDefaultDuration(type),
            onRetry = null,
            action = null,
            onAction = null
        } = options;
        
        // Limit number of visible toasts
        this.enforceMaxToasts();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        
        const icon = this.getIcon(type);
        
        let actionsHtml = '';
        if (onRetry) {
            actionsHtml += `<button class="toast-action toast-retry">Retry</button>`;
        }
        if (action && onAction) {
            actionsHtml += `<button class="toast-action">${action}</button>`;
        }
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            ${actionsHtml ? `<div class="toast-actions">${actionsHtml}</div>` : ''}
            <button class="toast-close" aria-label="Close notification">&times;</button>
        `;
        
        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismiss(toast);
        });
        
        // Retry button handler
        if (onRetry) {
            toast.querySelector('.toast-retry').addEventListener('click', () => {
                this.dismiss(toast);
                onRetry();
            });
        }
        
        // Custom action handler
        if (action && onAction) {
            const actionBtn = toast.querySelector('.toast-action:not(.toast-retry)');
            if (actionBtn) {
                actionBtn.addEventListener('click', () => {
                    this.dismiss(toast);
                    onAction();
                });
            }
        }
        
        // Add progress bar for auto-dismiss
        if (duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'toast-progress';
            progress.style.animationDuration = `${duration}ms`;
            toast.appendChild(progress);
        }
        
        this.container.appendChild(toast);
        this.toastQueue.push(toast);
        
        // Auto dismiss
        if (duration > 0) {
            toast.dismissTimeout = setTimeout(() => this.dismiss(toast), duration);
        }
        
        // Pause auto-dismiss on hover
        toast.addEventListener('mouseenter', () => {
            if (toast.dismissTimeout) {
                clearTimeout(toast.dismissTimeout);
                const progress = toast.querySelector('.toast-progress');
                if (progress) progress.style.animationPlayState = 'paused';
            }
        });
        
        toast.addEventListener('mouseleave', () => {
            if (duration > 0 && !toast.classList.contains('dismissing')) {
                const progress = toast.querySelector('.toast-progress');
                if (progress) progress.style.animationPlayState = 'running';
                toast.dismissTimeout = setTimeout(() => this.dismiss(toast), duration / 2);
            }
        });
        
        return toast;
    },
    
    /**
     * Get default duration based on toast type
     * @param {string} type - Toast type
     * @returns {number} Duration in milliseconds
     */
    getDefaultDuration(type) {
        switch (type) {
            case 'error': return 8000;
            case 'warning': return 5000;
            case 'success': return 4000;
            default: return 4000;
        }
    },
    
    /**
     * Get icon for toast type
     * @param {string} type - Toast type
     * @returns {string} Icon HTML
     */
    getIcon(type) {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            case 'info': return 'ℹ';
            default: return 'ℹ';
        }
    },
    
    /**
     * Enforce maximum number of visible toasts
     */
    enforceMaxToasts() {
        while (this.toastQueue.length >= this.maxToasts) {
            const oldestToast = this.toastQueue.shift();
            if (oldestToast && oldestToast.parentNode) {
                this.dismiss(oldestToast, true);
            }
        }
    },
    
    /**
     * Dismiss a toast
     * @param {HTMLElement} toast - Toast element to dismiss
     * @param {boolean} immediate - Skip animation
     */
    dismiss(toast, immediate = false) {
        if (!toast || toast.classList.contains('dismissing')) return;
        
        toast.classList.add('dismissing');
        
        if (toast.dismissTimeout) {
            clearTimeout(toast.dismissTimeout);
        }
        
        // Remove from queue
        const index = this.toastQueue.indexOf(toast);
        if (index > -1) {
            this.toastQueue.splice(index, 1);
        }
        
        if (immediate) {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        } else {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    },
    
    /**
     * Dismiss all toasts
     */
    dismissAll() {
        [...this.toastQueue].forEach(toast => this.dismiss(toast, true));
    },
    
    /**
     * Show success toast
     * @param {string} message - Message to display
     * @param {Object} options - Additional options
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    },
    
    /**
     * Show error toast with optional retry
     * @param {string} message - Message to display
     * @param {Function} onRetry - Optional retry callback
     */
    error(message, onRetry = null) {
        return this.show(message, 'error', { onRetry });
    },
    
    /**
     * Show warning toast
     * @param {string} message - Message to display
     * @param {Object} options - Additional options
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    },
    
    /**
     * Show info toast
     * @param {string} message - Message to display
     * @param {Object} options - Additional options
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    },
    
    /**
     * Show loading toast (persistent until dismissed)
     * @param {string} message - Message to display
     * @returns {HTMLElement} Toast element (call dismiss to remove)
     */
    loading(message) {
        return this.show(message, 'info', { duration: 0 });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Toast.init());
