/**
 * Talent Detail Page
 * Displays complete talent profile with skills and areas
 */

const TalentDetailPage = {
    currentTalentId: null,
    
    render(talentId) {
        this.currentTalentId = talentId;
        const container = document.getElementById('page-talent-detail');
        const talent = (StateManager.getState('talents') || []).find(t => t.id === talentId);
        
        if (!talent) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3 class="empty-state-title">Talent not found</h3>
                    <a href="#/talents" class="btn btn-primary">Back to Talents</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${talent.name}</h1>
                <a href="#/talents" class="btn btn-secondary">Back to Talents</a>
            </div>
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Profile</h3>
                    </div>
                    <p><strong>Email:</strong> ${talent.email || '-'}</p>
                    <p><strong>Phone:</strong> ${talent.phone || '-'}</p>
                    <p><strong>Notes:</strong> ${talent.notes || '-'}</p>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Skills</h3>
                        <button class="btn btn-sm btn-primary" id="add-skill-btn">+ Add</button>
                    </div>
                    <div id="skills-list"></div>
                </div>
            </div>
            <div class="grid-2 mt-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Areas</h3>
                        <button class="btn btn-sm btn-primary" id="add-area-btn">+ Assign</button>
                    </div>
                    <div id="areas-list"></div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Assignment History</h3>
                    </div>
                    <div id="history-list"></div>
                </div>
            </div>
        `;
        
        this.renderSkills(talent);
        this.renderAreas(talent);
        this.renderHistory(talentId);
        this.setupEventListeners(talent);
    },
    
    renderSkills(talent) {
        const container = document.getElementById('skills-list');
        const skills = talent.skills || [];
        
        if (skills.length === 0) {
            container.innerHTML = '<p class="text-muted">No skills added</p>';
            return;
        }
        
        container.innerHTML = skills.map(skill => `
            <span class="status-badge in-progress">
                ${skill}
                <button class="toast-close" data-action="remove-skill" data-skill="${skill}">&times;</button>
            </span>
        `).join(' ');
    },
    
    renderAreas(talent) {
        const container = document.getElementById('areas-list');
        const allAreas = StateManager.getState('areas') || [];
        const talentAreas = allAreas.filter(a => (talent.areas || []).includes(a.id));
        
        if (talentAreas.length === 0) {
            container.innerHTML = '<p class="text-muted">No areas assigned</p>';
            return;
        }
        
        container.innerHTML = talentAreas.map(area => `
            <span class="status-badge completed">
                ${area.name}
                <button class="toast-close" data-action="remove-area" data-area="${area.id}">&times;</button>
            </span>
        `).join(' ');
    },
    
    renderHistory(talentId) {
        const container = document.getElementById('history-list');
        const allocations = StateManager.getState('allocations') || [];
        const projects = StateManager.getState('projects') || [];
        
        const history = allocations
            .filter(a => a.talent_id === talentId)
            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        
        if (history.length === 0) {
            container.innerHTML = '<p class="text-muted">No assignment history</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead><tr><th>Project</th><th>Period</th></tr></thead>
                <tbody>
                    ${history.map(a => {
                        const project = projects.find(p => p.id === a.project_id);
                        return `
                            <tr>
                                <td>${project?.name || 'Unknown'}</td>
                                <td>${a.start_date} - ${a.end_date}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },
    
    setupEventListeners(talent) {
        document.getElementById('add-skill-btn').addEventListener('click', () => {
            const skill = prompt('Enter skill name:');
            if (skill && skill.trim()) {
                TalentService.addSkill(talent.id, skill.trim())
                    .then(() => Toast.success('Skill added'))
                    .catch(() => Toast.error('Failed to add skill'));
            }
        });
        
        document.getElementById('add-area-btn').addEventListener('click', () => {
            const areas = StateManager.getState('areas') || [];
            const currentTalent = (StateManager.getState('talents') || []).find(t => t.id === talent.id);
            const availableAreas = areas.filter(a => !(currentTalent?.areas || []).includes(a.id));
            
            if (availableAreas.length === 0) {
                Toast.info('All areas already assigned');
                return;
            }
            
            Modal.form({
                title: 'Assign Area',
                fields: [{
                    name: 'area_id',
                    label: 'Area',
                    type: 'select',
                    required: true,
                    options: availableAreas.map(a => ({ value: a.id, label: a.name }))
                }],
                onSubmit: async (data) => {
                    await TalentService.assignArea(talent.id, data.area_id);
                    Toast.success('Area assigned');
                }
            });
        });
        
        document.getElementById('skills-list').addEventListener('click', async (e) => {
            if (e.target.dataset.action === 'remove-skill') {
                try {
                    await TalentService.removeSkill(talent.id, e.target.dataset.skill);
                    Toast.success('Skill removed');
                } catch (error) {
                    Toast.error('Failed to remove skill');
                }
            }
        });
        
        document.getElementById('areas-list').addEventListener('click', async (e) => {
            if (e.target.dataset.action === 'remove-area') {
                try {
                    await TalentService.removeArea(talent.id, e.target.dataset.area);
                    Toast.success('Area removed');
                } catch (error) {
                    Toast.error('Failed to remove area');
                }
            }
        });
        
        // Subscribe to state changes to update the page
        this.subscribeToState();
    },
    
    subscribeToState() {
        StateManager.subscribe('talents', () => {
            if (this.currentTalentId) {
                const talent = (StateManager.getState('talents') || []).find(t => t.id === this.currentTalentId);
                if (talent) {
                    this.renderSkills(talent);
                    this.renderAreas(talent);
                }
            }
        });
        
        StateManager.subscribe('allocations', () => {
            if (this.currentTalentId) {
                this.renderHistory(this.currentTalentId);
            }
        });
    }
};
