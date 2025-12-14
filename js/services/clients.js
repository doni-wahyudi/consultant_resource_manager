/**
 * Client Service
 * CRUD operations for clients
 * Requirements: 10.1, 10.3, 11.3
 */

const ClientService = {
    /**
     * Get all clients
     * @returns {Promise<Array>} Clients list
     */
    async getAll() {
        try {
            const client = SupabaseService.getClient();
            if (!client) return StateManager.getState('clients') || [];
            
            const { data, error } = await client
                .from('clients')
                .select('*')
                .order('name');
            
            if (error) throw error;
            StateManager.setState('clients', data);
            return data;
        } catch (error) {
            console.error('Failed to fetch clients:', error);
            return StateManager.getState('clients') || [];
        }
    },
    
    /**
     * Get client by ID
     * @param {string} id - Client ID
     * @returns {Promise<Object>} Client
     */
    async getById(id) {
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                return (StateManager.getState('clients') || []).find(c => c.id === id);
            }
            
            const { data, error } = await client
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to fetch client:', error);
            throw error;
        }
    },

    /**
     * Create a new client
     * @param {Object} clientData - Client data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Created client
     */
    async create(clientData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const newClient = { id: crypto.randomUUID(), ...clientData, created_at: new Date().toISOString() };
                const clients = [...(StateManager.getState('clients') || []), newClient];
                StateManager.setState('clients', clients);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Client created successfully');
                }
                return newClient;
            }
            
            const { data, error } = await client
                .from('clients')
                .insert([clientData])
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Client created successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to create client:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to create client. Please try again.', () => this.create(clientData, options));
            }
            throw error;
        }
    },
    
    /**
     * Update a client
     * @param {string} id - Client ID
     * @param {Object} clientData - Updated client data
     * @param {Object} options - Options for error handling
     * @returns {Promise<Object>} Updated client
     */
    async update(id, clientData, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const clients = StateManager.getState('clients') || [];
                const index = clients.findIndex(c => c.id === id);
                if (index !== -1) {
                    clients[index] = { ...clients[index], ...clientData, updated_at: new Date().toISOString() };
                    StateManager.setState('clients', [...clients]);
                }
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Client updated successfully');
                }
                return clients[index];
            }
            
            const { data, error } = await client
                .from('clients')
                .update({ ...clientData, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Client updated successfully');
            }
            return data;
        } catch (error) {
            console.error('Failed to update client:', error);
            if (showToast && typeof Toast !== 'undefined') {
                Toast.error('Failed to update client. Please try again.', () => this.update(id, clientData, options));
            }
            throw error;
        }
    },
    
    /**
     * Delete a client
     * @param {string} id - Client ID
     * @param {Object} options - Options for error handling
     * @returns {Promise<void>}
     */
    async delete(id, options = {}) {
        const { showToast = true } = options;
        
        try {
            const client = SupabaseService.getClient();
            if (!client) {
                const clients = (StateManager.getState('clients') || []).filter(c => c.id !== id);
                StateManager.setState('clients', clients);
                if (showToast && typeof Toast !== 'undefined') {
                    Toast.success('Client deleted successfully');
                }
                return;
            }
            
            const { error } = await client
                .from('clients')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            await this.getAll();
            if (showToast && typeof Toast !== 'undefined') {
                Toast.success('Client deleted successfully');
            }
        } catch (error) {
            console.error('Failed to delete client:', error);
            if (showToast && typeof Toast !== 'undefined') {
                const message = error.code === '23503'
                    ? 'Cannot delete client with associated projects'
                    : 'Failed to delete client. Please try again.';
                Toast.error(message, () => this.delete(id, options));
            }
            throw error;
        }
    }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientService;
}