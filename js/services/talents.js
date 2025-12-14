/**
 * Talent Service
 * CRUD operations for talents
 * Requirements: 1.1, 1.2, 1.3, 1.5, 6.2, 6.3, 11.3
 */

const TalentService = {
    /**
     * Get all talents
     * @returns {Promise<Array>} Talents list
     */
    async getAll() {
        try {
            const client = SupabaseService.getClient();
            if (!client) return StateManager.getState('talents') || [];
            
            const { data, error } = await client
                .from('talents')
                .select(`*, talent_areas(area_id)`)
                .order('name');
            
            if (error) throw error;
            
            // Transform talent_areas to areas array
            const talents = data.map(t => ({
                ...t,
                areas: t.talent_areas?.map(ta => ta.area_id) || []
            }));
            
            StateManager.setState('talents', talents);
            return talents;
        } catch (error) {
            console.error('Failed to fetch talents:', error);
            return StateManager.getState('talents') || [];
        }
    },
    
    /**
     * Get talent by ID
     * @param {string} id - Talent ID
     * @returns {Promise<Object>} Talent
     */
    async getById(id) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                return (StateManager.getState('talents') || []).find(t => t.id === id);
            }
            
            const { data, error } = await client
                .from('talents')
                .select(`*, talent_areas(area_id)`)
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return { ...data, areas: data.talent_areas?.map(ta => ta.area_id) || [] };
        } catch (error) {
            console.error('Failed to fetch talent:', error);
            throw error;
        }
    },

    /**
     * Create a new talent
     * @param {Object} talentData - Talent data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Created talent
     */
    async create(talentData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const newTalent = { id: crypto.randomUUID(), ...talentData, skills: [], areas: [], created_at: new Date().toISOString() };
                const talents = [...(StateManager.getState('talents') || []), newTalent];
                StateManager.setState('talents', talents);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Talent created successfully');
                }
                return newTalent;
            }
            
            const { data, error } = await client
                .from('talents')
                .insert([{ ...talentData, skills: talentData.skills || [] }])
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Talent created successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to create talent:', error);
            if (showToast && typeof Toast !== 'undefined') {
                const message = error.code === '23505'
                    ? 'A talent with this email already exists'
                    : 'Failed to create talent. Please try again.';
                Toast.error(message, () => this.create(talentData, options));
            }
            throw error;
        }
    },
    
    /**
     * Update a talent
     * @param {string} id - Talent ID
     * @param {Object} talentData - Updated talent data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated talent
     */
    async update(id, talentData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const talents = StateManager.getState('talents') || [];
                const index = talents.findIndex(t => t.id === id);
                if (index !== -1) {
                    talents[index] = { ...talents[index], ...talentData, updated_at: new Date().toISOString() };
                    StateManager.setState('talents', [...talents]);
                }
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Talent updated successfully');
                }
                return talents[index];
            }
            
            const { areas, talent_areas, ...updateData } = talentData;
            const { data, error } = await client
                .from('talents')
                .update({ ...updateData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Talent updated successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to update talent:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to update talent. Please try again.', () => this.update(id, talentData, options));
            }
            throw error;
        }
    },
    
    /**
     * Delete a talent
     * @param {string} id - Talent ID
     * @param {Object} options - Options for error handling
     * @returns {Promise<void>}
     */
    async delete(id, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const talents = (StateManager.getState('talents') || []).filter(t => t.id !== id);
                StateManager.setState('talents', talents);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Talent deleted successfully');
                }
                return;
            }
            
            const { error } = await client
                .from('talents')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Talent deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete talent:', error);
            if (showToast && typeof Toast !== 'undefined') {
                const message = error.code === '23503'
                    ? 'Cannot delete talent with active allocations'
                    : 'Failed to delete talent. Please try again.';
                Toast.error(message, () => this.delete(id, options));
            }
            throw error;
        }
    },

    /**
     * Add skill to talent
     * @param {string} talentId - Talent ID
     * @param {string} skill - Skill to add
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated talent
     */
    async addSkill(talentId, skill, options = {}) {
        const { showToast = true } = options;
        
        try {
            const talents = StateManager.getState('talents') || [];
            const talent = talents.find(t => t.id === talentId);
            if (!talent) throw new Error('Talent not found');
            
            const skills = [...(talent.skills || []), skill];
            return await this.update(talentId, { skills }, { showToast: false });
        } catch (error) {
            console.error('Failed to add skill:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to add skill. Please try again.', () => this.addSkill(talentId, skill, options));
            }
            throw error;
        }
    },
    
    /**
     * Remove skill from talent
     * @param {string} talentId - Talent ID
     * @param {string} skill - Skill to remove
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated talent
     */
    async removeSkill(talentId, skill, options = {}) {
        const { showToast = true } = options;
        
        try {
            const talents = StateManager.getState('talents') || [];
            const talent = talents.find(t => t.id === talentId);
            if (!talent) throw new Error('Talent not found');
            
            const skills = (talent.skills || []).filter(s => s !== skill);
            return await this.update(talentId, { skills }, { showToast: false });
        } catch (error) {
            console.error('Failed to remove skill:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to remove skill. Please try again.', () => this.removeSkill(talentId, skill, options));
            }
            throw error;
        }
    },
    
    /**
     * Assign area to talent
     * @param {string} talentId - Talent ID
     * @param {string} areaId - Area ID
     * @param {Object} options - Options for error handling
     * @returns {Promise<void>}
     */
    async assignArea(talentId, areaId, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const talents = StateManager.getState('talents') || [];
                const index = talents.findIndex(t => t.id === talentId);
                if (index !== -1) {
                    talents[index].areas = [...(talents[index].areas || []), areaId];
                    StateManager.setState('talents', [...talents]);
                }
                return;
            }
            
            const { error } = await client
                .from('talent_areas')
                .insert([{ talent_id: talentId, area_id: areaId }]);
            
            if (error) throw error;
            await this.getAll();
        } catch (error) {
            console.error('Failed to assign area:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to assign area. Please try again.', () => this.assignArea(talentId, areaId, options));
            }
            throw error;
        }
    },
    
    /**
     * Remove area from talent
     * @param {string} talentId - Talent ID
     * @param {string} areaId - Area ID
     * @param {Object} options - Options for error handling
     * @returns {Promise<void>}
     */
    async removeArea(talentId, areaId, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const talents = StateManager.getState('talents') || [];
                const index = talents.findIndex(t => t.id === talentId);
                if (index !== -1) {
                    talents[index].areas = (talents[index].areas || []).filter(a => a !== areaId);
                    StateManager.setState('talents', [...talents]);
                }
                return;
            }
            
            const { error } = await client
                .from('talent_areas')
                .delete()
                .eq('talent_id', talentId)
                .eq('area_id', areaId);
            
            if (error) throw error;
            await this.getAll();
        } catch (error) {
            console.error('Failed to remove area:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to remove area. Please try again.', () => this.removeArea(talentId, areaId, options));
            }
            throw error;
        }
    },
    
    /**
     * Get assignment history for talent
     * @param {string} talentId - Talent ID
     * @returns {Promise<Array>} Assignment history
     */
    async getAssignmentHistory(talentId) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const allocations = StateManager.getState('allocations') || [];
                return allocations.filter(a => a.talent_id === talentId);
            }
            
            const { data, error } = await client
                .from('allocations')
                .select('*, projects(name, color)')
                .eq('talent_id', talentId)
                .order('start_date', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to fetch assignment history:', error);
            // Fallback to state
            const allocations = StateManager.getState('allocations') || [];
            return allocations.filter(a => a.talent_id === talentId);
        }
    }
};

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TalentService;
}