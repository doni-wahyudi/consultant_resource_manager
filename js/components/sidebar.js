/**
 * Talent Pool Sidebar Component
 * Displays draggable talent cards with availability indicators
 */

const TalentSidebar = {
    container: null,
    filterArea: null,
    filterAvailability: null,
    selectedDate: null, // Track selected date for availability check
    
    /**
     * Render sidebar to container
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        this.container = container;
        
        // Default to today's date
        if (!this.selectedDate) {
            this.selectedDate = this.getTodayString();
        }
        
        container.innerHTML = `
            <div class="talent-sidebar">
                <div class="talent-sidebar-header">
                    <h3 class="talent-sidebar-title">Talent Pool</h3>
                    <div class="talent-date-indicator">
                        <span class="date-label">Availability for:</span>
                        <span class="date-value" id="selected-date-display">${this.formatDisplayDate(this.selectedDate)}</span>
                    </div>
                    <div class="talent-filter">
                        <select id="filter-area" class="form-select">
                            <option value="">All Areas</option>
                        </select>
                        <select id="filter-availability" class="form-select">
                            <option value="">All</option>
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </div>
                </div>
                <div class="talent-list" id="talent-list"></div>
            </div>
        `;
        
        this.setupFilters();
        this.renderTalentList();
        this.subscribeToState();
    },
    
    /**
     * Get today's date as string
     */
    getTodayString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },
    
    /**
     * Format date for display
     */
    formatDisplayDate(dateStr) {
        if (!dateStr) return 'Today';
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date.getTime() === today.getTime()) {
            return 'Today';
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    
    /**
     * Set the selected date for availability checking
     * @param {string} date - Date string (YYYY-MM-DD)
     */
    setSelectedDate(date) {
        this.selectedDate = date || this.getTodayString();
        console.log('Sidebar: Selected date changed to', this.selectedDate);
        
        // Update display
        const displayEl = document.getElementById('selected-date-display');
        if (displayEl) {
            displayEl.textContent = this.formatDisplayDate(this.selectedDate);
        }
        
        this.renderTalentList();
    },
    
    setupFilters() {
        const areaSelect = document.getElementById('filter-area');
        const availabilitySelect = document.getElementById('filter-availability');
        
        this.populateAreaFilter();
        
        // Filter change handlers
        areaSelect.addEventListener('change', () => this.renderTalentList());
        availabilitySelect.addEventListener('change', () => this.renderTalentList());
    },
    
    populateAreaFilter() {
        const areaSelect = document.getElementById('filter-area');
        if (!areaSelect) return;
        
        const currentValue = areaSelect.value;
        
        // Clear existing options except the first one
        while (areaSelect.options.length > 1) {
            areaSelect.remove(1);
        }
        
        // Populate area filter
        const areas = StateManager.getState('areas') || [];
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.name;
            areaSelect.appendChild(option);
        });
        
        // Restore previous selection if still valid
        if (currentValue && areas.some(a => a.id === currentValue)) {
            areaSelect.value = currentValue;
        }
    },
    
    renderTalentList() {
        const listContainer = document.getElementById('talent-list');
        if (!listContainer) return;
        
        const talents = StateManager.getState('talents') || [];
        const areaFilter = document.getElementById('filter-area')?.value;
        const availabilityFilter = document.getElementById('filter-availability')?.value;
        
        // Use selected date for availability check
        const checkDate = this.selectedDate || this.getTodayString();
        
        let filteredTalents = talents;
        
        // Apply area filter
        if (areaFilter) {
            filteredTalents = filteredTalents.filter(t => 
                t.areas && t.areas.includes(areaFilter)
            );
        }
        
        // Apply availability filter based on selected date
        if (availabilityFilter) {
            filteredTalents = filteredTalents.filter(t => {
                const isAvailable = this.checkAvailability(t.id, checkDate);
                return availabilityFilter === 'available' ? isAvailable : !isAvailable;
            });
        }
        
        if (filteredTalents.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No talents found</p>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = filteredTalents.map(talent => this.renderTalentCard(talent, checkDate)).join('');
        this.setDragHandlers();
    },
    
    renderTalentCard(talent, checkDate) {
        const initials = talent.name.split(' ').map(n => n[0]).join('').toUpperCase();
        const dateToCheck = checkDate || this.selectedDate || this.getTodayString();
        const isAvailable = this.checkAvailability(talent.id, dateToCheck);
        
        // Get project name if assigned
        let assignmentInfo = '';
        if (!isAvailable) {
            const assignment = this.getAssignmentForDate(talent.id, dateToCheck);
            if (assignment) {
                if (assignment.type === 'allocation') {
                    const projects = StateManager.getState('projects') || [];
                    const project = projects.find(p => p.id === assignment.project_id);
                    assignmentInfo = project ? project.name : 'Allocated';
                } else if (assignment.type === 'project') {
                    assignmentInfo = assignment.projectName || 'Assigned';
                }
            }
        }
        
        return `
            <div class="talent-card ${!isAvailable ? 'unavailable' : ''}" draggable="true" data-talent-id="${talent.id}">
                <div class="talent-avatar">${initials}</div>
                <div class="talent-info">
                    <div class="talent-name">${talent.name}</div>
                    ${talent.homebase_location ? `<div class="talent-location">📍 ${talent.homebase_location}</div>` : ''}
                    <div class="talent-status ${isAvailable ? 'available' : 'unavailable'}">
                        ${isAvailable ? '✓ Available' : `⚠ ${assignmentInfo || 'Busy'}`}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Get assignment info for a talent on a specific date
     * Checks both allocations (calendar) and project assignments
     */
    getAssignmentForDate(talentId, date) {
        const allocations = StateManager.getState('allocations') || [];
        const projects = StateManager.getState('projects') || [];
        
        // First check allocations (specific date ranges from calendar)
        const allocation = allocations.find(a => 
            a.talent_id === talentId && 
            a.start_date <= date && 
            a.end_date >= date
        );
        
        if (allocation) {
            return { type: 'allocation', ...allocation };
        }
        
        // Then check project assignments (if date falls within project dates)
        for (const project of projects) {
            if (!project.assigned_talents?.includes(talentId)) continue;
            if (!project.start_date && !project.end_date) continue;
            
            const startOk = !project.start_date || project.start_date <= date;
            const endOk = !project.end_date || project.end_date >= date;
            
            if (startOk && endOk) {
                return { type: 'project', project_id: project.id, projectName: project.name };
            }
        }
        
        return null;
    },
    
    /**
     * Check if talent is available on a specific date
     * Considers both allocations and project assignments
     */
    checkAvailability(talentId, date) {
        const allocations = StateManager.getState('allocations') || [];
        const projects = StateManager.getState('projects') || [];
        
        // Check allocations (specific date ranges from calendar)
        const hasAllocation = allocations.some(a => 
            a.talent_id === talentId && 
            a.start_date <= date && 
            a.end_date >= date
        );
        
        if (hasAllocation) return false;
        
        // Check project assignments (if date falls within project dates)
        const hasProjectAssignment = projects.some(project => {
            if (!project.assigned_talents?.includes(talentId)) return false;
            if (!project.start_date && !project.end_date) return false;
            
            const startOk = !project.start_date || project.start_date <= date;
            const endOk = !project.end_date || project.end_date >= date;
            
            return startOk && endOk;
        });
        
        return !hasProjectAssignment;
    },
    
    setDragHandlers() {
        const cards = document.querySelectorAll('.talent-card');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.talentId);
                StateManager.setState('ui.draggedTalent', card.dataset.talentId);
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                StateManager.setState('ui.draggedTalent', null);
            });
        });
    },
    
    subscribeToState() {
        StateManager.subscribe('talents', () => this.renderTalentList());
        StateManager.subscribe('allocations', () => this.renderTalentList());
        StateManager.subscribe('projects', () => this.renderTalentList()); // Also track project assignments
        StateManager.subscribe('areas', () => this.populateAreaFilter());
    },
    
    filterByAvailability(date) {
        // Re-render with date-specific availability
        this.renderTalentList();
    },
    
    filterByArea(areaId) {
        const areaSelect = document.getElementById('filter-area');
        if (areaSelect) {
            areaSelect.value = areaId;
            this.renderTalentList();
        }
    }
};
