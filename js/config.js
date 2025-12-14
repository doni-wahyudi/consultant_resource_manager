/**
 * Application Configuration
 * Supabase connection settings
 */

const Config = {
    // Supabase Configuration
    // Replace these values with your Supabase project credentials
    SUPABASE_URL: 'https://gbqbarmemldgfyzilizj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicWJhcm1lbWxkZ2Z5emlsaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzIyMjUsImV4cCI6MjA4MTIwODIyNX0.Cws9umY7qSgkmvhYp0xRDVxrBNNyx48tSUVmrI792Sw',
    
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