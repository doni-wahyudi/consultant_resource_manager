/**
 * Supabase Service
 * Client initialization and connection management
 */

const SupabaseService = {
    client: null,
    
    /**
     * Initialize Supabase client
     * @returns {Object} Supabase client instance
     */
    init() {
        if (this.client) return this.client;
        
        // Check if Supabase library is loaded
        if (typeof supabase === 'undefined') {
            console.error('Supabase library not loaded. Add the Supabase CDN script to your HTML.');
            return null;
        }
        
        // Check configuration
        if (Config.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
            console.warn('Supabase URL not configured');
            return null;
        }
        
        this.client = supabase.createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY);
        return this.client;
    },
    
    /**
     * Get Supabase client instance
     * @returns {Object} Supabase client
     */
    getClient() {
        if (!this.client) {
            this.init();
        }
        return this.client;
    },
    
    /**
     * Test database connection
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            const client = this.getClient();
            if (!client) {
                console.warn('Supabase client not initialized - running in demo mode');
                return true; // Allow app to run without Supabase for demo
            }
            
            // Try a simple query to test connection
            const { error } = await client.from('areas').select('count', { count: 'exact', head: true });
            
            if (error) {
                // Table might not exist yet, but connection works
                if (error.code === '42P01') {
                    console.warn('Database tables not set up yet. Please run the migration script.');
                    return true;
                }
                console.error('Database connection error:', error);
                return false;
            }
            
            console.log('✓ Database connection successful');
            return true;
        } catch (error) {
            console.error('Failed to connect to database:', error);
            return true; // Allow app to run for demo purposes
        }
    },

    /**
     * Execute a query with error handling
     * @param {Function} queryFn - Query function to execute
     * @returns {Promise<Object>} Query result
     */
    async query(queryFn) {
        try {
            const client = this.getClient();
            if (!client) {
                throw new Error('Supabase client not initialized');
            }
            
            const result = await queryFn(client);
            
            if (result.error) {
                throw result.error;
            }
            
            return result.data;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    },
    
    /**
     * Handle database errors
     * @param {Error} error - Error object
     * @returns {Object} Formatted error response
     */
    handleError(error) {
        return {
            type: 'database',
            message: error.message || 'Database operation failed',
            details: error.details || error.hint || '',
            retryable: true,
            suggestedAction: 'Please try again or contact support if the issue persists.'
        };
    }
};