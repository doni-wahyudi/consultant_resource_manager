/**
 * Authentication Service
 * Handles user authentication with Supabase
 */

const AuthService = {
    currentUser: null,

    /**
     * Initialize auth service and check for existing session
     * @returns {Promise<Object|null>} Current user or null
     */
    async init() {
        const client = SupabaseService.getClient();
        if (!client) return null;

        try {
            const {
                data: { session },
            } = await client.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                StateManager.setState('auth.user', session.user);
                StateManager.setState('auth.isAuthenticated', true);
            }
            return this.currentUser;
        } catch (error) {
            console.error('Auth init error:', error);
            return null;
        }
    },

    /**
     * Sign up a new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {Object} metadata - Optional user metadata
     * @returns {Promise<Object>} Result with user or error
     */
    async signUp(email, password, metadata = {}) {
        const client = SupabaseService.getClient();
        if (!client) {
            return { error: { message: 'Database not configured' } };
        }

        try {
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: metadata,
                },
            });

            if (error) throw error;

            return { data, error: null };
        } catch (error) {
            console.error('Sign up error:', error);
            return { data: null, error };
        }
    },

    /**
     * Sign in an existing user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Result with user or error
     */
    async signIn(email, password) {
        const client = SupabaseService.getClient();
        if (!client) {
            return { error: { message: 'Database not configured' } };
        }

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            this.currentUser = data.user;
            StateManager.setState('auth.user', data.user);
            StateManager.setState('auth.isAuthenticated', true);

            return { data, error: null };
        } catch (error) {
            console.error('Sign in error:', error);
            return { data: null, error };
        }
    },

    /**
     * Sign out the current user
     * @returns {Promise<Object>} Result with error if any
     */
    async signOut() {
        const client = SupabaseService.getClient();
        if (!client) {
            return { error: { message: 'Database not configured' } };
        }

        try {
            const { error } = await client.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            StateManager.setState('auth.user', null);
            StateManager.setState('auth.isAuthenticated', false);

            return { error: null };
        } catch (error) {
            console.error('Sign out error:', error);
            return { error };
        }
    },

    /**
     * Send password reset email
     * @param {string} email - User email
     * @returns {Promise<Object>} Result with error if any
     */
    async resetPassword(email) {
        const client = SupabaseService.getClient();
        if (!client) {
            return { error: { message: 'Database not configured' } };
        }

        try {
            const { error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/reset-password`,
            });

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Password reset error:', error);
            return { error };
        }
    },

    /**
     * Update user password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Result with error if any
     */
    async updatePassword(newPassword) {
        const client = SupabaseService.getClient();
        if (!client) {
            return { error: { message: 'Database not configured' } };
        }

        try {
            const { error } = await client.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Update password error:', error);
            return { error };
        }
    },

    /**
     * Get current user
     * @returns {Object|null} Current user or null
     */
    getUser() {
        return this.currentUser;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return !!this.currentUser;
    },

    /**
     * Listen for auth state changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        const client = SupabaseService.getClient();
        if (!client) return () => {};

        const {
            data: { subscription },
        } = client.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            StateManager.setState('auth.user', this.currentUser);
            StateManager.setState('auth.isAuthenticated', !!this.currentUser);
            callback(event, session);
        });

        return () => subscription.unsubscribe();
    },
};
