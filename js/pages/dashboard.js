/**
 * Dashboard Page
 * Displays key metrics and overview
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

const DashboardPage = {
    unsubscribers: [],
    unpaidSortField: 'name',
    unpaidSortOrder: 'asc',
    selectedUnit: '',

    render() {
        const container = document.getElementById('page-dashboard');

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Dashboard</h1>
                <div class="header-controls">
                    <select id="dashboard-unit-filter" class="form-select">
                        <option value="">All Units</option>
                        <option value="Aurotech" ${this.selectedUnit === 'Aurotech' ? 'selected' : ''}>Aurotech</option>
                        <option value="Barbershop" ${this.selectedUnit === 'Barbershop' ? 'selected' : ''}>Barbershop</option>
                    </select>
                </div>
            </div>
            <div class="metrics-grid" id="dashboard-metrics"></div>
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Activity Timeline</h3>
                        <span class="card-subtitle">Active & upcoming activities</span>
                    </div>
                    <div id="project-timeline" class="card-body"></div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Team Utilization</h3>
                        <span class="card-subtitle">This month</span>
                    </div>
                    <div id="talent-utilization" class="card-body"></div>
                </div>
            </div>
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
                        <h3 class="card-title">Pending Payments</h3>
                        <span class="card-subtitle" id="unpaid-count"></span>
                    </div>
                    <div class="card-body-header">
                        <select id="unpaid-sort-field" class="form-select form-select-sm">
                            <option value="name">Name</option>
                            <option value="date">Date</option>
                            <option value="days">Days</option>
                        </select>
                        <select id="unpaid-sort-order" class="form-select form-select-sm">
                            <option value="asc">Asc</option>
                            <option value="desc">Desc</option>
                        </select>
                    </div>
                    <div id="unpaid-projects" class="card-body"></div>
                </div>
            </div>
        `;

        this.showLoadingStates();
        this.renderMetrics();
        this.renderProjectTimeline();
        this.renderTalentUtilization();
        this.renderUpcomingDeadlines();
        this.renderUnpaidProjects();
        this.setupListeners();
        this.subscribeToState();
    },

    setupListeners() {
        document.getElementById('unpaid-sort-field')?.addEventListener('change', (e) => {
            this.unpaidSortField = e.target.value;
            this.renderUnpaidProjects();
        });

        document.getElementById('unpaid-sort-order')?.addEventListener('change', (e) => {
            this.unpaidSortOrder = e.target.value;
            this.renderUnpaidProjects();
        });

        document.getElementById('dashboard-unit-filter')?.addEventListener('change', (e) => {
            this.selectedUnit = e.target.value;
            this.render();
        });
    },

    sortUnpaidProjects(projects) {
        return [...projects].sort((a, b) => {
            let comparison = 0;

            switch (this.unpaidSortField) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'date':
                    const dateA = a.start_date || '';
                    const dateB = b.start_date || '';
                    comparison = dateA.localeCompare(dateB);
                    break;
                case 'days':
                    const daysA = this.calculateProjectTotalDays(a) || 0;
                    const daysB = this.calculateProjectTotalDays(b) || 0;
                    comparison = daysA - daysB;
                    break;
            }

            return this.unpaidSortOrder === 'desc' ? -comparison : comparison;
        });
    },

    showLoadingStates() {
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showCardsSkeleton('#dashboard-metrics', 4);
            LoadingUI.showInline('#project-timeline', 'Loading timeline...');
            LoadingUI.showInline('#talent-utilization', 'Loading utilization...');
            LoadingUI.showInline('#upcoming-deadlines', 'Loading deadlines...');
            LoadingUI.showInline('#unpaid-projects', 'Loading activities...');
        }
    },

    renderMetrics() {
        const container = document.getElementById('dashboard-metrics');
        if (!container) return;

        const talents = StateManager.getState('talents') || [];
        let projects = StateManager.getState('projects') || [];
        const clients = StateManager.getState('clients') || [];
        const allocations = StateManager.getState('allocations') || [];

        // Apply unit filter
        if (this.selectedUnit) {
            const unitClientIds = clients.filter(c => c.business_unit === this.selectedUnit).map(c => c.id);
            projects = projects.filter(p => unitClientIds.includes(p.client_id));
        }

        const activeProjects = projects.filter(p => p.status === 'in_progress').length;
        const upcomingProjects = projects.filter(p => p.status === 'upcoming').length;
        const completedProjects = projects.filter(p => p.status === 'completed').length;

        // Calculate utilization rate (team with allocations this month / total team)
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

        // Filter allocations by project unit if filter is active
        let filteredAllocations = allocations;
        if (this.selectedUnit) {
            const unitProjectIds = projects.map(p => p.id);
            filteredAllocations = allocations.filter(a => unitProjectIds.includes(a.project_id));
        }

        const activeTalentIds = new Set(
            filteredAllocations
                .filter(a => a.start_date <= monthEnd && a.end_date >= monthStart)
                .map(a => a.talent_id)
        );
        const utilizationRate = talents.length > 0 ? Math.round((activeTalentIds.size / talents.length) * 100) : 0;

        container.innerHTML = `
            <div class="metric-card">
                <div class="metric-icon">👥</div>
                <div class="metric-content">
                    <div class="metric-value">${talents.length}</div>
                    <div class="metric-label">Total Team</div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">⚡</div>
                <div class="metric-content">
                    <div class="metric-value">${activeProjects}</div>
                    <div class="metric-label">Active Activities</div>
                </div>
                <div class="metric-sub">${upcomingProjects} upcoming</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">🏢</div>
                <div class="metric-content">
                    <div class="metric-value">${this.selectedUnit ? clients.filter(c => c.business_unit === this.selectedUnit).length : clients.length}</div>
                    <div class="metric-label">Entities</div>
                </div>
            </div>
            <div class="metric-card ${utilizationRate >= 70 ? 'utilization-high' : utilizationRate >= 40 ? 'utilization-medium' : 'utilization-low'}">
                <div class="metric-icon">📊</div>
                <div class="metric-content">
                    <div class="metric-value">${utilizationRate}%</div>
                    <div class="metric-label">Utilization Rate</div>
                </div>
                <div class="metric-bar">
                    <div class="metric-bar-fill" style="width: ${utilizationRate}%"></div>
                </div>
            </div>
        `;
    },

    renderProjectTimeline() {
        const container = document.getElementById('project-timeline');
        if (!container) return;

        let projects = StateManager.getState('projects') || [];
        const clients = StateManager.getState('clients') || [];

        // Apply unit filter
        if (this.selectedUnit) {
            const unitClientIds = clients.filter(c => c.business_unit === this.selectedUnit).map(c => c.id);
            projects = projects.filter(p => unitClientIds.includes(p.client_id));
        }

        const activeProjects = projects.filter(p =>
            (p.status === 'in_progress' || p.status === 'upcoming') &&
            (p.start_date || p.end_date)
        ).sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

        if (activeProjects.length === 0) {
            container.innerHTML = '<p class="empty-state">No activities with dates to display</p>';
            return;
        }

        // Get date range for timeline
        const now = new Date();
        const timelineStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const timelineEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);
        const totalDays = Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24));

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Generate month headers
        let monthHeaders = '';
        for (let m = 0; m < 3; m++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
            monthHeaders += `<div class="timeline-month">${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}</div>`;
        }

        container.innerHTML = `
            <div class="project-timeline-chart">
                <div class="timeline-header">${monthHeaders}</div>
                <div class="timeline-body">
                    ${activeProjects.slice(0, 8).map(project => {
            const start = project.start_date ? new Date(project.start_date + 'T00:00:00') : timelineStart;
            const end = project.end_date ? new Date(project.end_date + 'T00:00:00') : timelineEnd;

            const startOffset = Math.max(0, Math.ceil((start - timelineStart) / (1000 * 60 * 60 * 24)));
            const duration = Math.min(totalDays - startOffset, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = Math.max(2, (duration / totalDays) * 100);

            return `
                            <div class="timeline-row">
                                <div class="timeline-label" title="${project.name}">${project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name}</div>
                                <div class="timeline-bar-container">
                                    <div class="timeline-bar" style="left: ${leftPercent}%; width: ${widthPercent}%; background-color: ${project.color};" title="${project.start_date || 'TBD'} - ${project.end_date || 'TBD'}"></div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
                ${activeProjects.length > 8 ? `<p class="text-muted" style="margin-top:8px;">+${activeProjects.length - 8} more activities</p>` : ''}
            </div>
        `;
    },

    renderTalentUtilization() {
        const container = document.getElementById('talent-utilization');
        if (!container) return;

        const talents = StateManager.getState('talents') || [];
        const allocations = StateManager.getState('allocations') || [];
        const projects = StateManager.getState('projects') || [];

        if (talents.length === 0) {
            container.innerHTML = '<p class="empty-state">No team members to display</p>';
            return;
        }

        // Calculate days allocated this month for each team member
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysInMonth = monthEnd.getDate();

        const talentStats = talents.map(talent => {
            let allocatedDays = 0;

            allocations
                .filter(a => a.talent_id === talent.id)
                .forEach(a => {
                    const start = new Date(Math.max(new Date(a.start_date + 'T00:00:00'), monthStart));
                    const end = new Date(Math.min(new Date(a.end_date + 'T00:00:00'), monthEnd));
                    if (start <= end) {
                        allocatedDays += Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    }
                });

            const utilization = Math.min(100, Math.round((allocatedDays / daysInMonth) * 100));

            return { ...talent, allocatedDays, utilization };
        }).sort((a, b) => b.utilization - a.utilization);

        container.innerHTML = `
            <div class="utilization-list">
                ${talentStats.slice(0, 6).map(talent => `
                    <div class="utilization-item">
                        <div class="utilization-info">
                            <span class="utilization-name">${talent.name}</span>
                            <span class="utilization-percent">${talent.utilization}%</span>
                        </div>
                        <div class="utilization-bar">
                            <div class="utilization-bar-fill ${talent.utilization >= 80 ? 'high' : talent.utilization >= 50 ? 'medium' : 'low'}" style="width: ${talent.utilization}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${talents.length > 6 ? `<p class="text-muted" style="margin-top:8px;"><a href="#/talents">View all ${talents.length} team members →</a></p>` : ''}
        `;
    },

    renderUpcomingDeadlines() {
        const container = document.getElementById('upcoming-deadlines');
        if (!container) return;

        let upcoming = DashboardService.getUpcomingDeadlines();
        const clients = StateManager.getState('clients') || [];

        // Apply unit filter
        if (this.selectedUnit) {
            const unitClientIds = clients.filter(c => c.business_unit === this.selectedUnit).map(c => c.id);
            upcoming = upcoming.filter(p => unitClientIds.includes(p.client_id));
        }

        if (upcoming.length === 0) {
            container.innerHTML = '<p class="empty-state">No upcoming deadlines in the next 30 days</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Activity</th>
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

    calculateTotalDays(startDate, endDate) {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    },

    /**
     * Calculate total days for an activity, using batches if available
     */
    calculateProjectTotalDays(project) {
        // Use batches if available
        if (project.batches && project.batches.length > 0) {
            return project.batches.reduce((sum, batch) => {
                return sum + (this.calculateTotalDays(batch.start_date, batch.end_date) || 0);
            }, 0);
        }
        // Fall back to single start/end date
        return this.calculateTotalDays(project.start_date, project.end_date);
    },

    renderUnpaidProjects() {
        const container = document.getElementById('unpaid-projects');
        const countEl = document.getElementById('unpaid-count');
        if (!container) return;

        let summary = DashboardService.getUnpaidProjectsSummary();
        const talents = StateManager.getState('talents') || [];
        const clients = StateManager.getState('clients') || [];

        // Apply unit filter
        if (this.selectedUnit) {
            const unitClientIds = clients.filter(c => c.business_unit === this.selectedUnit).map(c => c.id);
            const filteredProjects = summary.projects.filter(p => unitClientIds.includes(p.client_id));
            summary = {
                projects: filteredProjects,
                count: filteredProjects.length
            };
        }

        if (countEl) {
            countEl.textContent = summary.count > 0
                ? `${summary.count} activity${summary.count > 1 ? 's' : ''} pending`
                : '';
        }

        if (summary.count === 0) {
            container.innerHTML = '<p class="empty-state success">All activities are paid ✓</p>';
            return;
        }

        // Sort activities
        const sortedProjects = this.sortUnpaidProjects(summary.projects);

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Activity</th>
                        <th>Entity</th>
                        <th>Dates</th>
                        <th>Total Days</th>
                        <th>Team</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedProjects.map(p => {
            const client = clients.find(c => c.id === p.client_id);
            const assignedTalents = (p.assigned_talents || [])
                .map(tid => talents.find(t => t.id === tid)?.name)
                .filter(Boolean);
            const talentDisplay = assignedTalents.length > 0
                ? assignedTalents.slice(0, 2).join(', ') + (assignedTalents.length > 2 ? ` +${assignedTalents.length - 2}` : '')
                : '-';
            const totalDays = this.calculateProjectTotalDays(p);
            const batchCount = (p.batches || []).length;
            const dateDisplay = batchCount > 1
                ? `<span class="batch-label">Batch (${batchCount})</span>`
                : batchCount === 1
                    ? (p.batches[0].start_date === p.batches[0].end_date
                        ? this.formatShortDate(p.batches[0].start_date)
                        : `${this.formatShortDate(p.batches[0].start_date)} - ${this.formatShortDate(p.batches[0].end_date)}`)
                    : p.start_date && p.end_date
                        ? (p.start_date === p.end_date
                            ? this.formatShortDate(p.start_date)
                            : `${this.formatShortDate(p.start_date)} - ${this.formatShortDate(p.end_date)}`)
                        : '-';
            return `
                            <tr>
                                <td>
                                    <span class="project-color-dot" style="background-color: ${p.color || '#ccc'}"></span>
                                    ${p.name}
                                </td>
                                <td>${client?.name || '-'}</td>
                                <td class="date-cell">${dateDisplay}</td>
                                <td>${totalDays !== null ? totalDays + ' days' : '-'}</td>
                                <td>${talentDisplay}</td>
                                <td>${p.location || '-'}</td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    },

    formatShortDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            StateManager.subscribe('talents', () => {
                this.renderMetrics();
                this.renderTalentUtilization();
            })
        );

        this.unsubscribers.push(
            StateManager.subscribe('projects', () => {
                this.renderMetrics();
                this.renderProjectTimeline();
                this.renderUpcomingDeadlines();
                this.renderUnpaidProjects();
            })
        );

        this.unsubscribers.push(
            StateManager.subscribe('clients', () => this.renderMetrics())
        );

        this.unsubscribers.push(
            StateManager.subscribe('allocations', () => {
                this.renderMetrics();
                this.renderTalentUtilization();
            })
        );
    },

    cleanup() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
    }
};
