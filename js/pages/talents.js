/**
 * Talents List Page
 * Displays all talents with CRUD operations
 */

const TalentsPage = {
    render() {
        const container = document.getElementById('page-talents');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Talents</h1>
                <button class="btn btn-primary" id="add-talent-btn">+ Add Talent</button>
            </div>
            <div class="card">
                <div id="talents-list"></div>
            </div>
        `;
        
        // Show loading state if data is still loading
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showTableSkeleton('#talents-list', 5, 4);
        } else {
            this.renderTalentsList();
        }
        
        this.setupEventListeners();
        this.subscribeToState();
    },
    
    renderTalentsList() {
        const container = document.getElementById('talents-list');
        const talents = StateManager.getState('talents') || [];
        const areas = StateManager.getState('areas') || [];
        
        if (talents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3 class="empty-state-title">No talents yet</h3>
                    <p class="empty-state-text">Add your first talent to get started</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
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
                            <tr>
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
        `;
    },
    
    setupEventListeners() {
        document.getElementById('add-talent-btn').addEventListener('click', () => this.showTalentForm());
        
        document.getElementById('talents-list').addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            
            if (action === 'edit') {
                const talent = (StateManager.getState('talents') || []).find(t => t.id === id);
                if (talent) this.showTalentForm(talent);
            } else if (action === 'delete') {
                const confirmed = await Modal.confirm('Are you sure you want to delete this talent?');
                if (confirmed) {
                    try {
                        await TalentService.delete(id);
                        Toast.success('Talent deleted');
                    } catch (error) {
                        Toast.error('Failed to delete talent');
                    }
                }
            }
        });
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
                
                Toast.success('Talent updated');
            } else {
                const newTalent = await TalentService.create(data, { showToast: false });
                
                // Assign areas to new talent
                for (const areaId of selectedAreas) {
                    await TalentService.assignArea(newTalent.id, areaId, { showToast: false });
                }
                
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
