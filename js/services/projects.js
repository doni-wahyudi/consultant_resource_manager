/**
 * Project Service
 * CRUD operations for projects
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.2, 11.3
 */

const ProjectService = {
    usedColors: new Set(),

    /**
     * Get all projects
     * @returns {Promise<Array>} Projects list
     */
    async getAll() {
        try {
            const client = SupabaseService.getClient();
            if (!client) return StateManager.getState('projects') || [];

            // Fetch projects with talents, batches, and attachments
            const { data, error } = await client
                .from('projects')
                .select('*, project_talents(talent_id), project_batches(*), project_attachments(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform project_talents to assigned_talents array and include batches/attachments
            const projects = data.map(p => ({
                ...p,
                assigned_talents: p.project_talents?.map(pt => pt.talent_id) || [],
                batches: p.project_batches || [],
                attachments: p.project_attachments || []
            }));

            // Track used colors
            this.usedColors = new Set(projects.map(p => p.color));

            StateManager.setState('projects', projects);
            return projects;
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            return StateManager.getState('projects') || [];
        }
    },

    /**
     * Get project by ID
     * @param {string} id - Project ID
     * @returns {Promise<Object>} Project
     */
    async getById(id) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                return (StateManager.getState('projects') || []).find(p => p.id === id);
            }

            const { data, error } = await client
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to fetch project:', error);
            throw error;
        }
    },

    /**
     * Create a new project
     * @param {Object} projectData - Project data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Created project
     */
    async create(projectData, options = {}) {
        const { showToast = true } = options;

        try {
            const color = this.generateColor();
            const client = SupabaseService.getClient();

            if (!client) {
                const newProject = {
                    id: crypto.randomUUID(),
                    ...projectData,
                    color,
                    status: 'in_progress',
                    is_paid: false,
                    created_at: new Date().toISOString()
                };
                const projects = [...(StateManager.getState('projects') || []), newProject];
                StateManager.setState('projects', projects);
                this.usedColors.add(color);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Project created successfully');
                }
                return newProject;
            }

            const { data, error } = await client
                .from('projects')
                .insert([{ ...projectData, color, status: 'in_progress', is_paid: false }])
                .select()
                .single();

            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Project created successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to create project:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to create project. Please try again.', () => this.create(projectData, options));
            }
            throw error;
        }
    },

    /**
     * Update a project
     * @param {string} id - Project ID
     * @param {Object} projectData - Updated project data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated project
     */
    async update(id, projectData, options = {}) {
        const { showToast = true } = options;

        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const projects = StateManager.getState('projects') || [];
                const index = projects.findIndex(p => p.id === id);
                if (index !== -1) {
                    projects[index] = { ...projects[index], ...projectData, updated_at: new Date().toISOString() };
                    StateManager.setState('projects', [...projects]);
                }
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Project updated successfully');
                }
                return projects[index];
            }

            const { data, error } = await client
                .from('projects')
                .update({ ...projectData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Project updated successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to update project:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to update project. Please try again.', () => this.update(id, projectData, options));
            }
            throw error;
        }
    },

    /**
     * Delete a project
     * @param {string} id - Project ID
     * @param {Object} options - Options for error handling
     * @returns {Promise<void>}
     */
    async delete(id, options = {}) {
        const { showToast = true } = options;

        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const projects = (StateManager.getState('projects') || []).filter(p => p.id !== id);
                const allocations = (StateManager.getState('allocations') || []).filter(a => a.project_id !== id);
                StateManager.setState('projects', projects);
                StateManager.setState('allocations', allocations);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Project deleted successfully');
                }
                return;
            }

            const { error } = await client
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await this.getAll();
            await AllocationService.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Project deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete project:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to delete project. Please try again.', () => this.delete(id, options));
            }
            throw error;
        }
    },

    /**
     * Update project status
     * @param {string} id - Project ID
     * @param {string} status - New status
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated project
     */
    async updateStatus(id, status, options = {}) {
        const { showToast = true } = options;

        try {
            const result = await this.update(id, { status }, { showToast: false });
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success(`Project status updated to ${status.replace('_', ' ')}`);
            }
            return result;
        } catch (error) {
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to update project status. Please try again.', () => this.updateStatus(id, status, options));
            }
            throw error;
        }
    },

    /**
     * Update payment status
     * @param {string} id - Project ID
     * @param {boolean} isPaid - Payment status
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated project
     */
    async updatePaymentStatus(id, isPaid, options = {}) {
        const { showToast = true } = options;

        try {
            const result = await this.update(id, { is_paid: isPaid }, { showToast: false });
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success(`Payment status updated to ${isPaid ? 'Paid' : 'Unpaid'}`);
            }
            return result;
        } catch (error) {
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to update payment status. Please try again.', () => this.updatePaymentStatus(id, isPaid, options));
            }
            throw error;
        }
    },

    /**
     * Get projects by status
     * @param {string} status - Status filter
     * @returns {Promise<Array>} Filtered projects
     */
    async getByStatus(status) {
        const projects = StateManager.getState('projects') || [];
        return projects.filter(p => p.status === status);
    },

    /**
     * Get projects by client
     * @param {string} clientId - Client ID
     * @returns {Promise<Array>} Filtered projects
     */
    async getByClient(clientId) {
        const projects = StateManager.getState('projects') || [];
        return projects.filter(p => p.client_id === clientId);
    },

    /**
     * Assign talent to project
     * @param {string} projectId - Project ID
     * @param {string} talentId - Talent ID
     * @param {string} role - Optional role
     * @returns {Promise<void>}
     */
    async assignTalent(projectId, talentId, role = null) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                // Local state management
                const projects = StateManager.getState('projects') || [];
                const index = projects.findIndex(p => p.id === projectId);
                if (index !== -1) {
                    projects[index].assigned_talents = [...(projects[index].assigned_talents || []), talentId];
                    StateManager.setState('projects', [...projects]);
                }
                return;
            }

            const { error } = await client
                .from('project_talents')
                .insert([{ project_id: projectId, talent_id: talentId, role }]);

            if (error && error.code !== '23505') throw error; // Ignore duplicate key error
            await this.getAll();
        } catch (error) {
            console.error('Failed to assign talent:', error);
            throw error;
        }
    },

    /**
     * Remove talent from project
     * @param {string} projectId - Project ID
     * @param {string} talentId - Talent ID
     * @returns {Promise<void>}
     */
    async removeTalent(projectId, talentId) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                // Local state management
                const projects = StateManager.getState('projects') || [];
                const index = projects.findIndex(p => p.id === projectId);
                if (index !== -1) {
                    projects[index].assigned_talents = (projects[index].assigned_talents || []).filter(t => t !== talentId);
                    StateManager.setState('projects', [...projects]);
                }
                return;
            }

            const { error } = await client
                .from('project_talents')
                .delete()
                .eq('project_id', projectId)
                .eq('talent_id', talentId);

            if (error) throw error;
            await this.getAll();
        } catch (error) {
            console.error('Failed to remove talent:', error);
            throw error;
        }
    },

    /**
     * Generate unique color for project
     * @returns {string} Hex color code
     */
    generateColor() {
        const colors = [
            '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
            '#d97706', '#65a30d', '#16a34a', '#0d9488', '#0891b2',
            '#0284c7', '#2563eb', '#4338ca', '#6d28d9', '#a21caf',
            '#be185d', '#b91c1c', '#c2410c', '#a16207', '#4d7c0f',
            '#15803d', '#0f766e', '#0e7490', '#0369a1', '#1d4ed8'
        ];

        // Find unused color
        for (const color of colors) {
            if (!this.usedColors.has(color)) {
                this.usedColors.add(color);
                return color;
            }
        }

        // Generate random color if all predefined are used
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        this.usedColors.add(randomColor);
        return randomColor;
    },

    /**
     * Add a batch date range to a project
     * @param {string} projectId - Project ID
     * @param {Object} batch - Batch data {start_date, end_date, notes}
     * @returns {Promise<Object>} Created batch
     */
    async addBatch(projectId, batch) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                // Local state management
                const projects = StateManager.getState('projects') || [];
                const index = projects.findIndex(p => p.id === projectId);
                if (index !== -1) {
                    const newBatch = { id: crypto.randomUUID(), project_id: projectId, ...batch };
                    projects[index].batches = [...(projects[index].batches || []), newBatch];
                    StateManager.setState('projects', [...projects]);
                    return newBatch;
                }
                return null;
            }

            const { data, error } = await client
                .from('project_batches')
                .insert([{ project_id: projectId, ...batch }])
                .select()
                .single();

            if (error) throw error;
            await this.getAll();
            return data;
        } catch (error) {
            console.error('Failed to add batch:', error);
            throw error;
        }
    },

    /**
     * Remove a batch from a project
     * @param {string} batchId - Batch ID
     * @returns {Promise<void>}
     */
    async removeBatch(batchId) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                // Local state management
                const projects = StateManager.getState('projects') || [];
                projects.forEach(p => {
                    if (p.batches) {
                        p.batches = p.batches.filter(b => b.id !== batchId);
                    }
                });
                StateManager.setState('projects', [...projects]);
                return;
            }

            const { error } = await client
                .from('project_batches')
                .delete()
                .eq('id', batchId);

            if (error) throw error;
            await this.getAll();
        } catch (error) {
            console.error('Failed to remove batch:', error);
            throw error;
        }
    },

    /**
     * Get batches for a project
     * @param {string} projectId - Project ID
     * @returns {Array} Batches array
     */
    getBatches(projectId) {
        const projects = StateManager.getState('projects') || [];
        const project = projects.find(p => p.id === projectId);
        return project?.batches || [];
    }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectService;
}