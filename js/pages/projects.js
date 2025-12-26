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
                        <th>Dates</th>
                        <th>Talents</th>
                        <th>Attachment</th>
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
            const attachmentCount = (project.attachments || []).length;
            const batchCount = (project.batches || []).length;
            const dateDisplay = batchCount > 1
                ? `<span class="batch-label">Batch (${batchCount})</span>`
                : batchCount === 1
                    ? (project.batches[0].start_date === project.batches[0].end_date
                        ? this.formatShortDate(project.batches[0].start_date)
                        : `${this.formatShortDate(project.batches[0].start_date)} - ${this.formatShortDate(project.batches[0].end_date)}`)
                    : project.start_date && project.end_date
                        ? (project.start_date === project.end_date
                            ? this.formatShortDate(project.start_date)
                            : `${this.formatShortDate(project.start_date)} - ${this.formatShortDate(project.end_date)}`)
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
                                <td class="date-cell">${dateDisplay}</td>
                                <td>${talentDisplay}</td>
                                <td>
                                    ${attachmentCount > 0
                    ? `<span class="attachment-badge" data-action="edit" data-id="${project.id}" title="View attachments">📎 ${attachmentCount}</span>`
                    : ''}
                                    <button class="btn-icon-sm" data-action="edit" data-id="${project.id}" title="Add attachment">+</button>
                                </td>
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
                <div class="form-group">
                    <label class="form-label">Project Dates</label>
                    <p class="form-hint">Set the main project date range</p>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label-sm">Start Date</label>
                            <input type="date" name="start_date" class="form-input" value="${project?.start_date || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label-sm">End Date</label>
                            <input type="date" name="end_date" class="form-input" value="${project?.end_date || ''}">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Additional Date Batches <span class="text-muted">(Optional)</span></label>
                    <p class="form-hint">Add more date ranges if this project has non-continuous dates</p>
                    <div class="batch-dates-container">
                        <div id="batch-dates-list" class="batch-list">
                            ${(project?.batches || []).map(batch => `
                                <div class="batch-item" data-batch-id="${batch.id}">
                                    <span class="batch-dates">${this.formatBatchDate(batch.start_date)} - ${this.formatBatchDate(batch.end_date)}</span>
                                    <span class="batch-days">(${this.calculateBatchDays(batch.start_date, batch.end_date)} days)</span>
                                    ${batch.notes ? `<span class="batch-notes">${batch.notes}</span>` : ''}
                                    <button type="button" class="btn-icon batch-remove" data-remove-batch="${batch.id}">&times;</button>
                                </div>
                            `).join('')}
                        </div>
                        <div class="batch-add-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <input type="date" id="batch-start-date" class="form-input" placeholder="Start">
                                </div>
                                <div class="form-group">
                                    <input type="date" id="batch-end-date" class="form-input" placeholder="End">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="flex:1;">
                                    <input type="text" id="batch-notes" class="form-input" placeholder="Notes (optional)">
                                </div>
                                <button type="button" class="btn btn-secondary btn-sm" id="add-batch-btn">+ Add Batch</button>
                            </div>
                        </div>
                        <div id="batch-total-days" class="batch-total"></div>
                    </div>
                    <input type="hidden" id="batches-hidden" value='${JSON.stringify(project?.batches || [])}'>
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
                ${project ? `
                <div class="form-group">
                    <label class="form-label">Attachments</label>
                    <p class="form-hint">Upload files related to this project (contracts, briefs, etc.)</p>
                    <div class="file-upload-container">
                        <div id="project-attachments-list" class="attachments-list"></div>
                        <div class="file-dropzone" id="project-file-dropzone">
                            <input type="file" id="project-file-input" multiple accept="*/*" style="display:none;">
                            <div class="dropzone-content">
                                <span class="dropzone-icon">📎</span>
                                <span class="dropzone-text">Drop files here or <button type="button" class="btn-link" id="project-file-browse">browse</button></span>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
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

        // Set up batch dates management
        this.setupBatchDatesInput(project?.batches || []);

        // Set up file attachments (only for existing projects)
        if (project) {
            this.setupFileAttachments(project.id);
        }

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

    async setupFileAttachments(projectId) {
        const listContainer = document.getElementById('project-attachments-list');
        const dropzone = document.getElementById('project-file-dropzone');
        const fileInput = document.getElementById('project-file-input');
        const browseBtn = document.getElementById('project-file-browse');

        if (!listContainer || !dropzone) return;

        // Load existing attachments
        const loadAttachments = async () => {
            try {
                const attachments = await StorageService.getAttachments(projectId, 'general');
                listContainer.innerHTML = attachments.length > 0 ? attachments.map(a => `
                    <div class="attachment-item" data-id="${a.id}">
                        <span class="attachment-icon">${StorageService.getFileIcon(a.file_type)}</span>
                        <div class="attachment-info">
                            <a href="${StorageService.getPublicUrl(a.storage_path)}" target="_blank" class="attachment-name">${a.file_name}</a>
                            <span class="attachment-size">${StorageService.formatFileSize(a.file_size)}</span>
                        </div>
                        <button type="button" class="btn-icon attachment-delete" data-delete="${a.id}">&times;</button>
                    </div>
                `).join('') : '';
            } catch (error) {
                console.error('Failed to load attachments:', error);
            }
        };

        await loadAttachments();

        // Browse button click
        browseBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput?.click();
        });

        // File input change
        fileInput?.addEventListener('change', async (e) => {
            await this.handleFileUpload(e.target.files, projectId, 'general', loadAttachments);
            fileInput.value = '';
        });

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            await this.handleFileUpload(e.dataTransfer.files, projectId, 'general', loadAttachments);
        });

        // Delete attachment
        listContainer.addEventListener('click', async (e) => {
            const deleteId = e.target.dataset.delete;
            if (deleteId) {
                try {
                    await StorageService.deleteAttachment(deleteId);
                    await loadAttachments();
                    Toast.success('Attachment deleted');
                } catch (error) {
                    Toast.error('Failed to delete attachment');
                }
            }
        });
    },

    async handleFileUpload(files, projectId, attachmentType, refreshCallback) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            try {
                Toast.info(`Uploading ${file.name}...`);

                const { path, url } = await StorageService.uploadFile(file, `projects/${projectId}`);

                await StorageService.saveAttachment({
                    project_id: projectId,
                    file_name: file.name,
                    file_type: file.type,
                    file_size: file.size,
                    storage_path: path,
                    attachment_type: attachmentType
                });

                Toast.success(`${file.name} uploaded`);

                if (refreshCallback) await refreshCallback();
            } catch (error) {
                console.error('Upload failed:', error);
                Toast.error(`Failed to upload ${file.name}`);
            }
        }
    },

    formatShortDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    formatBatchDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    calculateBatchDays(startDate, endDate) {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    },

    setupBatchDatesInput(initialBatches) {
        let batches = [...initialBatches];

        const updateBatchDisplay = () => {
            const container = document.getElementById('batch-dates-list');
            const hidden = document.getElementById('batches-hidden');
            const totalEl = document.getElementById('batch-total-days');

            container.innerHTML = batches.map(batch => `
                <div class="batch-item" data-batch-id="${batch.id}">
                    <span class="batch-dates">${this.formatBatchDate(batch.start_date)} - ${this.formatBatchDate(batch.end_date)}</span>
                    <span class="batch-days">(${this.calculateBatchDays(batch.start_date, batch.end_date)} days)</span>
                    ${batch.notes ? `<span class="batch-notes">${batch.notes}</span>` : ''}
                    <button type="button" class="btn-icon batch-remove" data-remove-batch="${batch.id}">&times;</button>
                </div>
            `).join('');

            hidden.value = JSON.stringify(batches);

            // Update total
            const totalDays = batches.reduce((sum, b) => sum + this.calculateBatchDays(b.start_date, b.end_date), 0);
            totalEl.textContent = totalDays > 0 ? `Total: ${totalDays} days` : '';
        };

        // Add batch button
        document.getElementById('add-batch-btn')?.addEventListener('click', () => {
            const startDate = document.getElementById('batch-start-date').value;
            const endDate = document.getElementById('batch-end-date').value;
            const notes = document.getElementById('batch-notes').value.trim();

            if (!startDate || !endDate) {
                Toast.error('Please select both start and end dates');
                return;
            }

            if (new Date(endDate) < new Date(startDate)) {
                Toast.error('End date must be after start date');
                return;
            }

            batches.push({
                id: crypto.randomUUID(),
                start_date: startDate,
                end_date: endDate,
                notes: notes || null
            });

            updateBatchDisplay();

            // Clear inputs
            document.getElementById('batch-start-date').value = '';
            document.getElementById('batch-end-date').value = '';
            document.getElementById('batch-notes').value = '';
        });

        // Remove batch
        document.getElementById('batch-dates-list')?.addEventListener('click', (e) => {
            const batchToRemove = e.target.dataset.removeBatch;
            if (batchToRemove) {
                batches = batches.filter(b => b.id !== batchToRemove);
                updateBatchDisplay();
            }
        });

        // Initial display update
        updateBatchDisplay();
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

        // Get batches from hidden field
        const batches = JSON.parse(document.getElementById('batches-hidden')?.value || '[]');

        // Get dates from main form fields first, then fall back to calculating from batches
        let startDate = formData.get('start_date') || null;
        let endDate = formData.get('end_date') || null;

        // If no main dates but have batches, calculate from batches
        if (!startDate && !endDate && batches.length > 0) {
            startDate = batches.reduce((min, b) => !min || b.start_date < min ? b.start_date : min, null);
            endDate = batches.reduce((max, b) => !max || b.end_date > max ? b.end_date : max, null);
        }

        const data = {
            name: formData.get('name'),
            description: formData.get('description') || null,
            client_id: formData.get('client_id') || null,
            start_date: startDate,
            end_date: endDate,
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

                // Update batches - remove old ones that are no longer present
                const existingBatches = existingProject.batches || [];
                const newBatchIds = batches.map(b => b.id);
                for (const batch of existingBatches) {
                    if (!newBatchIds.includes(batch.id)) {
                        await ProjectService.removeBatch(batch.id);
                    }
                }

                // Add new batches (ones without matching existing IDs)
                const existingBatchIds = existingBatches.map(b => b.id);
                for (const batch of batches) {
                    if (!existingBatchIds.includes(batch.id)) {
                        await ProjectService.addBatch(projectId, {
                            start_date: batch.start_date,
                            end_date: batch.end_date,
                            notes: batch.notes
                        });
                    }
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
                } else if (!client) {
                    // Local mode - update state directly
                    const projects = StateManager.getState('projects') || [];
                    const index = projects.findIndex(p => p.id === projectId);
                    if (index !== -1) {
                        projects[index].assigned_talents = selectedTalents;
                        StateManager.setState('projects', [...projects]);
                    }
                }

                // Add batches to new project
                for (const batch of batches) {
                    await ProjectService.addBatch(projectId, {
                        start_date: batch.start_date,
                        end_date: batch.end_date,
                        notes: batch.notes
                    });
                }

                // Refresh to get all data
                await ProjectService.getAll();

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
