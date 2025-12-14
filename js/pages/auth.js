/**
 * Authentication Page
 * Login and Sign Up functionality
 */

const AuthPage = {
    mode: 'login', // 'login', 'signup', 'forgot'

    render(initialMode = 'login') {
        this.mode = initialMode;
        const container = document.getElementById('page-auth');

        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1 class="auth-logo">NIN</h1>
                        <p class="auth-subtitle">Consultant Resource Manager</p>
                    </div>
                    <div id="auth-form-container"></div>
                </div>
            </div>
        `;

        this.renderForm();
    },

    renderForm() {
        const container = document.getElementById('auth-form-container');
        if (!container) return;

        switch (this.mode) {
            case 'signup':
                this.renderSignUpForm(container);
                break;
            case 'forgot':
                this.renderForgotForm(container);
                break;
            default:
                this.renderLoginForm(container);
        }
    },

    renderLoginForm(container) {
        container.innerHTML = `
            <form id="login-form" class="auth-form">
                <h2 class="auth-title">Welcome Back</h2>
                <p class="auth-description">Sign in to your account to continue</p>
                
                <div class="form-group">
                    <label class="form-label" for="login-email">Email</label>
                    <input type="email" id="login-email" class="form-input" placeholder="Enter your email" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="login-password">Password</label>
                    <input type="password" id="login-password" class="form-input" placeholder="Enter your password" required>
                </div>
                
                <div class="form-group">
                    <button type="button" class="auth-link" id="forgot-password-link">Forgot password?</button>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block" id="login-btn">Sign In</button>
                
                <div class="auth-footer">
                    <span>Don't have an account?</span>
                    <button type="button" class="auth-link" id="signup-link">Sign Up</button>
                </div>
            </form>
        `;

        this.setupLoginListeners();
    },

    renderSignUpForm(container) {
        container.innerHTML = `
            <form id="signup-form" class="auth-form">
                <h2 class="auth-title">Create Account</h2>
                <p class="auth-description">Sign up to get started</p>
                
                <div class="form-group">
                    <label class="form-label" for="signup-name">Full Name</label>
                    <input type="text" id="signup-name" class="form-input" placeholder="Enter your name" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="signup-email">Email</label>
                    <input type="email" id="signup-email" class="form-input" placeholder="Enter your email" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="signup-password">Password</label>
                    <input type="password" id="signup-password" class="form-input" placeholder="Create a password (min 6 characters)" required minlength="6">
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="signup-confirm">Confirm Password</label>
                    <input type="password" id="signup-confirm" class="form-input" placeholder="Confirm your password" required>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block" id="signup-btn">Create Account</button>
                
                <div class="auth-footer">
                    <span>Already have an account?</span>
                    <button type="button" class="auth-link" id="login-link">Sign In</button>
                </div>
            </form>
        `;

        this.setupSignUpListeners();
    },

    renderForgotForm(container) {
        container.innerHTML = `
            <form id="forgot-form" class="auth-form">
                <h2 class="auth-title">Reset Password</h2>
                <p class="auth-description">Enter your email to receive a password reset link</p>
                
                <div class="form-group">
                    <label class="form-label" for="forgot-email">Email</label>
                    <input type="email" id="forgot-email" class="form-input" placeholder="Enter your email" required>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block" id="forgot-btn">Send Reset Link</button>
                
                <div class="auth-footer">
                    <button type="button" class="auth-link" id="back-to-login">Back to Sign In</button>
                </div>
            </form>
        `;

        this.setupForgotListeners();
    },

    setupLoginListeners() {
        const form = document.getElementById('login-form');
        const signupLink = document.getElementById('signup-link');
        const forgotLink = document.getElementById('forgot-password-link');

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        signupLink?.addEventListener('click', () => {
            this.mode = 'signup';
            this.renderForm();
        });

        forgotLink?.addEventListener('click', () => {
            this.mode = 'forgot';
            this.renderForm();
        });
    },

    setupSignUpListeners() {
        const form = document.getElementById('signup-form');
        const loginLink = document.getElementById('login-link');

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSignUp();
        });

        loginLink?.addEventListener('click', () => {
            this.mode = 'login';
            this.renderForm();
        });
    },

    setupForgotListeners() {
        const form = document.getElementById('forgot-form');
        const backLink = document.getElementById('back-to-login');

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword();
        });

        backLink?.addEventListener('click', () => {
            this.mode = 'login';
            this.renderForm();
        });
    },

    async handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        const btn = document.getElementById('login-btn');

        if (!email || !password) {
            Toast.error('Please fill in all fields');
            return;
        }

        LoadingUI.setButtonLoading(btn);

        const { data, error } = await AuthService.signIn(email, password);

        LoadingUI.clearButtonLoading(btn);

        if (error) {
            Toast.error(error.message || 'Failed to sign in');
            return;
        }

        Toast.success('Welcome back!');
        Router.navigate('dashboard');
    },

    async handleSignUp() {
        const name = document.getElementById('signup-name')?.value;
        const email = document.getElementById('signup-email')?.value;
        const password = document.getElementById('signup-password')?.value;
        const confirm = document.getElementById('signup-confirm')?.value;
        const btn = document.getElementById('signup-btn');

        if (!name || !email || !password || !confirm) {
            Toast.error('Please fill in all fields');
            return;
        }

        if (password !== confirm) {
            Toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Toast.error('Password must be at least 6 characters');
            return;
        }

        LoadingUI.setButtonLoading(btn);

        const { data, error } = await AuthService.signUp(email, password, {
            full_name: name,
        });

        LoadingUI.clearButtonLoading(btn);

        if (error) {
            Toast.error(error.message || 'Failed to create account');
            return;
        }

        Toast.success('Account created! Please check your email to verify.');
        this.mode = 'login';
        this.renderForm();
    },

    async handleForgotPassword() {
        const email = document.getElementById('forgot-email')?.value;
        const btn = document.getElementById('forgot-btn');

        if (!email) {
            Toast.error('Please enter your email');
            return;
        }

        LoadingUI.setButtonLoading(btn);

        const { error } = await AuthService.resetPassword(email);

        LoadingUI.clearButtonLoading(btn);

        if (error) {
            Toast.error(error.message || 'Failed to send reset link');
            return;
        }

        Toast.success('Password reset link sent to your email');
        this.mode = 'login';
        this.renderForm();
    },
};
