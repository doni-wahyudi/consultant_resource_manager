/**
 * Calendar Planning Page
 * Integrates talent sidebar with calendar for drag-and-drop allocation
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.4
 */

const CalendarPage = {
    render() {
        const container = document.getElementById('page-calendar');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Resource Planning</h1>
            </div>
            <div class="calendar-page-layout">
                <div id="talent-sidebar-container"></div>
                <div class="calendar-main">
                    <div id="calendar-container"></div>
                    <div id="legend-container"></div>
                </div>
            </div>
        `;
        
        // Render components
        TalentSidebar.render(document.getElementById('talent-sidebar-container'));
        Calendar.render(document.getElementById('calendar-container'));
        Legend.render(document.getElementById('legend-container'));
        
        // Set up callbacks
        Calendar.onDateClick((date, talentId) => this.handleDateClick(date, talentId));
        Calendar.onAllocationClick((allocation) => this.handleAllocationClick(allocation));
        Calendar.onProjectClick((project) => this.handleProjectClick(project));
        
        // Initialize with today's date selected
        const today = TalentSidebar.getTodayString();
        this.highlightSelectedDate(today);
        
        // Subscribe to state changes to update legend
        StateManager.subscribe('projects', () => {
            Legend.render(document.getElementById('legend-container'));
        });
    },
    
    /**
     * Handle date click or talent drop on calendar
     * @param {string} date - Selected date
     * @param {string} talentId - Talent ID (if dropped)
     */
    async handleDateClick(date, talentId) {
        // Always update sidebar availability for the clicked date
        TalentSidebar.setSelectedDate(date);
        
        // Highlight selected date on calendar
        this.highlightSelectedDate(date);
        
        if (!talentId) return;
        
        // Require auth for creating allocations
        if (!(await EditGuard.canEdit())) return;
        
        const projects = StateManager.getState('projects') || [];
        const talents = StateManager.getState('talents') || [];
        // Include both in_progress and upcoming projects for allocation
        const allocatableProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'upcoming');
        const talent = talents.find(t => t.id === talentId);
        
        if (allocatableProjects.length === 0) {
            Toast.warning('No active or upcoming projects available');
            return;
        }
        
        // Group projects by status for better UX
        const inProgressProjects = allocatableProjects.filter(p => p.status === 'in_progress');
        const upcomingProjects = allocatableProjects.filter(p => p.status === 'upcoming');
        
        // Build options with status grouping
        const projectOptions = [
            ...inProgressProjects.map(p => ({ value: p.id, label: `🔵 ${p.name}` })),
            ...upcomingProjects.map(p => ({ value: p.id, label: `🟣 ${p.name}` }))
        ];
        
        Modal.form({
            title: `Allocate ${talent ? talent.name : 'Talent'}`,
            fields: [
                {
                    name: 'project_id',
                    label: 'Project',
                    type: 'select',
                    required: true,
                    placeholder: 'Select a project',
                    options: projectOptions
                },
                {
                    name: 'start_date',
                    label: 'Start Date',
                    type: 'date',
                    required: true,
                    value: date
                },
                {
                    name: 'end_date',
                    label: 'End Date',
                    type: 'date',
                    required: true,
                    value: date
                },
                {
                    name: 'notes',
                    label: 'Notes',
                    type: 'textarea'
                }
            ],
            onSubmit: async (data) => {
                // Validate date range
                if (data.end_date < data.start_date) {
                    Toast.error('End date must be after start date');
                    throw new Error('Invalid date range');
                }
                
                // Check for conflicts (Requirement 9.3)
                const conflicts = await AllocationService.checkConflicts(
                    talentId, 
                    data.start_date, 
                    data.end_date
                );
                
                if (conflicts.length > 0) {
                    const conflictNames = conflicts.map(c => c.projectName).join(', ');
                    Toast.warning(`Scheduling conflict with: ${conflictNames}`);
                    // Still allow creation but warn user
                }
                
                try {
                    await AllocationService.create({
                        talent_id: talentId,
                        ...data
                    });
                    const selectedProject = projects.find(p => p.id === data.project_id);
                    await ActivityLogService.log('created', 'allocation', null, 
                        `${talent?.name || 'Talent'} - ${selectedProject?.name || 'Project'}`);
                    Toast.success('Allocation created');
                    Calendar.showAllocations();
                    TalentSidebar.renderTalentList(); // Update availability
                } catch (error) {
                    Toast.error('Failed to create allocation');
                    throw error;
                }
            }
        });
    },
    
    /**
     * Handle allocation click for edit/delete
     * @param {Object} allocation - Allocation object
     */
    async handleAllocationClick(allocation) {
        // Require auth for editing allocations
        if (!(await EditGuard.canEdit())) return;
        
        const projects = StateManager.getState('projects') || [];
        const talents = StateManager.getState('talents') || [];
        // Include both in_progress and upcoming projects for editing
        const allocatableProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'upcoming');
        const talent = talents.find(t => t.id === allocation.talent_id);
        const project = projects.find(p => p.id === allocation.project_id);
        
        // Show action selection modal
        const action = await this.showAllocationActions(allocation, talent, project);
        
        if (action === 'edit') {
            await this.editAllocation(allocation, allocatableProjects, talent);
        } else if (action === 'delete') {
            await this.deleteAllocation(allocation, talent, project);
        }
    },
    
    /**
     * Show allocation action options
     * @param {Object} allocation - Allocation object
     * @param {Object} talent - Talent object
     * @param {Object} project - Project object
     * @returns {Promise<string|null>} Selected action
     */
    showAllocationActions(allocation, talent, project) {
        return new Promise((resolve) => {
            Modal.show({
                title: 'Allocation Options',
                content: `
                    <div class="allocation-details">
                        <p><strong>Talent:</strong> ${talent ? talent.name : 'Unknown'}</p>
                        <p><strong>Project:</strong> ${project ? project.name : 'Unknown'}</p>
                        <p><strong>Period:</strong> ${allocation.start_date} to ${allocation.end_date}</p>
                        ${allocation.notes ? `<p><strong>Notes:</strong> ${allocation.notes}</p>` : ''}
                    </div>
                `,
                footer: `
                    <button class="btn btn-secondary" id="allocation-cancel-btn">Cancel</button>
                    <button class="btn btn-primary" id="allocation-edit-btn">Edit</button>
                    <button class="btn btn-danger" id="allocation-delete-btn">Delete</button>
                `,
                size: 'sm'
            });
            
            // Use specific button IDs for more reliable event handling
            document.getElementById('allocation-cancel-btn')?.addEventListener('click', () => {
                Modal.hide();
                resolve(null);
            });
            
            document.getElementById('allocation-edit-btn')?.addEventListener('click', () => {
                Modal.hide();
                resolve('edit');
            });
            
            document.getElementById('allocation-delete-btn')?.addEventListener('click', () => {
                Modal.hide();
                resolve('delete');
            });
        });
    },
    
    /**
     * Edit an existing allocation
     * @param {Object} allocation - Allocation to edit
     * @param {Array} activeProjects - Active projects list
     * @param {Object} talent - Talent object
     */
    async editAllocation(allocation, allocatableProjects, talent) {
        // Group projects by status for better UX
        const inProgressProjects = allocatableProjects.filter(p => p.status === 'in_progress');
        const upcomingProjects = allocatableProjects.filter(p => p.status === 'upcoming');
        
        // Build options with status grouping
        const projectOptions = [
            ...inProgressProjects.map(p => ({ value: p.id, label: `🔵 ${p.name}` })),
            ...upcomingProjects.map(p => ({ value: p.id, label: `🟣 ${p.name}` }))
        ];
        
        Modal.form({
            title: `Edit Allocation - ${talent ? talent.name : 'Talent'}`,
            fields: [
                {
                    name: 'project_id',
                    label: 'Project',
                    type: 'select',
                    required: true,
                    value: allocation.project_id,
                    options: projectOptions
                },
                {
                    name: 'start_date',
                    label: 'Start Date',
                    type: 'date',
                    required: true,
                    value: allocation.start_date
                },
                {
                    name: 'end_date',
                    label: 'End Date',
                    type: 'date',
                    required: true,
                    value: allocation.end_date
                },
                {
                    name: 'notes',
                    label: 'Notes',
                    type: 'textarea',
                    value: allocation.notes || ''
                }
            ],
            onSubmit: async (data) => {
                // Validate date range
                if (data.end_date < data.start_date) {
                    Toast.error('End date must be after start date');
                    throw new Error('Invalid date range');
                }
                
                // Check for conflicts (excluding current allocation)
                const conflicts = await AllocationService.checkConflicts(
                    allocation.talent_id, 
                    data.start_date, 
                    data.end_date,
                    allocation.id
                );
                
                if (conflicts.length > 0) {
                    const conflictNames = conflicts.map(c => c.projectName).join(', ');
                    Toast.warning(`Scheduling conflict with: ${conflictNames}`);
                }
                
                try {
                    await AllocationService.update(allocation.id, data);
                    const selectedProject = allocatableProjects.find(p => p.id === data.project_id);
                    await ActivityLogService.log('updated', 'allocation', allocation.id, 
                        `${talent?.name || 'Talent'} - ${selectedProject?.name || 'Project'}`);
                    Toast.success('Allocation updated');
                    Calendar.showAllocations();
                    TalentSidebar.renderTalentList();
                } catch (error) {
                    Toast.error('Failed to update allocation');
                    throw error;
                }
            }
        });
    },
    
    /**
     * Delete an allocation with confirmation
     * @param {Object} allocation - Allocation to delete
     * @param {Object} talent - Talent object
     * @param {Object} project - Project object
     */
    async deleteAllocation(allocation, talent, project) {
        const confirmed = await Modal.confirm(
            'Are you sure you want to delete this allocation?',
            { title: 'Delete Allocation', confirmText: 'Delete' }
        );
        
        if (confirmed) {
            try {
                await AllocationService.delete(allocation.id);
                await ActivityLogService.log('deleted', 'allocation', allocation.id, 
                    `${talent?.name || 'Talent'} - ${project?.name || 'Project'}`);
                Toast.success('Allocation deleted');
                Calendar.showAllocations();
                TalentSidebar.renderTalentList();
            } catch (error) {
                Toast.error('Failed to delete allocation');
            }
        }
    },
    
    /**
     * Highlight selected date on calendar
     * @param {string} date - Date string (YYYY-MM-DD)
     */
    highlightSelectedDate(date) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to clicked date
        const dayCell = document.querySelector(`.calendar-day[data-date="${date}"]`);
        if (dayCell) {
            dayCell.classList.add('selected');
        }
    },
    
    /**
     * Handle project click - show project details popup
     * @param {Object} project - Project object
     */
    handleProjectClick(project) {
        const clients = StateManager.getState('clients') || [];
        const talents = StateManager.getState('talents') || [];
        
        const client = clients.find(c => c.id === project.client_id);
        const assignedTalents = (project.assigned_talents || [])
            .map(tid => talents.find(t => t.id === tid)?.name)
            .filter(Boolean);
        
        const typeIcon = project.project_type === 'online' ? '🌐' : '📍';
        const typeLabel = project.project_type === 'online' ? 'Online' : 'Offline';
        
        Modal.show({
            title: project.name,
            content: `
                <div class="project-details-popup">
                    <div class="project-detail-row">
                        <span class="project-color-indicator" style="background-color: ${project.color}"></span>
                        <span class="status-badge status-${project.status}">${project.status.replace('_', ' ')}</span>
                    </div>
                    
                    ${project.description ? `
                        <div class="project-detail-section">
                            <label>Description</label>
                            <p>${project.description}</p>
                        </div>
                    ` : ''}
                    
                    <div class="project-detail-grid">
                        <div class="project-detail-item">
                            <label>Client</label>
                            <p>${client?.name || '-'}</p>
                        </div>
                        <div class="project-detail-item">
                            <label>Type</label>
                            <p>${typeIcon} ${typeLabel}</p>
                        </div>
                        <div class="project-detail-item">
                            <label>Location</label>
                            <p>${project.location || '-'}</p>
                        </div>
                        <div class="project-detail-item">
                            <label>Duration</label>
                            <p>${project.start_date || 'TBD'} → ${project.end_date || 'TBD'}</p>
                        </div>
                    </div>
                    
                    <div class="project-detail-section">
                        <label>Assigned Talents (${assignedTalents.length})</label>
                        ${assignedTalents.length > 0 
                            ? `<div class="talent-chips">${assignedTalents.map(name => `<span class="talent-chip">${name}</span>`).join('')}</div>`
                            : '<p class="text-muted">No talents assigned</p>'
                        }
                    </div>
                    
                    ${(project.required_skills || []).length > 0 ? `
                        <div class="project-detail-section">
                            <label>Required Skills</label>
                            <div class="skill-chips">${project.required_skills.map(skill => `<span class="skill-chip">${skill}</span>`).join('')}</div>
                        </div>
                    ` : ''}
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="close">Close</button>
                <button class="btn btn-primary" data-action="edit">Edit Project</button>
            `,
            size: 'md'
        });
        
        // Handle button clicks
        const footer = document.querySelector('.modal-footer');
        footer?.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'close') {
                Modal.hide();
            } else if (action === 'edit') {
                Modal.hide();
                // Navigate to projects page and open edit form
                Router.navigate('projects');
                setTimeout(() => {
                    ProjectsPage.showProjectForm(project);
                }, 100);
            }
        });
    }
};
