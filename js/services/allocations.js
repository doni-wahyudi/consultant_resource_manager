/**
 * Allocation Service
 * CRUD operations for resource allocations
 * Requirements: 2.2, 2.5, 9.3, 11.3
 */

const AllocationService = {
    /**
     * Get all allocations
     * @returns {Promise<Array>} Allocations list
     */
    async getAll() {
        try {
            const client = SupabaseService.getClient();
            if (!client) return StateManager.getState('allocations') || [];
            
            const { data, error } = await client
                .from('allocations')
                .select('*')
                .order('start_date');
            
            if (error) throw error;
            StateManager.setState('allocations', data);
            return data;
        } catch (error) {
            console.error('Failed to fetch allocations:', error);
            return StateManager.getState('allocations') || [];
        }
    },
    
    /**
     * Get allocation by ID
     * @param {string} id - Allocation ID
     * @returns {Promise<Object|null>} Allocation or null
     */
    async getById(id) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const allocations = StateManager.getState('allocations') || [];
                return allocations.find(a => a.id === id) || null;
            }
            
            const { data, error } = await client
                .from('allocations')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to fetch allocation:', error);
            return null;
        }
    },
    
    /**
     * Get allocations by date range
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Promise<Array>} Allocations
     */
    async getByDateRange(startDate, endDate) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const allocations = StateManager.getState('allocations') || [];
                return allocations.filter(a => 
                    a.start_date <= endDate && a.end_date >= startDate
                );
            }
            
            const { data, error } = await client
                .from('allocations')
                .select('*')
                .lte('start_date', endDate)
                .gte('end_date', startDate);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to fetch allocations:', error);
            throw error;
        }
    },

    /**
     * Get allocations by talent
     * @param {string} talentId - Talent ID
     * @returns {Promise<Array>} Allocations
     */
    async getByTalent(talentId) {
        const allocations = StateManager.getState('allocations') || [];
        return allocations.filter(a => a.talent_id === talentId);
    },
    
    /**
     * Get allocations by project
     * @param {string} projectId - Project ID
     * @returns {Promise<Array>} Allocations
     */
    async getByProject(projectId) {
        const allocations = StateManager.getState('allocations') || [];
        return allocations.filter(a => a.project_id === projectId);
    },
    
    /**
     * Create a new allocation
     * @param {Object} allocationData - Allocation data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Created allocation
     */
    async create(allocationData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const newAllocation = { id: crypto.randomUUID(), ...allocationData, created_at: new Date().toISOString() };
                const allocations = [...(StateManager.getState('allocations') || []), newAllocation];
                StateManager.setState('allocations', allocations);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Allocation created successfully');
                }
                return newAllocation;
            }
            
            const { data, error } = await client
                .from('allocations')
                .insert([allocationData])
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Allocation created successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to create allocation:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to create allocation. Please try again.', () => this.create(allocationData, options));
            }
            throw error;
        }
    },
    
    /**
     * Update an allocation
     * @param {string} id - Allocation ID
     * @param {Object} allocationData - Updated allocation data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated allocation
     */
    async update(id, allocationData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const allocations = StateManager.getState('allocations') || [];
                const index = allocations.findIndex(a => a.id === id);
                if (index !== -1) {
                    allocations[index] = { ...allocations[index], ...allocationData, updated_at: new Date().toISOString() };
                    StateManager.setState('allocations', [...allocations]);
                }
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Allocation updated successfully');
                }
                return allocations[index];
            }
            
            const { data, error } = await client
                .from('allocations')
                .update({ ...allocationData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Allocation updated successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to update allocation:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to update allocation. Please try again.', () => this.update(id, allocationData, options));
            }
            throw error;
        }
    },
    
    /**
     * Delete an allocation
     * @param {string} id - Allocation ID
     * @param {Object} options - Options for error handling
     * @returns {Promise<void>}
     */
    async delete(id, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const allocations = (StateManager.getState('allocations') || []).filter(a => a.id !== id);
                StateManager.setState('allocations', allocations);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Allocation deleted successfully');
                }
                return;
            }
            
            const { error } = await client
                .from('allocations')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Allocation deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete allocation:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to delete allocation. Please try again.', () => this.delete(id, options));
            }
            throw error;
        }
    },
    
    /**
     * Check for scheduling conflicts
     * @param {string} talentId - Talent ID
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @param {string} excludeId - Allocation ID to exclude (for updates)
     * @returns {Promise<Array>} Conflicting allocations
     */
    async checkConflicts(talentId, startDate, endDate, excludeId = null) {
        const allocations = StateManager.getState('allocations') || [];
        const projects = StateManager.getState('projects') || [];
        
        const conflicts = allocations.filter(a => 
            a.talent_id === talentId &&
            a.id !== excludeId &&
            a.start_date <= endDate &&
            a.end_date >= startDate
        );
        
        // Enrich conflicts with project info for better error messages
        return conflicts.map(conflict => {
            const project = projects.find(p => p.id === conflict.project_id);
            return {
                ...conflict,
                projectName: project ? project.name : 'Unknown Project'
            };
        });
    },
    
    /**
     * Check if a talent is available for a specific date
     * @param {string} talentId - Talent ID
     * @param {string} date - Date to check (YYYY-MM-DD)
     * @returns {boolean} True if available
     */
    isTalentAvailable(talentId, date) {
        const allocations = StateManager.getState('allocations') || [];
        return !allocations.some(a => 
            a.talent_id === talentId && 
            a.start_date <= date && 
            a.end_date >= date
        );
    },
    
    /**
     * Get all allocations for a specific month
     * @param {number} month - Month (0-11)
     * @param {number} year - Year
     * @returns {Promise<Array>} Allocations for the month
     */
    async getByMonth(month, year) {
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        return this.getByDateRange(startDate, endDate);
    }
};
// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AllocationService;
}