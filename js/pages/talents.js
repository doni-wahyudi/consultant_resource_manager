/**
 * Talents List Page
 * Displays all talents with CRUD operations
 */

const TalentsPage = {
    searchQuery: '',
    filterArea: '',
    filterSkill: '',
    selectedTalents: new Set(),
    
    render() {
        const container = document.getElementById('page-talents');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Talents</h1>
                <div class="page-actions">
                    <button class="btn btn-secondary" id="bulk-actions-btn" style="display:none;">Bulk Actions</button>
                    <button class="btn btn-primary" id="add-talent-btn">+ Add Talent</button>
                </div>
            </div>
            <div class="card">
                <div class="filter-bar">
                    <input type="text" class="form-input" id="talent-search" placeholder="Search by name, email, or skill..." style="flex:2;">
                    <select class="form-select" id="talent-filter-area">
                        <option value="">All Areas</option>
                    </select>
                    <select class="form-select" id="talent-filter-skill">
                        <option value="">All Skills</option>
                    </select>
                    <button class="btn btn-secondary btn-sm" id="clear-filters-btn">Clear</button>
                </div>
                <div id="talents-list"></div>
            </div>
        `;
        
        this.populateFilters();
        
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showTableSkeleton('#talents-list', 5, 4);
        } else {
            this.renderTalentsList();
        }
        
        this.setupEventListeners();
        this.subscribeToState();
    },
    
    populateFilters() {
        const areas = StateManager.getState('areas') || [];
        const talents = StateManager.getState('talents') || [];
        
        // Populate area filter
        const areaSelect = document.getElementById('talent-filter-area');
        if (areaSelect) {
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id;
                option.textContent = area.name;
                areaSelect.appendChild(option);
            });
        }
        
        // Populate skill filter with unique skills
        const allSkills = new Set();
        talents.forEach(t => (t.skills || []).forEach(s => allSkills.add(s)));
        const skillSelect = document.getElementById('talent-filter-skill');
        if (skillSelect) {
            Array.from(allSkills).sort().forEach(skill => {
                const option = document.createElement('option');
                option.value = skill;
                option.textContent = skill;
                skillSelect.appendChild(option);
            });
        }
    },
    
    getFilteredTalents() {
        const talents = StateManager.getState('talents') || [];
        const areas = StateManager.getState('areas') || [];
        
        return talents.filter(talent => {
            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const nameMatch = talent.name?.toLowerCase().includes(query);
                const emailMatch = talent.email?.toLowerCase().includes(query);
                const skillMatch = (talent.skills || []).some(s => s.toLowerCase().includes(query));
                const locationMatch = talent.homebase_location?.toLowerCase().includes(query);
                if (!nameMatch && !emailMatch && !skillMatch && !locationMatch) return false;
            }
            
            // Area filter
            if (this.filterArea && !(talent.areas || []).includes(this.filterArea)) {
                return false;
            }
            
            // Skill filter
            if (this.filterSkill && !(talent.skills || []).includes(this.filterSkill)) {
                return false;
            }
            
            return true;
        });
    },
    
    renderTalentsList() {
        const container = document.getElementById('talents-list');
        const talents = this.getFilteredTalents();
        const areas = StateManager.getState('areas') || [];
        const allTalents = StateManager.getState('talents') || [];
        
        // Update bulk actions button visibility
        const bulkBtn = document.getElementById('bulk-actions-btn');
        if (bulkBtn) {
            bulkBtn.style.display = this.selectedTalents.size > 0 ? 'inline-flex' : 'none';
            bulkBtn.textContent = `Bulk Actions (${this.selectedTalents.size})`;
        }
        
        if (allTalents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3 class="empty-state-title">No talents yet</h3>
                    <p class="empty-state-text">Add your first talent to get started</p>
                </div>
            `;
            return;
        }
        
        if (talents.length === 0) {
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
                        <th style="width:40px;"><input type="checkbox" id="select-all-talents" ${this.selectedTalents.size === talents.length && talents.length > 0 ? 'checked' : ''}></th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Location</th>
                        <th>Skills</th>
                        <th>Business Areas</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${talents.map(talent => {
                        const talentAreas = (talent.areas || [])
                            .map(areaId => areas.find(a => a.id === areaId)?.name)
                            .filter(Boolean);
                        return `
                            <tr class="${this.selectedTalents.has(talent.id) ? 'row-selected' : ''}">
                                <td><input type="checkbox" class="talent-checkbox" data-id="${talent.id}" ${this.selectedTalents.has(talent.id) ? 'checked' : ''}></td>
                                <td>
                                    <a href="#/talent/${talent.id}" class="talent-link">${talent.name}</a>
                                </td>
                                <td>${talent.email || '-'}</td>
                                <td>${talent.homebase_location || '-'}</td>
                                <td>${(talent.skills || []).slice(0, 3).join(', ')}${talent.skills?.length > 3 ? '...' : ''}</td>
                                <td>${talentAreas.slice(0, 2).join(', ')}${talentAreas.length > 2 ? '...' : ''}</td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${talent.id}">Edit</button>
                                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${talent.id}">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="table-footer">
                <span class="text-muted">Showing ${talents.length} of ${allTalents.length} talents</span>
            </div>
        `;
    },
    
    setupEventListeners() {
        document.getElementById('add-talent-btn').addEventListener('click', async () => {
            if (await EditGuard.canEdit()) {
                this.showTalentForm();
            }
        });
        
        // Search and filter listeners
        document.getElementById('talent-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderTalentsList();
        });
        
        document.getElementById('talent-filter-area')?.addEventListener('change', (e) => {
            this.filterArea = e.target.value;
            this.renderTalentsList();
        });
        
        document.getElementById('talent-filter-skill')?.addEventListener('change', (e) => {
            this.filterSkill = e.target.value;
            this.renderTalentsList();
        });
        
        document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
            this.searchQuery = '';
            this.filterArea = '';
            this.filterSkill = '';
            document.getElementById('talent-search').value = '';
            document.getElementById('talent-filter-area').value = '';
            document.getElementById('talent-filter-skill').value = '';
            this.renderTalentsList();
        });
        
        // Bulk actions
        document.getElementById('bulk-actions-btn')?.addEventListener('click', async () => {
            if (await EditGuard.canEdit()) {
                this.showBulkActionsMenu();
            }
        });
        
        document.getElementById('talents-list').addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            
            if (action === 'edit') {
                if (await EditGuard.canEdit()) {
                    const talent = (StateManager.getState('talents') || []).find(t => t.id === id);
                    if (talent) this.showTalentForm(talent);
                }
            } else if (action === 'delete') {
                if (await EditGuard.canEdit()) {
                    const talent = (StateManager.getState('talents') || []).find(t => t.id === id);
                    const confirmed = await Modal.confirm('Are you sure you want to delete this talent?');
                    if (confirmed) {
                        try {
                            await TalentService.delete(id);
                            await ActivityLogService.log('deleted', 'talent', id, talent?.name);
                            Toast.success('Talent deleted');
                        } catch (error) {
                            Toast.error('Failed to delete talent');
                        }
                    }
                }
            }
        });
        
        // Checkbox selection
        document.getElementById('talents-list').addEventListener('change', (e) => {
            if (e.target.id === 'select-all-talents') {
                const talents = this.getFilteredTalents();
                if (e.target.checked) {
                    talents.forEach(t => this.selectedTalents.add(t.id));
                } else {
                    this.selectedTalents.clear();
                }
                this.renderTalentsList();
            } else if (e.target.classList.contains('talent-checkbox')) {
                const id = e.target.dataset.id;
                if (e.target.checked) {
                    this.selectedTalents.add(id);
                } else {
                    this.selectedTalents.delete(id);
                }
                this.renderTalentsList();
            }
        });
    },
    
    async showBulkActionsMenu() {
        const count = this.selectedTalents.size;
        const action = await new Promise(resolve => {
            Modal.show({
                title: `Bulk Actions (${count} selected)`,
                content: `
                    <div class="bulk-actions-list">
                        <button class="btn btn-secondary btn-block" data-bulk="assign-area">Assign to Business Area</button>
                        <button class="btn btn-secondary btn-block" data-bulk="remove-area">Remove from Business Area</button>
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
            const confirmed = await Modal.confirm(`Delete ${count} talents? This cannot be undone.`);
            if (confirmed) {
                try {
                    for (const id of this.selectedTalents) {
                        await TalentService.delete(id);
                    }
                    this.selectedTalents.clear();
                    Toast.success(`${count} talents deleted`);
                } catch (error) {
                    Toast.error('Failed to delete some talents');
                }
            }
        } else if (action === 'assign-area' || action === 'remove-area') {
            const areas = StateManager.getState('areas') || [];
            if (areas.length === 0) {
                Toast.warning('No business areas defined');
                return;
            }
            
            const areaId = await new Promise(resolve => {
                Modal.show({
                    title: action === 'assign-area' ? 'Assign to Area' : 'Remove from Area',
                    content: `
                        <div class="form-group">
                            <label class="form-label">Select Business Area</label>
                            <select class="form-select" id="bulk-area-select">
                                <option value="">Choose area...</option>
                                ${areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                            </select>
                        </div>
                    `,
                    footer: `
                        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                        <button class="btn btn-primary" data-action="confirm">Apply</button>
                    `
                });
                
                document.querySelector('.modal-footer').addEventListener('click', (e) => {
                    if (e.target.dataset.action === 'cancel') {
                        Modal.hide();
                        resolve(null);
                    } else if (e.target.dataset.action === 'confirm') {
                        const selected = document.getElementById('bulk-area-select').value;
                        Modal.hide();
                        resolve(selected);
                    }
                });
            });
            
            if (areaId) {
                try {
                    for (const talentId of this.selectedTalents) {
                        if (action === 'assign-area') {
                            await TalentService.assignArea(talentId, areaId, { showToast: false });
                        } else {
                            await TalentService.removeArea(talentId, areaId, { showToast: false });
                        }
                    }
                    this.selectedTalents.clear();
                    Toast.success(`Updated ${count} talents`);
                } catch (error) {
                    Toast.error('Failed to update some talents');
                }
            }
        }
    },
    
    showTalentForm(talent = null) {
        const areas = StateManager.getState('areas') || [];
        const currentSkills = talent?.skills || [];
        const currentAreas = talent?.areas || [];
        
        // Create custom modal content with skills and areas management
        const content = `
            <form id="talent-form" class="modal-form">
                <div class="form-group">
                    <label class="form-label">Name <span class="required">*</span></label>
                    <input type="text" name="name" class="form-input" value="${talent?.name || ''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input" value="${talent?.email || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone</label>
                        <input type="text" name="phone" class="form-input" value="${talent?.phone || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Homebase Location</label>
                    <input type="text" name="homebase_location" class="form-input" value="${talent?.homebase_location || ''}" placeholder="e.g., New York, NY">
                </div>
                <div class="form-group">
                    <label class="form-label">Skills</label>
                    <div class="skills-input-container">
                        <div class="tag-list" id="skills-tags">
                            ${currentSkills.map(skill => `
                                <span class="tag" data-skill="${skill}">
                                    ${skill}
                                    <span class="tag-remove" data-remove-skill="${skill}">&times;</span>
                                </span>
                            `).join('')}
                        </div>
                        <div class="form-inline mt-4">
                            <input type="text" id="new-skill-input" class="form-input" placeholder="Add a skill...">
                            <button type="button" class="btn btn-secondary btn-sm" id="add-skill-btn">Add</button>
                        </div>
                    </div>
                    <input type="hidden" name="skills" id="skills-hidden" value='${JSON.stringify(currentSkills)}'>
                </div>
                <div class="form-group">
                    <label class="form-label">Business Areas</label>
                    <div class="checkbox-group" id="areas-checkboxes">
                        ${areas.map(area => `
                            <label class="checkbox-label">
                                <input type="checkbox" name="areas" value="${area.id}" 
                                    ${currentAreas.includes(area.id) ? 'checked' : ''}>
                                ${area.name}
                            </label>
                        `).join('')}
                        ${areas.length === 0 ? '<p class="text-muted">No business areas defined. Add them in Settings.</p>' : ''}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-textarea">${talent?.notes || ''}</textarea>
                </div>
            </form>
        `;
        
        Modal.show({
            title: talent ? 'Edit Talent' : 'Add Talent',
            content: content,
            size: 'lg',
            footer: `
                <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                <button type="button" class="btn btn-primary" data-action="save">Save</button>
            `
        });
        
        // Set up skills management
        this.setupSkillsInput(currentSkills);
        
        // Set up form submission
        const footer = document.querySelector('.modal-footer');
        footer.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            if (action === 'cancel') {
                Modal.hide();
            } else if (action === 'save') {
                await this.handleTalentFormSubmit(talent);
            }
        });
    },
    
    setupSkillsInput(initialSkills) {
        let skills = [...initialSkills];
        
        const updateSkillsDisplay = () => {
            const container = document.getElementById('skills-tags');
            const hidden = document.getElementById('skills-hidden');
            
            container.innerHTML = skills.map(skill => `
                <span class="tag" data-skill="${skill}">
                    ${skill}
                    <span class="tag-remove" data-remove-skill="${skill}">&times;</span>
                </span>
            `).join('');
            
            hidden.value = JSON.stringify(skills);
        };
        
        // Add skill button
        document.getElementById('add-skill-btn')?.addEventListener('click', () => {
            const input = document.getElementById('new-skill-input');
            const skill = input.value.trim();
            if (skill && !skills.includes(skill)) {
                skills.push(skill);
                updateSkillsDisplay();
                input.value = '';
            }
        });
        
        // Add skill on Enter
        document.getElementById('new-skill-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('add-skill-btn')?.click();
            }
        });
        
        // Remove skill
        document.getElementById('skills-tags')?.addEventListener('click', (e) => {
            const skillToRemove = e.target.dataset.removeSkill;
            if (skillToRemove) {
                skills = skills.filter(s => s !== skillToRemove);
                updateSkillsDisplay();
            }
        });
    },
    
    async handleTalentFormSubmit(existingTalent) {
        const form = document.getElementById('talent-form');
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name'),
            email: formData.get('email') || null,
            phone: formData.get('phone') || null,
            homebase_location: formData.get('homebase_location') || null,
            notes: formData.get('notes') || null,
            skills: JSON.parse(document.getElementById('skills-hidden').value || '[]')
        };
        
        // Get selected areas
        const selectedAreas = Array.from(document.querySelectorAll('input[name="areas"]:checked'))
            .map(cb => cb.value);
        
        if (!data.name) {
            Toast.error('Name is required');
            return;
        }
        
        try {
            if (existingTalent) {
                await TalentService.update(existingTalent.id, data, { showToast: false });
                
                // Update areas
                const currentAreas = existingTalent.areas || [];
                const areasToAdd = selectedAreas.filter(a => !currentAreas.includes(a));
                const areasToRemove = currentAreas.filter(a => !selectedAreas.includes(a));
                
                for (const areaId of areasToAdd) {
                    await TalentService.assignArea(existingTalent.id, areaId, { showToast: false });
                }
                for (const areaId of areasToRemove) {
                    await TalentService.removeArea(existingTalent.id, areaId, { showToast: false });
                }
                
                await ActivityLogService.log('updated', 'talent', existingTalent.id, data.name);
                Toast.success('Talent updated');
            } else {
                const newTalent = await TalentService.create(data, { showToast: false });
                
                // Assign areas to new talent
                for (const areaId of selectedAreas) {
                    await TalentService.assignArea(newTalent.id, areaId, { showToast: false });
                }
                
                await ActivityLogService.log('created', 'talent', newTalent.id, data.name);
                Toast.success('Talent created');
            }
            
            Modal.hide();
        } catch (error) {
            Toast.error('Failed to save talent');
        }
    },
    
    subscribeToState() {
        StateManager.subscribe('talents', () => this.renderTalentsList());
        StateManager.subscribe('areas', () => this.renderTalentsList());
    }
};
