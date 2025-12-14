/**
 * Error Handler Service
 * Centralized error handling with toast notifications and retry functionality
 * Requirements: 11.3
 */

const ErrorHandler = {
    /**
     * Error types for categorization
     */
    ErrorTypes: {
        NETWORK: 'network',
        VALIDATION: 'validation',
        CONFLICT: 'conflict',
        DATABASE: 'database',
        UNKNOWN: 'unknown'
    },
    
    /**
     * Wrap an async operation with error handling
     * @param {Function} operation - Async operation to execute
     * @param {Object} options - Options for error handling
     * @param {string} options.context - Context description for error messages
     * @param {boolean} options.showToast - Whether to show toast on error (default: true)
     * @param {Function} options.onRetry - Retry callback function
     * @param {*} options.fallback - Fallback value on error
     * @returns {Promise<*>} Operation result or fallback
     */
    async wrap(operation, options = {}) {
        const {
            context = 'Operation',
            showToast = true,
            onRetry = null,
            fallback = null
        } = options;
        
        try {
            return await operation();
        } catch (error) {
            const errorInfo = this.categorizeError(error);
            const message = this.formatErrorMessage(errorInfo, context);
            
            console.error(`${context} failed:`, error);
            
            if (showToast && typeof Toast !== 'undefined') {
                if (errorInfo.retryable && onRetry) {
                    Toast.error(message, onRetry);
                } else {
                    Toast.error(message);
                }
            }
            
            if (fallback !== null) {
                return fallback;
            }
            
            throw error;
        }
    },
    
    /**
     * Categorize an error by type
     * @param {Error} error - Error to categorize
     * @returns {Object} Error info with type, message, and retryable flag
     */
    categorizeError(error) {
        // Network errors
        if (this.isNetworkError(error)) {
            return {
                type: this.ErrorTypes.NETWORK,
                message: 'Network connection failed',
                details: error.message,
                retryable: true
            };
        }
        
        // Supabase/Database errors
        if (error.code) {
            // PostgreSQL error codes
            switch (error.code) {
                case '23505': // unique_violation
                    return {
                        type: this.ErrorTypes.CONFLICT,
                        message: 'A record with this value already exists',
                        details: error.message,
                        retryable: false
                    };
                case '23503': // foreign_key_violation
                    return {
                        type: this.ErrorTypes.DATABASE,
                        message: 'Cannot complete operation due to related records',
                        details: error.message,
                        retryable: false
                    };
                case '42P01': // undefined_table
                    return {
                        type: this.ErrorTypes.DATABASE,
                        message: 'Database table not found. Please run migrations.',
                        details: error.message,
                        retryable: false
                    };
                default:
                    return {
                        type: this.ErrorTypes.DATABASE,
                        message: 'Database operation failed',
                        details: error.message,
                        retryable: true
                    };
            }
        }
        
        // Validation errors
        if (error.name === 'ValidationError' || error.message?.includes('validation')) {
            return {
                type: this.ErrorTypes.VALIDATION,
                message: error.message || 'Invalid data provided',
                details: error.message,
                retryable: false
            };
        }
        
        // Unknown errors
        return {
            type: this.ErrorTypes.UNKNOWN,
            message: error.message || 'An unexpected error occurred',
            details: error.message,
            retryable: true
        };
    },
    
    /**
     * Check if error is a network error
     * @param {Error} error - Error to check
     * @returns {boolean} True if network error
     */
    isNetworkError(error) {
        return (
            error.name === 'TypeError' && error.message?.includes('fetch') ||
            error.message?.includes('network') ||
            error.message?.includes('Network') ||
            error.message?.includes('ECONNREFUSED') ||
            error.message?.includes('ETIMEDOUT') ||
            error.message?.includes('Failed to fetch')
        );
    },
    
    /**
     * Format error message for display
     * @param {Object} errorInfo - Categorized error info
     * @param {string} context - Operation context
     * @returns {string} Formatted error message
     */
    formatErrorMessage(errorInfo, context) {
        const contextLower = context.toLowerCase();
        
        switch (errorInfo.type) {
            case this.ErrorTypes.NETWORK:
                return `Failed to ${contextLower}. Please check your internet connection.`;
            case this.ErrorTypes.VALIDATION:
                return errorInfo.message;
            case this.ErrorTypes.CONFLICT:
                return `${context} failed: ${errorInfo.message}`;
            case this.ErrorTypes.DATABASE:
                return `${context} failed: ${errorInfo.message}`;
            default:
                return `${context} failed. Please try again.`;
        }
    },
    
    /**
     * Show success toast
     * @param {string} message - Success message
     */
    success(message) {
        if (typeof Toast !== 'undefined') {
            Toast.success(message);
        }
    },
    
    /**
     * Show error toast with optional retry
     * @param {string} message - Error message
     * @param {Function} onRetry - Optional retry callback
     */
    error(message, onRetry = null) {
        if (typeof Toast !== 'undefined') {
            Toast.error(message, onRetry);
        }
    },
    
    /**
     * Show warning toast
     * @param {string} message - Warning message
     */
    warning(message) {
        if (typeof Toast !== 'undefined') {
            Toast.warning(message);
        }
    }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
