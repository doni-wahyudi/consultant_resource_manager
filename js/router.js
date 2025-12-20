/**
 * Client-side Router
 * Hash-based routing for single-page application
 * Requirements: 6.1
 */

const Router = {
    routes: {},
    currentPage: null,
    
    /**
     * Initialize the router
     */
    init() {
        // Register default routes
        this.registerRoutes();
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle initial route
        this.handleRoute();
        
        // Set up navigation link handlers
        this.setupNavLinks();
        
        // Set up mobile navigation
        this.setupMobileNav();
    },
    
    /**
     * Register all application routes
     */
    registerRoutes() {
        this.routes = {
            'login': { page: 'auth', render: () => AuthPage.render('login'), public: true },
            'signup': { page: 'auth', render: () => AuthPage.render('signup'), public: true },
            'forgot-password': { page: 'auth', render: () => AuthPage.render('forgot'), public: true },
            'dashboard': { page: 'dashboard', render: () => DashboardPage.render() },
            'calendar': { page: 'calendar', render: () => CalendarPage.render() },
            'talents': { page: 'talents', render: () => TalentsPage.render() },
            'talent': { page: 'talent-detail', render: (id) => TalentDetailPage.render(id) },
            'projects': { page: 'projects', render: () => ProjectsPage.render() },
            'completed': { page: 'completed', render: () => CompletedPage.render() },
            'clients': { page: 'clients', render: () => ClientsPage.render() },
            'settings': { page: 'settings', render: () => SettingsPage.render() }
        };
    },
    
    /**
     * Handle route changes
     */
    handleRoute() {
        const hash = window.location.hash.slice(2) || 'dashboard'; // Remove '#/'
        const [routeName, ...params] = hash.split('/');
        
        const route = this.routes[routeName];
        const isAuthenticated = StateManager.getState('auth.isAuthenticated');
        
        // Handle auth routes
        if (route) {
            // If route is public (auth pages), show it
            if (route.public) {
                // If already authenticated, redirect to dashboard
                if (isAuthenticated) {
                    this.navigate('dashboard');
                    return;
                }
                this.showAuthPage(route.page);
                route.render(params[0]);
                return;
            }
            
            // For protected routes, check authentication
            if (!isAuthenticated && this.requiresAuth) {
                this.navigate('login');
                return;
            }
            
            this.showPage(route.page);
            route.render(params[0]);
            StateManager.setState('ui.currentPage', routeName);
            this.updateActiveNavLink(routeName);
        } else {
            // Default to dashboard or login
            this.navigate(isAuthenticated ? 'dashboard' : 'login');
        }
    },
    
    /**
     * Whether routes require authentication (can be disabled for demo)
     */
    requiresAuth: false,
    
    /**
     * Enable or disable auth requirement
     * @param {boolean} required - Whether auth is required
     */
    setAuthRequired(required) {
        this.requiresAuth = required;
    },
    
    /**
     * Show auth page (hides nav)
     * @param {string} pageName - Page name
     */
    showAuthPage(pageName) {
        document.body.classList.add('auth-page');
        
        // Hide all pages
        document.querySelectorAll('.page-container').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show auth page
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    },
    
    /**
     * Navigate to a route
     * @param {string} routeName - Route name
     * @param {string} [param] - Optional route parameter
     */
    navigate(routeName, param) {
        const path = param ? `${routeName}/${param}` : routeName;
        window.location.hash = `/${path}`;
    },
    
    /**
     * Show a specific page container
     * @param {string} pageName - Page container name
     */
    showPage(pageName) {
        // Remove auth page class
        document.body.classList.remove('auth-page');
        
        // Hide all pages
        document.querySelectorAll('.page-container').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show target page
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    },
    
    /**
     * Set up navigation link click handlers
     */
    setupNavLinks() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = link.dataset.page;
                if (page) {
                    e.preventDefault();
                    this.navigate(page);
                    // Close mobile nav after navigation
                    this.closeMobileNav();
                }
            });
        });
    },
    
    /**
     * Update active state on navigation links
     * @param {string} routeName - Current route name
     */
    updateActiveNavLink(routeName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === routeName) {
                link.classList.add('active');
            }
        });
    },
    
    /**
     * Refresh the current page
     */
    refresh() {
        this.handleRoute();
    },
    
    /**
     * Set up mobile navigation toggle and overlay
     */
    setupMobileNav() {
        const navToggle = document.getElementById('nav-toggle');
        const navSidebar = document.getElementById('nav-sidebar');
        const navOverlay = document.getElementById('nav-overlay');
        
        if (navToggle && navSidebar) {
            // Handle click/touch on hamburger button
            navToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navSidebar.classList.toggle('open');
                if (navOverlay) {
                    navOverlay.classList.toggle('active');
                }
            });
        }
        
        if (navOverlay) {
            // Close when clicking overlay
            navOverlay.addEventListener('click', () => {
                this.closeMobileNav();
            });
        }
        
        // Close navigation when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navSidebar && navSidebar.classList.contains('open')) {
                this.closeMobileNav();
            }
        });
    },
    
    /**
     * Close mobile navigation
     */
    closeMobileNav() {
        const navSidebar = document.getElementById('nav-sidebar');
        const navOverlay = document.getElementById('nav-overlay');
        
        if (navSidebar) {
            navSidebar.classList.remove('open');
        }
        if (navOverlay) {
            navOverlay.classList.remove('active');
        }
    },
    
    /**
     * Get current route name
     * @returns {string} Current route name
     */
    getCurrentRoute() {
        const hash = window.location.hash.slice(2) || 'dashboard';
        const [routeName] = hash.split('/');
        return routeName;
    },
    
    /**
     * Check if a route is active
     * @param {string} routeName - Route name to check
     * @returns {boolean} Whether the route is active
     */
    isActive(routeName) {
        return this.getCurrentRoute() === routeName;
    }
};
