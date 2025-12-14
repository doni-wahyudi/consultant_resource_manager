/**
 * Data Loader Service
 * Handles initial data loading with error handling and retry functionality
 * Requirements: 11.2, 11.4
 */

const DataLoader = {
    maxRetries: 3,
    retryDelay: 1000,
    
    /**
     * Load all initial data from Supabase
     * @returns {Promise<Object>} Loaded data object
     */
    async loadAll() {
        StateManager.setState('ui.loading', true);
        
        const results = {
            areas: [],
            clients: [],
            talents: [],
            projects: [],
            allocations: [],
            errors: []
        };
        
        try {
            // Load all data in parallel with individual error handling
            const [areas, clients, talents, projects, allocations] = await Promise.all([
                this.loadWithRetry(() => AreaService.getAll(), 'areas'),
                this.loadWithRetry(() => ClientService.getAll(), 'clients'),
                this.loadWithRetry(() => TalentService.getAll(), 'talents'),
                this.loadWithRetry(() => ProjectService.getAll(), 'projects'),
                this.loadWithRetry(() => AllocationService.getAll(), 'allocations')
            ]);
            
            results.areas = areas.data;
            results.clients = clients.data;
            results.talents = talents.data;
            results.projects = projects.data;
            results.allocations = allocations.data;
            
            // Collect any errors
            [areas, clients, talents, projects, allocations].forEach(result => {
                if (result.error) {
                    results.errors.push(result.error);
                }
            });
            
            // Update state with loaded data
            StateManager.setState('areas', results.areas);
            StateManager.setState('clients', results.clients);
            StateManager.setState('talents', results.talents);
            StateManager.setState('projects', results.projects);
            StateManager.setState('allocations', results.allocations);
            
            return results;
        } finally {
            StateManager.setState('ui.loading', false);
        }
    },
    
    /**
     * Load data with retry functionality
     * @param {Function} loadFn - Function to load data
     * @param {string} dataType - Type of data being loaded (for error messages)
     * @returns {Promise<Object>} Result with data and error properties
     */
    async loadWithRetry(loadFn, dataType) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const data = await loadFn();
                return { data, error: null };
            } catch (error) {
                lastError = error;
                console.error(`Failed to load ${dataType} (attempt ${attempt}/${this.maxRetries}):`, error);
                
                if (attempt < this.maxRetries) {
                    // Wait before retrying with exponential backoff
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        
        // All retries failed
        return {
            data: [],
            error: {
                type: dataType,
                message: `Failed to load ${dataType} after ${this.maxRetries} attempts`,
                originalError: lastError
            }
        };
    },
    
    /**
     * Reload a specific data type
     * @param {string} dataType - Type of data to reload
     * @returns {Promise<Object>} Result with data and error properties
     */
    async reload(dataType) {
        const loaders = {
            areas: () => AreaService.getAll(),
            clients: () => ClientService.getAll(),
            talents: () => TalentService.getAll(),
            projects: () => ProjectService.getAll(),
            allocations: () => AllocationService.getAll()
        };
        
        if (!loaders[dataType]) {
            throw new Error(`Unknown data type: ${dataType}`);
        }
        
        StateManager.setState('ui.loading', true);
        
        try {
            const result = await this.loadWithRetry(loaders[dataType], dataType);
            
            if (!result.error) {
                StateManager.setState(dataType, result.data);
            }
            
            return result;
        } finally {
            StateManager.setState('ui.loading', false);
        }
    },
    
    /**
     * Reload all data
     * @returns {Promise<Object>} Loaded data object
     */
    async reloadAll() {
        return this.loadAll();
    },
    
    /**
     * Check if all data is loaded
     * @returns {boolean} True if all data types have been loaded
     */
    isDataLoaded() {
        const areas = StateManager.getState('areas');
        const clients = StateManager.getState('clients');
        const talents = StateManager.getState('talents');
        const projects = StateManager.getState('projects');
        const allocations = StateManager.getState('allocations');
        
        return (
            Array.isArray(areas) &&
            Array.isArray(clients) &&
            Array.isArray(talents) &&
            Array.isArray(projects) &&
            Array.isArray(allocations)
        );
    },
    
    /**
     * Get loading status
     * @returns {boolean} True if currently loading
     */
    isLoading() {
        return StateManager.getState('ui.loading') || false;
    },
    
    /**
     * Delay helper for retry backoff
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}
