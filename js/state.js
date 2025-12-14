/**
 * State Manager
 * Centralized state management using pub/sub pattern
 */

const StateManager = {
    state: {
        talents: [],
        projects: [],
        allocations: [],
        areas: [],
        clients: [],
        auth: {
            user: null,
            isAuthenticated: false
        },
        ui: {
            currentPage: 'dashboard',
            selectedDate: null,
            draggedTalent: null,
            loading: false,
            selectedTalentId: null
        }
    },
    
    subscribers: {},
    
    /**
     * Subscribe to state changes for a specific key
     * @param {string} key - State key to subscribe to
     * @param {Function} callback - Callback function when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        this.subscribers[key].push(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers[key] = this.subscribers[key].filter(cb => cb !== callback);
        };
    },
    
    /**
     * Update state and notify subscribers
     * @param {string} key - State key to update
     * @param {*} value - New value
     */
    setState(key, value) {
        // Handle nested keys (e.g., 'ui.currentPage')
        const keys = key.split('.');
        let current = this.state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        // Notify subscribers
        this.notifySubscribers(key, value, oldValue);
        
        // Also notify parent key subscribers
        if (keys.length > 1) {
            this.notifySubscribers(keys[0], this.state[keys[0]], null);
        }
    },
    
    /**
     * Get current state value
     * @param {string} key - State key to get
     * @returns {*} Current value
     */
    getState(key) {
        const keys = key.split('.');
        let current = this.state;
        
        for (const k of keys) {
            if (current === undefined) return undefined;
            current = current[k];
        }
        
        return current;
    },
    
    /**
     * Notify all subscribers of a state change
     * @param {string} key - State key that changed
     * @param {*} newValue - New value
     * @param {*} oldValue - Previous value
     */
    notifySubscribers(key, newValue, oldValue) {
        const callbacks = this.subscribers[key] || [];
        callbacks.forEach(callback => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                console.error(`Error in state subscriber for ${key}:`, error);
            }
        });
    }
};
