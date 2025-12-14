/**
 * Area Service
 * CRUD operations for business areas
 * Requirements: 7.1, 7.2, 7.3, 11.3
 */

const AreaService = {
    /**
     * Get all areas
     * @returns {Promise<Array>} Areas list
     */
    async getAll() {
        try {
            const client = SupabaseService.getClient();
            if (!client) return StateManager.getState('areas') || [];
            
            const { data, error } = await client
                .from('areas')
                .select('*')
                .order('name');
            
            if (error) throw error;
            StateManager.setState('areas', data);
            return data;
        } catch (error) {
            console.error('Failed to fetch areas:', error);
            return StateManager.getState('areas') || [];
        }
    },
    
    /**
     * Create a new area
     * @param {Object} areaData - Area data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Created area
     */
    async create(areaData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const newArea = { id: crypto.randomUUID(), ...areaData, created_at: new Date().toISOString() };
                const areas = [...(StateManager.getState('areas') || []), newArea];
                StateManager.setState('areas', areas);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Area created successfully');
                }
                return newArea;
            }
            
            const { data, error } = await client
                .from('areas')
                .insert([areaData])
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Area created successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to create area:', error);
            if (showToast && typeof Toast !== 'undefined') {
                const message = error.code === '23505' 
                    ? 'An area with this name already exists'
                    : 'Failed to create area. Please try again.';
                Toast.error(message, () => this.create(areaData, options));
            }
            throw error;
        }
    },

    /**
     * Update an area
     * @param {string} id - Area ID
     * @param {Object} areaData - Updated area data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated area
     */
    async update(id, areaData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const areas = StateManager.getState('areas') || [];
                const index = areas.findIndex(a => a.id === id);
                if (index !== -1) {
                    areas[index] = { ...areas[index], ...areaData, updated_at: new Date().toISOString() };
                    StateManager.setState('areas', [...areas]);
                }
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Area updated successfully');
                }
                return areas[index];
            }
            
            const { data, error } = await client
                .from('areas')
                .update({ ...areaData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Area updated successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to update area:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to update area. Please try again.', () => this.update(id, areaData, options));
            }
            throw error;
        }
    },
    
    /**
     * Delete an area with cascade removal from talent_areas
     * @param {string} id - Area ID
     * @param {Object} options - Options for error handling
     * @returns {Promise<void>}
     */
    async delete(id, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                // Remove area from all talents (cascade in local state)
                const talents = StateManager.getState('talents') || [];
                const updatedTalents = talents.map(talent => ({
                    ...talent,
                    areas: (talent.areas || []).filter(areaId => areaId !== id)
                }));
                StateManager.setState('talents', updatedTalents);
                
                // Remove the area itself
                const areas = (StateManager.getState('areas') || []).filter(a => a.id !== id);
                StateManager.setState('areas', areas);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Area deleted successfully');
                }
                return;
            }
            
            // First, delete all talent_areas records for this area (cascade)
            const { error: talentAreasError } = await client
                .from('talent_areas')
                .delete()
                .eq('area_id', id);
            
            if (talentAreasError) throw talentAreasError;
            
            // Then delete the area itself
            const { error } = await client
                .from('areas')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Refresh both areas and talents to reflect the cascade
            await this.getAll();
            
            // Also refresh talents to update their areas arrays
            if (typeof TalentService !== 'undefined' && TalentService.getAll) {
                await TalentService.getAll();
            }
            
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Area deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete area:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to delete area. Please try again.', () => this.delete(id, options));
            }
            throw error;
        }
    },

    /**
     * Get talents that have a specific area assigned
     * @param {string} areaId - Area ID
     * @returns {Promise<Array>} Talents with this area
     */
    async getTalentsWithArea(areaId) {
        const talents = StateManager.getState('talents') || [];
        return talents.filter(talent => (talent.areas || []).includes(areaId));
    }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AreaService;
}