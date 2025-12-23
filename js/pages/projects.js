/**
 * Projects Management Page
 * Displays projects list with CRUD operations
 */

const ProjectsPage = {
    searchQuery: '',
    filterStatus: '',
    filterClient: '',
    selectedProjects: new Set(),
    
    render() {
        const container = document.getElementById('page-projects');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Projects</h1>
                <div class="page-actions">
                    <button class="btn btn-secondary" id="bulk-project-actions-btn" style="display:none;">Bulk Actions</button>
                    <button class="btn btn-primary" id="add-project-btn">+ Add Project</button>
                </div>
            </div>
            <div class="card">
                <div class="filter-bar">
                    <input type="text" class="form-input" id="project-search" placeholder="Search projects..." style="flex:2;">
                    <select class="form-select" id="project-filter-status">
                        <option value="">All Status</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="in_progress">In Progress</option>
                    </select>
                    <select class="form-select" id="project-filter-client">
                        <option value="">All Clients</option>
                    </select>
                    <button class="btn btn-secondary btn-sm" id="clear-project-filters-btn">Clear</button>
                </div>
                <div id="projects-list"></div>
            </div>
        `;
        
        this.populateFilters();
        
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showTableSkeleton('#projects-list', 5, 5);
        } else {
            this.renderProjectsList();
        }
        
        this.setupEventListeners();
        this.subscribeToState();
    },
    
    populateFilters() {
        const clients = StateManager.getState('clients') || [];
        const clientSelect = document.getElementById('project-filter-client');
        if (clientSelect) {
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                clientSelect.appendChild(option);
            });
        }
    },
    
    getFilteredProjects() {
        const projects = StateManager.getState('projects') || [];
        const clients = StateManager.getState('clients') || [];
        const activeProjects = projects.filter(p => p.status !== 'completed');
        
        return activeProjects.filter(project => {
            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const nameMatch = project.name?.toLowerCase().includes(query);
                const descMatch = project.description?.toLowerCase().includes(query);
                const client = clients.find(c => c.id === project.client_id);
                const clientMatch = client?.name?.toLowerCase().includes(query);
                if (!nameMatch && !descMatch && !clientMatch) return false;
            }
            
            // Status filter
            if (this.filterStatus && project.status !== this.filterStatus) {
                return false;
            }
            
            // Client filter
            if (this.filterClient && project.client_id !== this.filterClient) {
                return false;
            }
            
            return true;
        });
    },
    
    renderProjectsList() {
        const container = document.getElementById('projects-list');
        const projects = this.getFilteredProjects();
        const clients = StateManager.getState('clients') || [];
        const talents = StateManager.getState('talents') || [];
        const allProjects = (StateManager.getState('projects') || []).filter(p => p.status !== 'completed');
        
        // Update bulk actions button
        const bulkBtn = document.getElementById('bulk-project-actions-btn');
        if (bulkBtn) {
            bulkBtn.style.display = this.selectedProjects.size > 0 ? 'inline-flex' : 'none';
            bulkBtn.textContent = `Bulk Actions (${this.selectedProjects.size})`;
        }
        
        if (allProjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <h3 class="empty-state-title">No projects yet</h3>
                    <p class="empty-state-text">Add your first project to get started</p>
                </div>
            `;
            return;
        }
        
        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3 class="empty-state-title">No matches found</h3>
                    <p class="empty-state-text">Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:40px;"><input type="checkbox" id="select-all-projects" ${this.selectedProjects.size === projects.length && projects.length > 0 ? 'checked' : ''}></th>
                        <th>Color</th>
                        <th>Name</th>
                        <th>Client</th>
                        <th>Talents</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${projects.map(project => {
                        const client = clients.find(c => c.id === project.client_id);
                        const assignedTalents = (project.assigned_talents || [])
                            .map(tid => talents.find(t => t.id === tid)?.name)
                            .filter(Boolean);
                        const talentDisplay = assignedTalents.length > 0 
                            ? `${assignedTalents.slice(0, 2).join(', ')}${assignedTalents.length > 2 ? ` +${assignedTalents.length - 2}` : ''}`
                            : '-';
                        return `
                            <tr class="${this.selectedProjects.has(project.id) ? 'row-selected' : ''}">
                                <td><input type="checkbox" class="project-checkbox" data-id="${project.id}" ${this.selectedProjects.has(project.id) ? 'checked' : ''}></td>
                                <td><div class="legend-color" style="background-color: ${project.color}"></div></td>
                                <td>
                                    ${project.name}
                                    ${(project.required_skills || []).length > 0 ? `
                                        <div class="project-skills-hint">
                                            ${(project.required_skills || []).slice(0, 2).join(', ')}${(project.required_skills || []).length > 2 ? '...' : ''}
                                        </div>
                                    ` : ''}
                                </td>
                                <td>${client?.name || '-'}</td>
                                <td>${talentDisplay}</td>
                                <td>
                                    <select class="form-select" data-action="status" data-id="${project.id}">
                                        <option value="upcoming" ${project.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
                                        <option value="in_progress" ${project.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${project.id}">Edit</button>
                                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${project.id}">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="table-footer">
                <span class="text-muted">Showing ${projects.length} of ${allProjects.length} active projects</span>
            </div>
        `;
    },
    
    setupEventListeners() {
        document.getElementById('add-project-btn').addEventListener('click', async () => {
            if (await EditGuard.canEdit()) {
                this.showProjectForm();
            }
        });
        
        // Search and filter listeners
        document.getElementById('project-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderProjectsList();
        });
        
        document.getElementById('project-filter-status')?.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.renderProjectsList();
        });
        
        document.getElementById('project-filter-client')?.addEventListener('change', (e) => {
            this.filterClient = e.target.value;
            this.renderProjectsList();
        });
        
        document.getElementById('clear-project-filters-btn')?.addEventListener('click', () => {
            this.searchQuery = '';
            this.filterStatus = '';
            this.filterClient = '';
            document.getElementById('project-search').value = '';
            document.getElementById('project-filter-status').value = '';
            document.getElementById('project-filter-client').value = '';
            this.renderProjectsList();
        });
        
        // Bulk actions
        document.getElementById('bulk-project-actions-btn')?.addEventListener('click', async () => {
            if (await EditGuard.canEdit()) {
                this.showBulkActionsMenu();
            }
        });
        
        document.getElementById('projects-list').addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            
            if (action === 'edit') {
                if (await EditGuard.canEdit()) {
                    const project = (StateManager.getState('projects') || []).find(p => p.id === id);
                    if (project) this.showProjectForm(project);
                }
            } else if (action === 'delete') {
                if (await EditGuard.canEdit()) {
                    const project = (StateManager.getState('projects') || []).find(p => p.id === id);
                    const confirmed = await Modal.confirm('Are you sure? This will also delete all allocations for this project.');
                    if (confirmed) {
                        try {
                            await ProjectService.delete(id);
                            await ActivityLogService.log('deleted', 'project', id, project?.name);
                            Toast.success('Project deleted');
                        } catch (error) {
                            Toast.error('Failed to delete project');
                        }
                    }
                }
            }
        });
        
        document.getElementById('projects-list').addEventListener('change', async (e) => {
            if (e.target.dataset.action === 'status') {
                if (await EditGuard.canEdit()) {
                    const project = (StateManager.getState('projects') || []).find(p => p.id === e.target.dataset.id);
                    try {
                        await ProjectService.updateStatus(e.target.dataset.id, e.target.value);
                        await ActivityLogService.log('status_changed', 'project', e.target.dataset.id, project?.name, { status: e.target.value });
                        Toast.success('Status updated');
                    } catch (error) {
                        Toast.error('Failed to update status');
                    }
                } else {
                    // Revert the select if not authenticated
                    this.renderProjectsList();
                }
            } else if (e.target.id === 'select-all-projects') {
                const projects = this.getFilteredProjects();
                if (e.target.checked) {
                    projects.forEach(p => this.selectedProjects.add(p.id));
                } else {
                    this.selectedProjects.clear();
                }
                this.renderProjectsList();
            } else if (e.target.classList.contains('project-checkbox')) {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    this.selectedProjects.add(id);
                } else {
                    this.selectedProjects.delete(id);
                }
                this.renderProjectsList();
            }
        });
    },
    
    async showBulkActionsMenu() {
        const count = this.selectedProjects.size;
        const action = await new Promise(resolve => {
            Modal.show({
                title: `Bulk Actions (${count} selected)`,
                content: `
                    <div class="bulk-actions-list">
                        <button class="btn btn-secondary btn-block" data-bulk="status-upcoming">Set Status: Upcoming</button>
                        <button class="btn btn-secondary btn-block" data-bulk="status-in_progress">Set Status: In Progress</button>
                        <button class="btn btn-secondary btn-block" data-bulk="status-completed">Set Status: Completed</button>
                        <button class="btn btn-danger btn-block" data-bulk="delete">Delete Selected</button>
                    </div>
                `,
                footer: '<button class="btn btn-secondary" data-action="cancel">Cancel</button>'
            });
            
            document.querySelector('.modal-body').addEventListener('click', (e) => {
                const bulkAction = e.target.dataset.bulk;
                if (bulkAction) {
                    Modal.hide();
                    resolve(bulkAction);
                }
            });
            document.querySelector('.modal-footer').addEventListener('click', (e) => {
                if (e.target.dataset.action === 'cancel') {
                    Modal.hide();
                    resolve(null);
                }
            });
        });
        
        if (!action) return;
        
        if (action === 'delete') {
            const confirmed = await Modal.confirm(`Delete ${count} projects? This cannot be undone.`);
            if (confirmed) {
                try {
                    for (const id of this.selectedProjects) {
                        await ProjectService.delete(id);
                    }
                    this.selectedProjects.clear();
                    Toast.success(`${count} projects deleted`);
                } catch (error) {
                    Toast.error('Failed to delete some projects');
                }
            }
        } else if (action.startsWith('status-')) {
            const newStatus = action.replace('status-', '');
            try {
                for (const id of this.selectedProjects) {
                    await ProjectService.updateStatus(id, newStatus);
                }
                this.selectedProjects.clear();
                Toast.success(`${count} projects updated`);
            } catch (error) {
                Toast.error('Failed to update some projects');
            }
        }
    },
    
    showProjectForm(project = null) {
        const clients = StateManager.getState('clients') || [];
        const talents = StateManager.getState('talents') || [];
        const currentSkills = project?.required_skills || [];
        const currentTalents = project?.assigned_talents || [];
        
        const content = `
            <form id="project-form" class="modal-form">
                <div class="form-group">
                    <label class="form-label">Project Name <span class="required">*</span></label>
                    <input type="text" name="name" class="form-input" value="${project?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-textarea">${project?.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Client</label>
                    <select name="client_id" class="form-select">
                        <option value="">Select Client</option>
                        ${clients.map(c => `
                            <option value="${c.id}" ${project?.client_id === c.id ? 'selected' : ''}>${c.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" name="start_date" class="form-input" value="${project?.start_date || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Date</label>
                        <input type="date" name="end_date" class="form-input" value="${project?.end_date || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Project Type</label>
                        <select name="project_type" class="form-select">
                            <option value="offline" ${project?.project_type === 'offline' || !project?.project_type ? 'selected' : ''}>Offline</option>
                            <option value="online" ${project?.project_type === 'online' ? 'selected' : ''}>Online</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Location</label>
                        <input type="text" name="location" class="form-input" value="${project?.location || ''}" placeholder="City, venue, or online platform">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Required Skills</label>
                    <p class="form-hint">Skills needed for this project (for filtering talents later)</p>
                    <div class="skills-input-container">
                        <div class="tag-list" id="required-skills-tags">
                            ${currentSkills.map(skill => `
                                <span class="tag" data-skill="${skill}">
                                    ${skill}
                                    <span class="tag-remove" data-remove-skill="${skill}">&times;</span>
                                </span>
                            `).join('')}
                        </div>
                        <div class="form-inline mt-4">
                            <input type="text" id="new-required-skill-input" class="form-input" placeholder="Add required skill...">
                            <button type="button" class="btn btn-secondary btn-sm" id="add-required-skill-btn">Add</button>
                        </div>
                    </div>
                    <input type="hidden" name="required_skills" id="required-skills-hidden" value='${JSON.stringify(currentSkills)}'>
                </div>
                <div class="form-group">
                    <label class="form-label">Assign Talents</label>
                    <p class="form-hint">Select talents to assign to this project</p>
                    <div class="talent-selection-list" id="talent-checkboxes">
                        ${talents.length > 0 ? talents.map(t => `
                            <label class="checkbox-label talent-checkbox">
                                <input type="checkbox" name="talents" value="${t.id}" 
                                    ${currentTalents.includes(t.id) ? 'checked' : ''}>
                                <span class="talent-checkbox-info">
                                    <span class="talent-checkbox-name">${t.name}</span>
                                    <span class="talent-checkbox-skills">${(t.skills || []).slice(0, 3).join(', ') || 'No skills'}</span>
                                </span>
                            </label>
                        `).join('') : '<p class="text-muted">No talents available. Add talents first.</p>'}
                    </div>
                </div>
            </form>
        `;
        
        Modal.show({
            title: project ? 'Edit Project' : 'Add Project',
            content: content,
            size: 'lg',
            footer: `
                <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                <button type="button" class="btn btn-primary" data-action="save">Save</button>
            `
        });
        
        // Set up required skills management
        this.setupRequiredSkillsInput(currentSkills);
        
        // Set up form submission with proper event handling
        const saveBtn = document.querySelector('.modal-footer [data-action="save"]');
        const cancelBtn = document.querySelector('.modal-footer [data-action="cancel"]');
        
        // Track if submission is in progress to prevent duplicates
        let isSubmitting = false;
        
        cancelBtn?.addEventListener('click', () => Modal.hide());
        
        saveBtn?.addEventListener('click', async () => {
            if (isSubmitting) return; // Prevent duplicate submissions
            isSubmitting = true;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            await this.handleProjectFormSubmit(project);
        });
    },
    
    setupRequiredSkillsInput(initialSkills) {
        let skills = [...initialSkills];
        
        const updateSkillsDisplay = () => {
            const container = document.getElementById('required-skills-tags');
            const hidden = document.getElementById('required-skills-hidden');
            
            container.innerHTML = skills.map(skill => `
                <span class="tag" data-skill="${skill}">
                    ${skill}
                    <span class="tag-remove" data-remove-skill="${skill}">&times;</span>
                </span>
            `).join('');
            
            hidden.value = JSON.stringify(skills);
        };
        
        // Add skill button
        document.getElementById('add-required-skill-btn')?.addEventListener('click', () => {
            const input = document.getElementById('new-required-skill-input');
            const skill = input.value.trim();
            if (skill && !skills.includes(skill)) {
                skills.push(skill);
                updateSkillsDisplay();
                input.value = '';
            }
        });
        
        // Add skill on Enter
        document.getElementById('new-required-skill-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('add-required-skill-btn')?.click();
            }
        });
        
        // Remove skill
        document.getElementById('required-skills-tags')?.addEventListener('click', (e) => {
            const skillToRemove = e.target.dataset.removeSkill;
            if (skillToRemove) {
                skills = skills.filter(s => s !== skillToRemove);
                updateSkillsDisplay();
            }
        });
    },
    
    async handleProjectFormSubmit(existingProject) {
        const form = document.getElementById('project-form');
        if (!form) return;
        
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name'),
            description: formData.get('description') || null,
            client_id: formData.get('client_id') || null,
            start_date: formData.get('start_date') || null,
            end_date: formData.get('end_date') || null,
            project_type: formData.get('project_type') || 'offline',
            location: formData.get('location') || null,
            required_skills: JSON.parse(document.getElementById('required-skills-hidden')?.value || '[]')
        };
        
        // Get selected talents
        const selectedTalents = Array.from(document.querySelectorAll('input[name="talents"]:checked'))
            .map(cb => cb.value);
        
        if (!data.name) {
            Toast.error('Project name is required');
            return;
        }
        
        // Close modal first to prevent double submission
        Modal.hide();
        
        try {
            let projectId;
            
            if (existingProject) {
                await ProjectService.update(existingProject.id, data, { showToast: false });
                projectId = existingProject.id;
                
                // Update talent assignments
                const currentTalents = existingProject.assigned_talents || [];
                const talentsToAdd = selectedTalents.filter(t => !currentTalents.includes(t));
                const talentsToRemove = currentTalents.filter(t => !selectedTalents.includes(t));
                
                for (const talentId of talentsToAdd) {
                    await ProjectService.assignTalent(projectId, talentId);
                }
                for (const talentId of talentsToRemove) {
                    await ProjectService.removeTalent(projectId, talentId);
                }
                
                Toast.success('Project updated');
            } else {
                const newProject = await ProjectService.create(data, { showToast: false });
                projectId = newProject.id;
                
                // Assign talents to new project (without calling getAll each time)
                const client = SupabaseService.getClient();
                if (client && selectedTalents.length > 0) {
                    const insertData = selectedTalents.map(talentId => ({
                        project_id: projectId,
                        talent_id: talentId
                    }));
                    await client.from('project_talents').insert(insertData);
                    await ProjectService.getAll(); // Refresh once after all inserts
                } else {
                    // Local mode - update state directly
                    const projects = StateManager.getState('projects') || [];
                    const index = projects.findIndex(p => p.id === projectId);
                    if (index !== -1) {
                        projects[index].assigned_talents = selectedTalents;
                        StateManager.setState('projects', [...projects]);
                    }
                }
                
                Toast.success('Project created');
            }
        } catch (error) {
            console.error('Failed to save project:', error);
            Toast.error('Failed to save project');
        }
    },
    
    subscribeToState() {
        StateManager.subscribe('projects', () => this.renderProjectsList());
        StateManager.subscribe('talents', () => this.renderProjectsList());
        StateManager.subscribe('clients', () => this.renderProjectsList());
    }
};
