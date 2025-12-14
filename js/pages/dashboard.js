/**
 * Dashboard Page
 * Displays key metrics and overview
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

const DashboardPage = {
    unsubscribers: [],

    render() {
        const container = document.getElementById('page-dashboard');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Dashboard</h1>
            </div>
            <div class="metrics-grid" id="dashboard-metrics"></div>
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Upcoming Deadlines</h3>
                        <span class="card-subtitle">Next 30 days</span>
                    </div>
                    <div id="upcoming-deadlines" class="card-body"></div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Unpaid Projects</h3>
                        <span class="card-subtitle" id="unpaid-count"></span>
                    </div>
                    <div id="unpaid-projects" class="card-body"></div>
                </div>
            </div>
        `;
        
        // Show loading states initially
        this.showLoadingStates();
        
        // Render content (will show actual data or empty states)
        this.renderMetrics();
        this.renderUpcomingDeadlines();
        this.renderUnpaidProjects();
        this.subscribeToState();
    },
    
    showLoadingStates() {
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showCardsSkeleton('#dashboard-metrics', 3);
            LoadingUI.showInline('#upcoming-deadlines', 'Loading deadlines...');
            LoadingUI.showInline('#unpaid-projects', 'Loading projects...');
        }
    },
    
    renderMetrics() {
        const container = document.getElementById('dashboard-metrics');
        if (!container) return;

        const talentCount = DashboardService.getTalentCount();
        const activeProjectsCount = DashboardService.getActiveProjectsCount();
        
        container.innerHTML = `
            <div class="metric-card">
                <div class="metric-icon">👥</div>
                <div class="metric-content">
                    <div class="metric-value">${talentCount}</div>
                    <div class="metric-label">Total Talents</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📁</div>
                <div class="metric-content">
                    <div class="metric-value">${activeProjectsCount}</div>
                    <div class="metric-label">Active Projects</div>
                </div>
            </div>
        `;
    },
    
    renderUpcomingDeadlines() {
        const container = document.getElementById('upcoming-deadlines');
        if (!container) return;

        const upcoming = DashboardService.getUpcomingDeadlines();
        
        if (upcoming.length === 0) {
            container.innerHTML = '<p class="empty-state">No upcoming deadlines in the next 30 days</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Deadline</th>
                        <th>Days Left</th>
                    </tr>
                </thead>
                <tbody>
                    ${upcoming.map(p => {
                        const daysLeft = this.calculateDaysLeft(p.end_date);
                        const urgencyClass = daysLeft <= 7 ? 'urgent' : daysLeft <= 14 ? 'warning' : '';
                        return `
                            <tr class="${urgencyClass}">
                                <td>
                                    <span class="project-color-dot" style="background-color: ${p.color || '#ccc'}"></span>
                                    ${p.name}
                                </td>
                                <td>${new Date(p.end_date).toLocaleDateString()}</td>
                                <td><span class="days-badge ${urgencyClass}">${daysLeft} days</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    calculateDaysLeft(endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    },
    
    renderUnpaidProjects() {
        const container = document.getElementById('unpaid-projects');
        const countEl = document.getElementById('unpaid-count');
        if (!container) return;

        const summary = DashboardService.getUnpaidProjectsSummary();
        const talents = StateManager.getState('talents') || [];
        
        if (countEl) {
            countEl.textContent = summary.count > 0 
                ? `${summary.count} project${summary.count > 1 ? 's' : ''} pending`
                : '';
        }
        
        if (summary.count === 0) {
            container.innerHTML = '<p class="empty-state success">All completed projects are paid ✓</p>';
            return;
        }
        
        const clients = StateManager.getState('clients') || [];
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Client</th>
                        <th>Talents</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.projects.map(p => {
                        const client = clients.find(c => c.id === p.client_id);
                        const assignedTalents = (p.assigned_talents || [])
                            .map(tid => talents.find(t => t.id === tid)?.name)
                            .filter(Boolean);
                        const talentDisplay = assignedTalents.length > 0 
                            ? assignedTalents.slice(0, 2).join(', ') + (assignedTalents.length > 2 ? ` +${assignedTalents.length - 2}` : '')
                            : '-';
                        return `
                            <tr>
                                <td>
                                    <span class="project-color-dot" style="background-color: ${p.color || '#ccc'}"></span>
                                    ${p.name}
                                </td>
                                <td>${client?.name || '-'}</td>
                                <td>${talentDisplay}</td>
                                <td>${p.location || '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },
    
    subscribeToState() {
        // Clean up previous subscriptions
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];

        // Subscribe to state changes for real-time updates
        this.unsubscribers.push(
            StateManager.subscribe('talents', () => this.renderMetrics())
        );
        
        this.unsubscribers.push(
            StateManager.subscribe('projects', () => {
                this.renderMetrics();
                this.renderUpcomingDeadlines();
                this.renderUnpaidProjects();
            })
        );
        
        this.unsubscribers.push(
            StateManager.subscribe('allocations', () => this.renderMetrics())
        );
    },

    cleanup() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
};
