/**
 * Main Application Entry Point
 * Initializes the Consultant Resource Manager application
 * Requirements: 11.2, 11.4
 */

const App = {
    async init() {
        console.log('Initializing Consultant Resource Manager...');
        
        // Show loading overlay
        this.showLoading(true);
        this.updateLoadingMessage('Connecting to database...');
        
        try {
            // Test Supabase connection
            const connected = await SupabaseService.testConnection();
            if (!connected) {
                Toast.error('Failed to connect to database. Please check your configuration.', () => this.init());
                this.showLoading(false);
                return;
            }
            
            // Initialize authentication
            this.updateLoadingMessage('Checking authentication...');
            await AuthService.init();
            
            // Set up auth state change listener
            this.setupAuthListener();
            
            // Initialize router
            Router.init();
            
            // Load initial data using DataLoader
            this.updateLoadingMessage('Loading data...');
            const loadResult = await this.loadInitialData();
            
            // Handle any errors from data loading
            if (loadResult.errors && loadResult.errors.length > 0) {
                this.handleLoadErrors(loadResult.errors);
            }
            
            // Update user menu in nav
            this.updateUserMenu();
            
            // Navigate to default page
            const isAuthenticated = StateManager.getState('auth.isAuthenticated');
            Router.navigate(isAuthenticated ? 'dashboard' : 'dashboard'); // Allow access without auth for demo
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            Toast.error('Failed to initialize application. Please refresh the page.', () => this.init());
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Set up auth state change listener
     */
    setupAuthListener() {
        AuthService.onAuthStateChange((event) => {
            console.log('Auth state changed:', event);
            this.updateUserMenu();
            
            if (event === 'SIGNED_IN') {
                Router.navigate('dashboard');
            } else if (event === 'SIGNED_OUT') {
                if (Router.requiresAuth) {
                    Router.navigate('login');
                }
            }
        });
    },
    
    /**
     * Update user menu in navigation
     */
    updateUserMenu() {
        const navSidebar = document.getElementById('nav-sidebar');
        if (!navSidebar) return;
        
        // Remove existing user menu
        const existingMenu = navSidebar.querySelector('.nav-user');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const user = AuthService.getUser();
        
        if (user) {
            const userMenu = document.createElement('div');
            userMenu.className = 'nav-user';
            
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            userMenu.innerHTML = `
                <div class="nav-user-info">
                    <div class="nav-user-avatar">${initials}</div>
                    <div>
                        <div class="nav-user-name">${name}</div>
                        <div class="nav-user-email">${user.email || ''}</div>
                    </div>
                </div>
                <button class="btn btn-secondary btn-sm btn-logout" id="logout-btn">Sign Out</button>
            `;
            
            navSidebar.appendChild(userMenu);
            
            // Add logout handler
            document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        }
    },
    
    /**
     * Handle user logout
     */
    async handleLogout() {
        const { error } = await AuthService.signOut();
        
        if (error) {
            Toast.error('Failed to sign out');
            return;
        }
        
        Toast.success('Signed out successfully');
        this.updateUserMenu();
        
        if (Router.requiresAuth) {
            Router.navigate('login');
        }
    },
    
    /**
     * Load initial data using DataLoader service
     * @returns {Promise<Object>} Load result with data and errors
     */
    async loadInitialData() {
        try {
            // Use DataLoader for robust data loading with retry
            const result = await DataLoader.loadAll();
            return result;
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        }
    },
    
    /**
     * Handle errors from data loading
     * @param {Array} errors - Array of error objects
     */
    handleLoadErrors(errors) {
        errors.forEach(error => {
            const message = `Failed to load ${error.type}. Some features may not work correctly.`;
            Toast.error(message, () => this.retryLoad(error.type));
        });
    },
    
    /**
     * Retry loading a specific data type
     * @param {string} dataType - Type of data to reload
     */
    async retryLoad(dataType) {
        this.showLoading(true);
        this.updateLoadingMessage(`Reloading ${dataType}...`);
        
        try {
            const result = await DataLoader.reload(dataType);
            
            if (result.error) {
                Toast.error(`Failed to reload ${dataType}. Please try again.`, () => this.retryLoad(dataType));
            } else {
                Toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} loaded successfully.`);
                // Refresh current page to reflect new data
                Router.refresh();
            }
        } catch (error) {
            console.error(`Failed to retry loading ${dataType}:`, error);
            Toast.error(`Failed to reload ${dataType}. Please try again.`, () => this.retryLoad(dataType));
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Reload all data
     */
    async reloadAllData() {
        this.showLoading(true);
        this.updateLoadingMessage('Reloading all data...');
        
        try {
            const result = await DataLoader.reloadAll();
            
            if (result.errors && result.errors.length > 0) {
                this.handleLoadErrors(result.errors);
            } else {
                Toast.success('All data reloaded successfully.');
            }
            
            // Refresh current page
            Router.refresh();
        } catch (error) {
            console.error('Failed to reload all data:', error);
            Toast.error('Failed to reload data. Please try again.', () => this.reloadAllData());
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Show or hide loading overlay
     * @param {boolean} show - Whether to show the overlay
     */
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
        // Update state so pages can show inline loading states
        StateManager.setState('ui.loading', show);
    },
    
    /**
     * Update loading message
     * @param {string} message - Message to display
     */
    updateLoadingMessage(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            let messageEl = overlay.querySelector('.loading-message');
            if (!messageEl) {
                messageEl = document.createElement('p');
                messageEl.className = 'loading-message';
                overlay.appendChild(messageEl);
            }
            messageEl.textContent = message;
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
