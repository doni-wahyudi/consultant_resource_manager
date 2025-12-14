/**
 * Loading UI Component
 * Provides loading states and skeleton loaders
 * Requirements: 11.4
 */

const LoadingUI = {
    /**
     * Show inline loading spinner in a container
     * @param {HTMLElement|string} container - Container element or selector
     * @param {string} message - Optional loading message
     */
    showInline(container, message = 'Loading...') {
        const el = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!el) return;
        
        el.innerHTML = `
            <div class="loading-inline">
                <span class="spinner-inline"></span>
                <span>${message}</span>
            </div>
        `;
    },
    
    /**
     * Show skeleton loader for a table
     * @param {HTMLElement|string} container - Container element or selector
     * @param {number} rows - Number of skeleton rows
     * @param {number} cols - Number of columns
     */
    showTableSkeleton(container, rows = 5, cols = 4) {
        const el = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!el) return;
        
        const skeletonRows = Array(rows).fill(0).map(() => `
            <tr>
                ${Array(cols).fill(0).map(() => `
                    <td><div class="skeleton skeleton-text" style="width: ${60 + Math.random() * 40}%"></div></td>
                `).join('')}
            </tr>
        `).join('');
        
        el.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        ${Array(cols).fill(0).map(() => `
                            <th><div class="skeleton skeleton-text" style="width: 70%"></div></th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${skeletonRows}
                </tbody>
            </table>
        `;
    },
    
    /**
     * Show skeleton loader for cards
     * @param {HTMLElement|string} container - Container element or selector
     * @param {number} count - Number of skeleton cards
     */
    showCardsSkeleton(container, count = 3) {
        const el = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!el) return;
        
        const skeletonCards = Array(count).fill(0).map(() => `
            <div class="metric-card">
                <div class="skeleton skeleton-avatar" style="width: 40px; height: 40px; margin-bottom: 12px;"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text" style="width: 50%"></div>
            </div>
        `).join('');
        
        el.innerHTML = skeletonCards;
    },
    
    /**
     * Show skeleton loader for a list
     * @param {HTMLElement|string} container - Container element or selector
     * @param {number} count - Number of skeleton items
     */
    showListSkeleton(container, count = 5) {
        const el = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!el) return;
        
        const skeletonItems = Array(count).fill(0).map(() => `
            <div class="list-item">
                <div class="skeleton skeleton-avatar"></div>
                <div class="list-item-content">
                    <div class="skeleton skeleton-text" style="width: 60%"></div>
                    <div class="skeleton skeleton-text" style="width: 40%; height: 10px; margin-top: 8px;"></div>
                </div>
            </div>
        `).join('');
        
        el.innerHTML = skeletonItems;
    },
    
    /**
     * Add loading class to a button
     * @param {HTMLElement|string} button - Button element or selector
     */
    setButtonLoading(button) {
        const el = typeof button === 'string' 
            ? document.querySelector(button) 
            : button;
        
        if (!el) return;
        
        el.classList.add('loading');
        el.disabled = true;
    },
    
    /**
     * Remove loading class from a button
     * @param {HTMLElement|string} button - Button element or selector
     */
    clearButtonLoading(button) {
        const el = typeof button === 'string' 
            ? document.querySelector(button) 
            : button;
        
        if (!el) return;
        
        el.classList.remove('loading');
        el.disabled = false;
    },
    
    /**
     * Show empty state
     * @param {HTMLElement|string} container - Container element or selector
     * @param {Object} options - Empty state options
     */
    showEmptyState(container, options = {}) {
        const el = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!el) return;
        
        const {
            icon = '📭',
            title = 'No data',
            message = 'There is nothing to display yet.',
            actionText = null,
            actionCallback = null,
            variant = '' // 'success', 'warning', 'danger'
        } = options;
        
        el.innerHTML = `
            <div class="empty-state ${variant}">
                <div class="empty-state-icon">${icon}</div>
                <h3 class="empty-state-title">${title}</h3>
                <p class="empty-state-text">${message}</p>
                ${actionText ? `<button class="btn btn-primary empty-state-action">${actionText}</button>` : ''}
            </div>
        `;
        
        if (actionText && actionCallback) {
            el.querySelector('.empty-state-action')?.addEventListener('click', actionCallback);
        }
    },
    
    /**
     * Show error state
     * @param {HTMLElement|string} container - Container element or selector
     * @param {string} message - Error message
     * @param {Function} retryCallback - Optional retry callback
     */
    showErrorState(container, message = 'Something went wrong', retryCallback = null) {
        const el = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!el) return;
        
        el.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3 class="empty-state-title">Error</h3>
                <p class="empty-state-text">${message}</p>
                ${retryCallback ? '<button class="btn btn-primary empty-state-retry">Try Again</button>' : ''}
            </div>
        `;
        
        if (retryCallback) {
            el.querySelector('.empty-state-retry')?.addEventListener('click', retryCallback);
        }
    }
};
