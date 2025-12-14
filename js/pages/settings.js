/**
 * Settings Page
 * Area management and application settings
 */

const SettingsPage = {
    render() {
        const container = document.getElementById('page-settings');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Settings</h1>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Business Areas</h3>
                    <button class="btn btn-primary btn-sm" id="add-area-btn">+ Add Area</button>
                </div>
                <div id="areas-list"></div>
            </div>
        `;
        
        // Show loading state if data is still loading
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showTableSkeleton('#areas-list', 3, 2);
        } else {
            this.renderAreasList();
        }
        
        this.setupEventListeners();
        this.subscribeToState();
    },
    
    renderAreasList() {
        const container = document.getElementById('areas-list');
        const areas = StateManager.getState('areas') || [];
        
        if (areas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No areas defined yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead><tr><th>Name</th><th>Actions</th></tr></thead>
                <tbody>
                    ${areas.map(area => `
                        <tr>
                            <td>${area.name}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${area.id}">Edit</button>
                                <button class="btn btn-sm btn-danger" data-action="delete" data-id="${area.id}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    setupEventListeners() {
        document.getElementById('add-area-btn').addEventListener('click', () => this.showAreaForm());
        
        document.getElementById('areas-list').addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            
            if (action === 'edit') {
                const area = (StateManager.getState('areas') || []).find(a => a.id === id);
                if (area) this.showAreaForm(area);
            } else if (action === 'delete') {
                const confirmed = await Modal.confirm('Are you sure? This will remove this area from all talents.');
                if (confirmed) {
                    try {
                        await AreaService.delete(id);
                        Toast.success('Area deleted');
                    } catch (error) {
                        Toast.error('Failed to delete area');
                    }
                }
            }
        });
    },
    
    showAreaForm(area = null) {
        Modal.form({
            title: area ? 'Edit Area' : 'Add Area',
            fields: [
                { name: 'name', label: 'Area Name', type: 'text', required: true, value: area?.name }
            ],
            onSubmit: async (data) => {
                try {
                    if (area) {
                        await AreaService.update(area.id, data);
                        Toast.success('Area updated');
                    } else {
                        await AreaService.create(data);
                        Toast.success('Area created');
                    }
                } catch (error) {
                    Toast.error('Failed to save area');
                }
            }
        });
    },
    
    subscribeToState() {
        StateManager.subscribe('areas', () => this.renderAreasList());
    }
};