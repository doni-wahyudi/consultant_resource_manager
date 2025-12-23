/**
 * Settings Page
 * Area management and application settings
 */

const SettingsPage = {
    render() {
        const container = document.getElementById('page-settings');
        const user = AuthService.getUser();
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Settings</h1>
            </div>
            
            <!-- User Info -->
            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Account</h3>
                </div>
                <div class="user-info-section">
                    ${user ? `
                        <div class="user-info-row">
                            <span class="user-info-label">Signed in as:</span>
                            <span class="user-info-value">${user.email}</span>
                        </div>
                        <button class="btn btn-secondary" id="logout-btn">Sign Out</button>
                    ` : `
                        <p class="text-muted">You are not signed in. Sign in to make changes.</p>
                        <button class="btn btn-primary" id="login-btn">Sign In</button>
                    `}
                </div>
            </div>
            
            <!-- Business Areas -->
            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title">Business Areas</h3>
                    <button class="btn btn-primary btn-sm" id="add-area-btn">+ Add Area</button>
                </div>
                <div id="areas-list"></div>
            </div>
            
            <!-- Activity Log -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Activity Log</h3>
                    <span class="card-subtitle">Recent changes</span>
                </div>
                <div id="activity-log-list"></div>
            </div>
        `;
        
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showTableSkeleton('#areas-list', 3, 2);
        } else {
            this.renderAreasList();
        }
        
        this.renderActivityLog();
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
    
    async renderActivityLog() {
        const container = document.getElementById('activity-log-list');
        if (!container) return;
        
        // Show loading state
        container.innerHTML = '<div class="loading-inline"><span class="spinner-inline"></span> Loading activity...</div>';
        
        // Load activity logs (don't use state subscription for this)
        let logs = [];
        try {
            const client = SupabaseService.getClient();
            if (client) {
                const { data, error } = await client
                    .from('activity_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);
                
                if (!error && data) {
                    logs = data;
                }
            }
            
            // Fallback to localStorage if no Supabase data
            if (logs.length === 0) {
                logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            }
        } catch (error) {
            console.warn('Failed to load activity logs:', error);
            logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
        }
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No activity recorded yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="activity-log">
                ${logs.map(log => `
                    <div class="activity-item">
                        <div class="activity-icon">${ActivityLogService.getEntityIcon(log.entity_type)}</div>
                        <div class="activity-content">
                            <div class="activity-text">
                                <strong>${log.user_email || 'Anonymous'}</strong>
                                ${ActivityLogService.formatAction(log.action).toLowerCase()}
                                ${ActivityLogService.formatEntityType(log.entity_type).toLowerCase()}
                                <strong>${log.entity_name || ''}</strong>
                            </div>
                            <div class="activity-time">${this.formatTimeAgo(log.created_at)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    },

    setupEventListeners() {
        document.getElementById('add-area-btn')?.addEventListener('click', async () => {
            if (await EditGuard.canEdit()) {
                this.showAreaForm();
            }
        });
        
        document.getElementById('login-btn')?.addEventListener('click', () => {
            Router.navigate('login');
        });
        
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await AuthService.signOut();
            Toast.success('Signed out');
            this.render(); // Re-render to update UI
        });
        
        document.getElementById('areas-list')?.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            
            if (action === 'edit') {
                if (await EditGuard.canEdit()) {
                    const area = (StateManager.getState('areas') || []).find(a => a.id === id);
                    if (area) this.showAreaForm(area);
                }
            } else if (action === 'delete') {
                if (await EditGuard.canEdit()) {
                    const area = (StateManager.getState('areas') || []).find(a => a.id === id);
                    const confirmed = await Modal.confirm('Are you sure? This will remove this area from all talents.');
                    if (confirmed) {
                        try {
                            await AreaService.delete(id);
                            await ActivityLogService.log('deleted', 'area', id, area?.name);
                            Toast.success('Area deleted');
                        } catch (error) {
                            Toast.error('Failed to delete area');
                        }
                    }
                }
            }
        });
    },
    
    async showAreaForm(area = null) {
        Modal.form({
            title: area ? 'Edit Area' : 'Add Area',
            fields: [
                { name: 'name', label: 'Area Name', type: 'text', required: true, value: area?.name }
            ],
            onSubmit: async (data) => {
                try {
                    if (area) {
                        await AreaService.update(area.id, data);
                        await ActivityLogService.log('updated', 'area', area.id, data.name);
                        Toast.success('Area updated');
                    } else {
                        const newArea = await AreaService.create(data);
                        await ActivityLogService.log('created', 'area', newArea?.id, data.name);
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
        // Removed activityLogs subscription to prevent infinite loop
        StateManager.subscribe('auth.user', () => this.render());
    }
};