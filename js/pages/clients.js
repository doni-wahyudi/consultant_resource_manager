/**
 * Clients Management Page
 * Displays clients with associated projects
 */

const ClientsPage = {
    searchQuery: '',
    
    render() {
        const container = document.getElementById('page-clients');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Clients</h1>
                <button class="btn btn-primary" id="add-client-btn">+ Add Client</button>
            </div>
            <div class="card">
                <div class="filter-bar">
                    <input type="text" class="form-input" id="client-search" placeholder="Search by name, email, or phone..." style="flex:2;">
                    <button class="btn btn-secondary btn-sm" id="clear-client-filters-btn">Clear</button>
                </div>
                <div id="clients-list"></div>
            </div>
        `;
        
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showTableSkeleton('#clients-list', 5, 5);
        } else {
            this.renderClientsList();
        }
        
        this.setupEventListeners();
        this.subscribeToState();
    },
    
    getFilteredClients() {
        const clients = StateManager.getState('clients') || [];
        
        if (!this.searchQuery) return clients;
        
        const query = this.searchQuery.toLowerCase();
        return clients.filter(client => {
            const nameMatch = client.name?.toLowerCase().includes(query);
            const emailMatch = client.contact_email?.toLowerCase().includes(query);
            const phoneMatch = client.contact_phone?.toLowerCase().includes(query);
            return nameMatch || emailMatch || phoneMatch;
        });
    },
    
    renderClientsList() {
        const container = document.getElementById('clients-list');
        const clients = this.getFilteredClients();
        const projects = StateManager.getState('projects') || [];
        const allClients = StateManager.getState('clients') || [];
        
        if (allClients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <h3 class="empty-state-title">No clients yet</h3>
                    <p class="empty-state-text">Add your first client to get started</p>
                </div>
            `;
            return;
        }
        
        if (clients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3 class="empty-state-title">No matches found</h3>
                    <p class="empty-state-text">Try adjusting your search</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Projects</th><th>Actions</th></tr></thead>
                <tbody>
                    ${clients.map(client => {
                        const clientProjects = projects.filter(p => p.client_id === client.id);
                        return `
                            <tr>
                                <td><a href="#" class="client-name-link" data-action="view" data-id="${client.id}">${client.name}</a></td>
                                <td>${client.contact_email || '-'}</td>
                                <td>${client.contact_phone || '-'}</td>
                                <td>${clientProjects.length} project(s)</td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" data-action="view" data-id="${client.id}">View</button>
                                    <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${client.id}">Edit</button>
                                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${client.id}">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="table-footer">
                <span class="text-muted">Showing ${clients.length} of ${allClients.length} clients</span>
            </div>
        `;
    },

    setupEventListeners() {
        document.getElementById('add-client-btn').addEventListener('click', async () => {
            if (await EditGuard.canEdit()) {
                this.showClientForm();
            }
        });
        
        // Search listener
        document.getElementById('client-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderClientsList();
        });
        
        document.getElementById('clear-client-filters-btn')?.addEventListener('click', () => {
            this.searchQuery = '';
            document.getElementById('client-search').value = '';
            this.renderClientsList();
        });
        
        document.getElementById('clients-list').addEventListener('click', async (e) => {
            e.preventDefault();
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            
            if (action === 'view') {
                const client = (StateManager.getState('clients') || []).find(c => c.id === id);
                if (client) this.showClientDetails(client);
            } else if (action === 'edit') {
                if (await EditGuard.canEdit()) {
                    const client = (StateManager.getState('clients') || []).find(c => c.id === id);
                    if (client) this.showClientForm(client);
                }
            } else if (action === 'delete') {
                if (await EditGuard.canEdit()) {
                    const client = (StateManager.getState('clients') || []).find(c => c.id === id);
                    const confirmed = await Modal.confirm('Are you sure you want to delete this client?');
                    if (confirmed) {
                        try {
                            await ClientService.delete(id);
                            await ActivityLogService.log('deleted', 'client', id, client?.name);
                            Toast.success('Client deleted');
                        } catch (error) {
                            Toast.error('Failed to delete client');
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Show client details modal with associated projects
     * @param {Object} client - Client object
     */
    showClientDetails(client) {
        const projects = StateManager.getState('projects') || [];
        const clientProjects = projects.filter(p => p.client_id === client.id);
        
        const projectsList = clientProjects.length > 0 
            ? `<table class="data-table">
                <thead><tr><th>Project</th><th>Status</th><th>Payment</th></tr></thead>
                <tbody>
                    ${clientProjects.map(p => `
                        <tr>
                            <td>
                                <span class="project-color-dot" style="background-color: ${p.color}"></span>
                                ${p.name}
                            </td>
                            <td><span class="status-badge status-${p.status}">${this.formatStatus(p.status)}</span></td>
                            <td>${p.status === 'completed' ? (p.is_paid ? '✅ Paid' : '⏳ Unpaid') : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`
            : '<p class="text-muted">No projects associated with this client.</p>';
        
        Modal.show({
            title: client.name,
            content: `
                <div class="client-details">
                    <div class="client-info">
                        <p><strong>Email:</strong> ${client.contact_email || 'Not provided'}</p>
                        <p><strong>Phone:</strong> ${client.contact_phone || 'Not provided'}</p>
                        ${client.notes ? `<p><strong>Notes:</strong> ${client.notes}</p>` : ''}
                    </div>
                    <div class="client-projects">
                        <h4>Associated Projects (${clientProjects.length})</h4>
                        ${projectsList}
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="edit-client" data-id="${client.id}">Edit</button>
                <button class="btn btn-primary" data-action="close">Close</button>
            `
        });
        
        // Set up footer button handlers
        const footer = document.querySelector('.modal-footer');
        footer.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'edit-client') {
                Modal.hide();
                this.showClientForm(client);
            } else if (action === 'close') {
                Modal.hide();
            }
        });
    },
    
    /**
     * Format status for display
     * @param {string} status - Status value
     * @returns {string} Formatted status
     */
    formatStatus(status) {
        const statusMap = {
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'canceled': 'Canceled'
        };
        return statusMap[status] || status;
    },
    
    showClientForm(client = null) {
        Modal.form({
            title: client ? 'Edit Client' : 'Add Client',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true, value: client?.name },
                { name: 'contact_email', label: 'Email', type: 'email', value: client?.contact_email },
                { name: 'contact_phone', label: 'Phone', type: 'text', value: client?.contact_phone },
                { name: 'notes', label: 'Notes', type: 'textarea', value: client?.notes }
            ],
            onSubmit: async (data) => {
                try {
                    if (client) {
                        await ClientService.update(client.id, data);
                        Toast.success('Client updated');
                    } else {
                        await ClientService.create(data);
                        Toast.success('Client created');
                    }
                } catch (error) {
                    Toast.error('Failed to save client');
                }
            }
        });
    },
    
    subscribeToState() {
        StateManager.subscribe('clients', () => this.renderClientsList());
        StateManager.subscribe('projects', () => this.renderClientsList());
    }
};