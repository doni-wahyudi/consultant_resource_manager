/**
 * Edit Guard Service
 * Requires authentication for edit operations while allowing read-only access
 */

const EditGuard = {
    /**
     * Check if user can edit. If not authenticated, show login prompt.
     * @returns {Promise<boolean>} True if user can proceed with edit
     */
    async canEdit() {
        if (AuthService.isAuthenticated()) {
            return true;
        }
        
        // Show login prompt
        return this.showLoginPrompt();
    },
    
    /**
     * Show login prompt modal
     * @returns {Promise<boolean>} True if user logged in successfully
     */
    showLoginPrompt() {
        return new Promise((resolve) => {
            Modal.show({
                title: 'Login Required',
                content: `
                    <div class="login-prompt">
                        <p class="login-prompt-message">You need to sign in to make changes.</p>
                        <form id="quick-login-form">
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" id="quick-login-email" class="form-input" placeholder="Enter your email" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Password</label>
                                <input type="password" id="quick-login-password" class="form-input" placeholder="Enter your password" required>
                            </div>
                            <p class="login-prompt-hint">Don't have an account? <a href="#/signup" class="auth-link" id="quick-signup-link">Sign up</a></p>
                        </form>
                    </div>
                `,
                footer: `
                    <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                    <button class="btn btn-primary" data-action="login" id="quick-login-btn">Sign In</button>
                `,
                size: 'sm'
            });
            
            const form = document.getElementById('quick-login-form');
            const loginBtn = document.getElementById('quick-login-btn');
            const signupLink = document.getElementById('quick-signup-link');
            
            const handleLogin = async () => {
                const email = document.getElementById('quick-login-email')?.value;
                const password = document.getElementById('quick-login-password')?.value;
                
                if (!email || !password) {
                    Toast.error('Please fill in all fields');
                    return;
                }
                
                loginBtn.disabled = true;
                loginBtn.textContent = 'Signing in...';
                
                const { data, error } = await AuthService.signIn(email, password);
                
                if (error) {
                    Toast.error(error.message || 'Failed to sign in');
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign In';
                    return;
                }
                
                Toast.success('Signed in successfully');
                Modal.hide();
                resolve(true);
            };
            
            form?.addEventListener('submit', (e) => {
                e.preventDefault();
                handleLogin();
            });
            
            signupLink?.addEventListener('click', (e) => {
                e.preventDefault();
                Modal.hide();
                Router.navigate('signup');
                resolve(false);
            });
            
            document.querySelector('.modal-footer')?.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                if (action === 'cancel') {
                    Modal.hide();
                    resolve(false);
                } else if (action === 'login') {
                    handleLogin();
                }
            });
        });
    },
    
    /**
     * Wrap an async function to require auth
     * @param {Function} fn - Function to wrap
     * @returns {Function} Wrapped function
     */
    requireAuth(fn) {
        return async (...args) => {
            if (await this.canEdit()) {
                return fn(...args);
            }
            return null;
        };
    }
};
