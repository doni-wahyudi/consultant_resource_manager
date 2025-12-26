/**
 * Application Configuration
 * Supabase connection settings
 * 
 * INSTRUCTIONS: Copy this file to config.js and fill in your Supabase credentials
 */

const Config = {
    // Supabase Configuration
    // Replace these values with your Supabase project credentials
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

    // Application Settings
    APP_NAME: 'Consultant Resource Manager',

    // Default values
    DEFAULT_PAGE: 'dashboard',

    // Toast notification duration (ms)
    TOAST_DURATION: 4000,

    // Data persistence timeout (ms)
    PERSIST_TIMEOUT: 2000
};

// Validate configuration
if (Config.SUPABASE_URL === 'YOUR_SUPABASE_URL' || Config.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('⚠️ Supabase configuration not set. Please update js/config.js with your Supabase credentials.');
}
