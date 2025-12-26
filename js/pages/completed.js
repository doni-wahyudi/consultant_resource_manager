/**
 * Completed Projects Page
 * Displays completed projects with payment tracking
 */

const CompletedPage = {
    render() {
        const container = document.getElementById('page-completed');

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Completed Projects</h1>
                <select id="payment-filter" class="form-select">
                    <option value="">All</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid" selected>Unpaid</option>
                </select>
            </div>
            <div class="card">
                <div id="completed-list"></div>
            </div>
        `;

        // Show loading state if data is still loading
        const isLoading = StateManager.getState('ui.loading');
        if (isLoading) {
            LoadingUI.showTableSkeleton('#completed-list', 5, 3);
        } else {
            this.renderCompletedList();
        }

        this.setupEventListeners();
        this.subscribeToState();
    },

    renderCompletedList() {
        const container = document.getElementById('completed-list');
        const projects = StateManager.getState('projects') || [];
        const talents = StateManager.getState('talents') || [];
        const filter = document.getElementById('payment-filter')?.value;

        let completed = projects.filter(p => p.status === 'completed');

        if (filter === 'paid') completed = completed.filter(p => p.is_paid);
        else if (filter === 'unpaid') completed = completed.filter(p => !p.is_paid);

        if (completed.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <h3 class="empty-state-title">No completed projects</h3>
                </div>
            `;
            return;
        }

        const clients = StateManager.getState('clients') || [];

        container.innerHTML = `
            <table class="data-table">
                <thead><tr><th>Name</th><th>Client</th><th>Dates</th><th>Total Days</th><th>Talents</th><th>Attachment</th><th>Payment Details</th><th>Actions</th></tr></thead>
                <tbody>
                    ${completed.map(p => {
            const client = clients.find(c => c.id === p.client_id);
            const assignedTalents = (p.assigned_talents || [])
                .map(tid => talents.find(t => t.id === tid)?.name)
                .filter(Boolean);
            const talentDisplay = assignedTalents.length > 0
                ? assignedTalents.join(', ')
                : '-';
            const hasReimbursement = p.reimbursement_amount && p.reimbursement_amount > 0;
            const totalDays = this.calculateProjectTotalDays(p);
            const attachmentCount = (p.attachments || []).length;
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
                                    <span class="project-color-dot" style="background-color: ${p.color}"></span>
                                    ${p.name}
                                </td>
                                <td>${client?.name || '-'}</td>
                                <td class="date-cell">${dateDisplay}</td>
                                <td>${totalDays !== null ? totalDays + ' days' : '-'}</td>
                                <td>${talentDisplay}</td>
                                <td>
                                    ${attachmentCount > 0
                    ? `<span class="attachment-badge" data-action="edit" data-id="${p.id}" title="View attachments">📎 ${attachmentCount}</span>`
                    : ''}
                                    <button class="btn-icon-sm" data-action="edit" data-id="${p.id}" title="Add attachment">+</button>
                                </td>
                                <td class="payment-details-cell">
                                    <div class="payment-main">
                                        <span class="payment-label">Project:</span>
                                        <span class="status-badge ${p.is_paid ? 'paid' : 'unpaid'}">${p.is_paid ? 'Paid' : 'Unpaid'}</span>
                                    </div>
                                    <div class="payment-sub">
                                        <span class="payment-label">Reimbursement:</span>
                                        ${hasReimbursement
                    ? `<span class="reimbursement-amount">${this.formatCurrency(p.reimbursement_amount)}</span>`
                    : ''
                }
                                        <span class="status-badge sm ${p.reimbursement_paid ? 'paid' : 'unpaid'}">${p.reimbursement_paid ? 'Paid' : 'Unpaid'}</span>
                                    </div>
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${p.id}">Edit</button>
                                    <button class="btn btn-sm btn-primary" data-action="payment" data-id="${p.id}">Payment</button>
                                    <button class="btn btn-sm btn-warning" data-action="reactivate" data-id="${p.id}">Reactivate</button>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Format currency for display
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    },

    formatShortDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    /**
     * Calculate total days between start and end date
     */
    calculateTotalDays(startDate, endDate) {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    },

    /**
     * Calculate total days for a project, using batches if available
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

    setupEventListeners() {
        document.getElementById('payment-filter').addEventListener('change', () => this.renderCompletedList());

        document.getElementById('completed-list').addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;

            if (!action || !id) return;

            const project = (StateManager.getState('projects') || []).find(p => p.id === id);
            if (!project) return;

            if (action === 'edit') {
                this.showEditForm(project);
            } else if (action === 'payment') {
                this.showPaymentModal(project);
            } else if (action === 'reactivate') {
                this.showReactivateModal(project);
            }
        });
    },

    /**
     * Show payment details modal with project payment and reimbursement
     */
    showPaymentModal(project) {
        const hasReimbursement = project.reimbursement_amount && project.reimbursement_amount > 0;

        Modal.show({
            title: `Payment Details - ${project.name}`,
            content: `
                <div class="payment-modal-content">
                    <div class="payment-section">
                        <h4 class="payment-section-title">💰 Project Payment</h4>
                        <div class="payment-status-row">
                            <span class="status-badge lg ${project.is_paid ? 'paid' : 'unpaid'}">
                                ${project.is_paid ? '✓ Paid' : '○ Unpaid'}
                            </span>
                            <button class="btn btn-sm ${project.is_paid ? 'btn-secondary' : 'btn-primary'}" id="toggle-project-payment">
                                ${project.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                            </button>
                        </div>
                    </div>
                    
                    <div class="payment-section">
                        <h4 class="payment-section-title">🧾 Reimbursement</h4>
                        <div class="form-group">
                            <label class="form-label">Amount</label>
                            <input type="number" id="reimbursement-amount" class="form-input" 
                                value="${project.reimbursement_amount || 0}" 
                                placeholder="0" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Notes</label>
                            <textarea id="reimbursement-notes" class="form-textarea" 
                                placeholder="Transportation, meals, materials, etc.">${project.reimbursement_notes || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Invoice / Receipt</label>
                            <div class="file-upload-container compact">
                                <div id="invoice-attachments-list" class="attachments-list"></div>
                                <div class="file-dropzone compact" id="invoice-file-dropzone">
                                    <input type="file" id="invoice-file-input" accept="image/*,.pdf,.zip,.rar" style="display:none;">
                                    <div class="dropzone-content">
                                        <span class="dropzone-icon">📄</span>
                                        <span class="dropzone-text">Drop invoice or <button type="button" class="btn-link" id="invoice-file-browse">browse</button></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="payment-status-row">
                            <span class="status-badge lg ${project.reimbursement_paid ? 'paid' : 'unpaid'}" id="reimbursement-status-badge">
                                ${project.reimbursement_paid ? '✓ Paid' : '○ Unpaid'}
                            </span>
                            <button class="btn btn-sm ${project.reimbursement_paid ? 'btn-secondary' : 'btn-primary'}" id="toggle-reimbursement-payment">
                                ${project.reimbursement_paid ? 'Mark Unpaid' : 'Mark Paid'}
                            </button>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" id="payment-cancel-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="payment-save-btn">Save Changes</button>
            `,
            size: 'md'
        });

        // Track current state
        let isPaid = project.is_paid;
        let reimbursementPaid = project.reimbursement_paid || false;

        // Toggle project payment
        document.getElementById('toggle-project-payment')?.addEventListener('click', (e) => {
            isPaid = !isPaid;
            e.target.textContent = isPaid ? 'Mark Unpaid' : 'Mark Paid';
            e.target.className = `btn btn-sm ${isPaid ? 'btn-secondary' : 'btn-primary'}`;
            const badge = e.target.previousElementSibling;
            badge.className = `status-badge lg ${isPaid ? 'paid' : 'unpaid'}`;
            badge.textContent = isPaid ? '✓ Paid' : '○ Unpaid';
        });

        // Toggle reimbursement payment
        document.getElementById('toggle-reimbursement-payment')?.addEventListener('click', (e) => {
            reimbursementPaid = !reimbursementPaid;
            e.target.textContent = reimbursementPaid ? 'Mark Unpaid' : 'Mark Paid';
            e.target.className = `btn btn-sm ${reimbursementPaid ? 'btn-secondary' : 'btn-primary'}`;
            const badge = document.getElementById('reimbursement-status-badge');
            badge.className = `status-badge lg ${reimbursementPaid ? 'paid' : 'unpaid'}`;
            badge.textContent = reimbursementPaid ? '✓ Paid' : '○ Unpaid';
        });

        // Set up invoice file upload
        this.setupInvoiceUpload(project.id);

        // Cancel
        document.getElementById('payment-cancel-btn')?.addEventListener('click', () => Modal.hide());

        // Save
        document.getElementById('payment-save-btn')?.addEventListener('click', async () => {
            const reimbursementAmount = parseFloat(document.getElementById('reimbursement-amount')?.value) || 0;
            const reimbursementNotes = document.getElementById('reimbursement-notes')?.value || '';

            Modal.hide();

            try {
                await ProjectService.update(project.id, {
                    is_paid: isPaid,
                    reimbursement_amount: reimbursementAmount,
                    reimbursement_paid: reimbursementPaid,
                    reimbursement_notes: reimbursementNotes
                }, { showToast: false });

                Toast.success('Payment details updated');
            } catch (error) {
                console.error('Failed to update payment:', error);
                Toast.error('Failed to update payment details');
            }
        });
    },

    /**
     * Show edit form for completed project
     */
    showEditForm(project) {
        const clients = StateManager.getState('clients') || [];
        const talents = StateManager.getState('talents') || [];
        const currentSkills = project?.required_skills || [];
        const currentTalents = project?.assigned_talents || [];

        const content = `
            <form id="completed-project-form" class="modal-form">
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
                    <label class="form-label">Date Batches</label>
                    <p class="form-hint">Add one or more date ranges for this project</p>
                    <div class="batch-dates-container">
                        <div id="completed-batch-dates-list" class="batch-list">
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
                                    <input type="date" id="completed-batch-start-date" class="form-input" placeholder="Start">
                                </div>
                                <div class="form-group">
                                    <input type="date" id="completed-batch-end-date" class="form-input" placeholder="End">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="flex:1;">
                                    <input type="text" id="completed-batch-notes" class="form-input" placeholder="Notes (optional)">
                                </div>
                                <button type="button" class="btn btn-secondary btn-sm" id="completed-add-batch-btn">+ Add Batch</button>
                            </div>
                        </div>
                        <div id="completed-batch-total-days" class="batch-total"></div>
                    </div>
                    <input type="hidden" id="completed-batches-hidden" value='${JSON.stringify(project?.batches || [])}'>
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
                    <div class="skills-input-container">
                        <div class="tag-list" id="completed-skills-tags">
                            ${currentSkills.map(skill => `
                                <span class="tag" data-skill="${skill}">
                                    ${skill}
                                    <span class="tag-remove" data-remove-skill="${skill}">&times;</span>
                                </span>
                            `).join('')}
                        </div>
                        <div class="form-inline mt-4">
                            <input type="text" id="completed-skill-input" class="form-input" placeholder="Add required skill...">
                            <button type="button" class="btn btn-secondary btn-sm" id="completed-add-skill-btn">Add</button>
                        </div>
                    </div>
                    <input type="hidden" name="required_skills" id="completed-skills-hidden" value='${JSON.stringify(currentSkills)}'>
                </div>
                <div class="form-group">
                    <label class="form-label">Assigned Talents</label>
                    <div class="talent-selection-list" id="completed-talent-checkboxes">
                        ${talents.length > 0 ? talents.map(t => `
                            <label class="checkbox-label talent-checkbox">
                                <input type="checkbox" name="talents" value="${t.id}" 
                                    ${currentTalents.includes(t.id) ? 'checked' : ''}>
                                <span class="talent-checkbox-info">
                                    <span class="talent-checkbox-name">${t.name}</span>
                                    <span class="talent-checkbox-skills">${(t.skills || []).slice(0, 3).join(', ') || 'No skills'}</span>
                                </span>
                            </label>
                        `).join('') : '<p class="text-muted">No talents available.</p>'}
                    </div>
                </div>
            </form>
        `;

        Modal.show({
            title: 'Edit Completed Project',
            content: content,
            size: 'lg',
            footer: `
                <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                <button type="button" class="btn btn-primary" data-action="save">Save Changes</button>
            `
        });

        // Set up skills management
        this.setupSkillsInput(currentSkills);

        // Set up batch dates management
        this.setupCompletedBatchDatesInput(project?.batches || []);

        // Set up form submission
        const saveBtn = document.querySelector('.modal-footer [data-action="save"]');
        const cancelBtn = document.querySelector('.modal-footer [data-action="cancel"]');

        let isSubmitting = false;

        cancelBtn?.addEventListener('click', () => Modal.hide());

        saveBtn?.addEventListener('click', async () => {
            if (isSubmitting) return;
            isSubmitting = true;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            await this.handleEditSubmit(project);
        });
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

    setupCompletedBatchDatesInput(initialBatches) {
        let batches = [...initialBatches];

        const updateBatchDisplay = () => {
            const container = document.getElementById('completed-batch-dates-list');
            const hidden = document.getElementById('completed-batches-hidden');
            const totalEl = document.getElementById('completed-batch-total-days');

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
        document.getElementById('completed-add-batch-btn')?.addEventListener('click', () => {
            const startDate = document.getElementById('completed-batch-start-date').value;
            const endDate = document.getElementById('completed-batch-end-date').value;
            const notes = document.getElementById('completed-batch-notes').value.trim();

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
            document.getElementById('completed-batch-start-date').value = '';
            document.getElementById('completed-batch-end-date').value = '';
            document.getElementById('completed-batch-notes').value = '';
        });

        // Remove batch
        document.getElementById('completed-batch-dates-list')?.addEventListener('click', (e) => {
            const batchToRemove = e.target.dataset.removeBatch;
            if (batchToRemove) {
                batches = batches.filter(b => b.id !== batchToRemove);
                updateBatchDisplay();
            }
        });

        // Initial display update
        updateBatchDisplay();
    },

    async setupInvoiceUpload(projectId) {
        const listContainer = document.getElementById('invoice-attachments-list');
        const dropzone = document.getElementById('invoice-file-dropzone');
        const fileInput = document.getElementById('invoice-file-input');
        const browseBtn = document.getElementById('invoice-file-browse');

        if (!listContainer || !dropzone) return;

        // Load existing invoice attachments
        const loadAttachments = async () => {
            try {
                const attachments = await StorageService.getAttachments(projectId, 'reimbursement');
                listContainer.innerHTML = attachments.length > 0 ? attachments.map(a => `
                    <div class="attachment-item compact" data-id="${a.id}">
                        <span class="attachment-icon">${StorageService.getFileIcon(a.file_type)}</span>
                        <div class="attachment-info">
                            <a href="${StorageService.getPublicUrl(a.storage_path)}" target="_blank" class="attachment-name">${a.file_name}</a>
                            <span class="attachment-size">${StorageService.formatFileSize(a.file_size)}</span>
                        </div>
                        <button type="button" class="btn-icon attachment-delete" data-delete="${a.id}">&times;</button>
                    </div>
                `).join('') : '';
            } catch (error) {
                console.error('Failed to load invoice attachments:', error);
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
            await this.handleInvoiceUpload(e.target.files, projectId, loadAttachments);
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
            await this.handleInvoiceUpload(e.dataTransfer.files, projectId, loadAttachments);
        });

        // Delete attachment
        listContainer.addEventListener('click', async (e) => {
            const deleteId = e.target.dataset.delete;
            if (deleteId) {
                try {
                    await StorageService.deleteAttachment(deleteId);
                    await loadAttachments();
                    Toast.success('Invoice deleted');
                } catch (error) {
                    Toast.error('Failed to delete invoice');
                }
            }
        });
    },

    async handleInvoiceUpload(files, projectId, refreshCallback) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            try {
                Toast.info(`Uploading ${file.name}...`);

                const { path, url } = await StorageService.uploadFile(file, `reimbursements/${projectId}`);

                await StorageService.saveAttachment({
                    project_id: projectId,
                    file_name: file.name,
                    file_type: file.type,
                    file_size: file.size,
                    storage_path: path,
                    attachment_type: 'reimbursement'
                });

                Toast.success(`${file.name} uploaded`);

                if (refreshCallback) await refreshCallback();
            } catch (error) {
                console.error('Invoice upload failed:', error);
                Toast.error(`Failed to upload ${file.name}`);
            }
        }
    },

    /**
     * Set up skills input for edit form
     */
    setupSkillsInput(initialSkills) {
        let skills = [...initialSkills];

        const updateSkillsDisplay = () => {
            const container = document.getElementById('completed-skills-tags');
            const hidden = document.getElementById('completed-skills-hidden');

            container.innerHTML = skills.map(skill => `
                <span class="tag" data-skill="${skill}">
                    ${skill}
                    <span class="tag-remove" data-remove-skill="${skill}">&times;</span>
                </span>
            `).join('');

            hidden.value = JSON.stringify(skills);
        };

        document.getElementById('completed-add-skill-btn')?.addEventListener('click', () => {
            const input = document.getElementById('completed-skill-input');
            const skill = input.value.trim();
            if (skill && !skills.includes(skill)) {
                skills.push(skill);
                updateSkillsDisplay();
                input.value = '';
            }
        });

        document.getElementById('completed-skill-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('completed-add-skill-btn')?.click();
            }
        });

        document.getElementById('completed-skills-tags')?.addEventListener('click', (e) => {
            const skillToRemove = e.target.dataset.removeSkill;
            if (skillToRemove) {
                skills = skills.filter(s => s !== skillToRemove);
                updateSkillsDisplay();
            }
        });
    },

    /**
     * Handle edit form submission
     */
    async handleEditSubmit(existingProject) {
        const form = document.getElementById('completed-project-form');
        if (!form) return;

        const formData = new FormData(form);

        // Get batches from hidden field
        const batches = JSON.parse(document.getElementById('completed-batches-hidden')?.value || '[]');

        // Calculate overall start/end date from batches for backward compatibility
        let startDate = null;
        let endDate = null;
        if (batches.length > 0) {
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
            required_skills: JSON.parse(document.getElementById('completed-skills-hidden')?.value || '[]')
        };

        const selectedTalents = Array.from(document.querySelectorAll('#completed-talent-checkboxes input[name="talents"]:checked'))
            .map(cb => cb.value);

        if (!data.name) {
            Toast.error('Project name is required');
            return;
        }

        Modal.hide();

        try {
            await ProjectService.update(existingProject.id, data, { showToast: false });

            // Update talent assignments
            const currentTalents = existingProject.assigned_talents || [];
            const talentsToAdd = selectedTalents.filter(t => !currentTalents.includes(t));
            const talentsToRemove = currentTalents.filter(t => !selectedTalents.includes(t));

            for (const talentId of talentsToAdd) {
                await ProjectService.assignTalent(existingProject.id, talentId);
            }
            for (const talentId of talentsToRemove) {
                await ProjectService.removeTalent(existingProject.id, talentId);
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
                    await ProjectService.addBatch(existingProject.id, {
                        start_date: batch.start_date,
                        end_date: batch.end_date,
                        notes: batch.notes
                    });
                }
            }

            Toast.success('Project updated');
        } catch (error) {
            console.error('Failed to update project:', error);
            Toast.error('Failed to update project');
        }
    },

    /**
     * Show reactivate modal to change status back to active
     */
    showReactivateModal(project) {
        Modal.show({
            title: 'Reactivate Project',
            content: `
                <div class="reactivate-form">
                    <p>Change <strong>${project.name}</strong> back to an active status:</p>
                    <div class="form-group mt-16">
                        <label class="form-label">New Status</label>
                        <select id="reactivate-status" class="form-select">
                            <option value="in_progress">🔵 In Progress</option>
                            <option value="upcoming">🟣 Upcoming</option>
                        </select>
                    </div>
                </div>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" id="reactivate-cancel-btn">Cancel</button>
                <button type="button" class="btn btn-primary" id="reactivate-confirm-btn">Reactivate</button>
            `,
            size: 'sm'
        });

        document.getElementById('reactivate-cancel-btn')?.addEventListener('click', () => Modal.hide());

        document.getElementById('reactivate-confirm-btn')?.addEventListener('click', async () => {
            const newStatus = document.getElementById('reactivate-status')?.value;
            Modal.hide();

            try {
                await ProjectService.updateStatus(project.id, newStatus);
                Toast.success(`Project moved to ${newStatus.replace('_', ' ')}`);
            } catch (error) {
                Toast.error('Failed to reactivate project');
            }
        });
    },

    subscribeToState() {
        StateManager.subscribe('projects', () => this.renderCompletedList());
        StateManager.subscribe('talents', () => this.renderCompletedList());
    }
};