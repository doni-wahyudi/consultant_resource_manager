/**
 * Legend Component
 * Displays project color codes
 * Requirement: 3.4 - Render a legend showing all active projects with their assigned colors
 */

const Legend = {
    container: null,
    unsubscribe: null,
    
    /**
     * Render legend with projects
     * @param {HTMLElement} container - Container element
     * @param {Array} projects - Projects array
     */
    render(container, projects = null) {
        this.container = container;
        
        if (!projects) {
            projects = StateManager.getState('projects') || [];
        }
        
        // Separate in_progress and upcoming projects
        const inProgressProjects = projects.filter(p => p.status === 'in_progress');
        const upcomingProjects = projects.filter(p => p.status === 'upcoming');
        
        const hasProjects = inProgressProjects.length > 0 || upcomingProjects.length > 0;
        
        if (!hasProjects) {
            container.innerHTML = `
                <div class="legend-container">
                    <h4 class="legend-title">Project Legend</h4>
                    <p class="text-muted">No active or upcoming projects</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="legend-container">
                <h4 class="legend-title">Project Legend</h4>
                
                ${inProgressProjects.length > 0 ? `
                    <div class="legend-section">
                        <span class="legend-section-title">🔵 In Progress (${inProgressProjects.length})</span>
                        <div class="legend-items">
                            ${inProgressProjects.map(project => `
                                <div class="legend-item" title="${project.name}">
                                    <div class="legend-color" style="background-color: ${project.color}"></div>
                                    <span class="legend-label">${project.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${upcomingProjects.length > 0 ? `
                    <div class="legend-section">
                        <span class="legend-section-title">🟣 Upcoming (${upcomingProjects.length})</span>
                        <div class="legend-items">
                            ${upcomingProjects.map(project => `
                                <div class="legend-item" title="${project.name}">
                                    <div class="legend-color" style="background-color: ${project.color}; opacity: 0.6;"></div>
                                    <span class="legend-label">${project.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Subscribe to project changes for auto-update
        this.subscribeToState();
    },
    
    /**
     * Subscribe to state changes for auto-refresh
     */
    subscribeToState() {
        // Unsubscribe from previous subscription if exists
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        this.unsubscribe = StateManager.subscribe('projects', (projects) => {
            if (this.container) {
                this.render(this.container, projects);
            }
        });
    },
    
    /**
     * Update legend when projects change
     * @param {Array} projects - Updated projects array
     */
    update(projects) {
        if (this.container) {
            this.render(this.container, projects);
        }
    }
};
