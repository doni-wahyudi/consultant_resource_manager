/**
 * Activity Log Service
 * Tracks user actions for audit trail
 */

const ActivityLogService = {
    /**
     * Log an activity
     * @param {string} action - Action type (created, updated, deleted)
     * @param {string} entityType - Entity type (talent, project, client, allocation)
     * @param {string} entityId - Entity ID
     * @param {string} entityName - Entity name for display
     * @param {Object} details - Additional details
     */
    async log(action, entityType, entityId, entityName, details = null) {
        const user = AuthService.getUser();
        
        const logEntry = {
            user_id: user?.id || null,
            user_email: user?.email || 'Anonymous',
            action,
            entity_type: entityType,
            entity_id: entityId,
            entity_name: entityName,
            details,
            created_at: new Date().toISOString()
        };
        
        // Try to save to Supabase
        const client = SupabaseService.getClient();
        if (client) {
            try {
                await client.from('activity_logs').insert(logEntry);
            } catch (error) {
                console.warn('Failed to save activity log to database:', error);
            }
        }
        
        // Also store locally for offline/demo mode
        this.saveLocal(logEntry);
    },
    
    /**
     * Save log entry to localStorage
     */
    saveLocal(entry) {
        try {
            const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            logs.unshift(entry);
            localStorage.setItem('activityLogs', JSON.stringify(logs.slice(0, 100)));
        } catch (e) {
            console.warn('Failed to save activity log locally');
        }
    },
    
    /**
     * Get activity logs
     * @param {number} limit - Number of logs to fetch
     * @returns {Promise<Array>} Activity logs
     */
    async getAll(limit = 50) {
        const client = SupabaseService.getClient();
        
        if (client) {
            try {
                const { data, error } = await client
                    .from('activity_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(limit);
                
                if (!error && data) {
                    return data;
                }
            } catch (error) {
                console.warn('Failed to fetch activity logs from database');
            }
        }
        
        // Fallback to local storage
        try {
            return JSON.parse(localStorage.getItem('activityLogs') || '[]');
        } catch (e) {
            return [];
        }
    },
    
    /**
     * Format action for display
     */
    formatAction(action) {
        const actions = {
            'created': 'Created',
            'updated': 'Updated',
            'deleted': 'Deleted',
            'assigned': 'Assigned',
            'unassigned': 'Unassigned',
            'status_changed': 'Changed status of'
        };
        return actions[action] || action;
    },
    
    /**
     * Format entity type for display
     */
    formatEntityType(type) {
        const types = {
            'talent': 'Talent',
            'project': 'Project',
            'client': 'Client',
            'allocation': 'Allocation',
            'area': 'Business Area'
        };
        return types[type] || type;
    },
    
    /**
     * Get icon for entity type
     */
    getEntityIcon(type) {
        const icons = {
            'talent': '👤',
            'project': '📁',
            'client': '🏢',
            'allocation': '📅',
            'area': '🏷️'
        };
        return icons[type] || '📝';
    }
};
