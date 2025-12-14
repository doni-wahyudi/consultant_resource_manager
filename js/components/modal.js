/**
 * Modal Component
 * Reusable modal dialog system
 * Requirements: 2.2 (project selection on allocation), 3.3 (delete confirmation)
 */

const Modal = {
    container: null,
    onClose: null,
    isClosing: false,
    currentResolve: null,
    
    init() {
        this.container = document.getElementById('modal-container');
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        if (!this.container) return;
        
        // Close on overlay click
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container && !this.isClosing) {
                this.hide();
            }
        });
        
        // Close button - use event delegation for dynamic content
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close')) {
                this.hide();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.container.classList.contains('hidden') && !this.isClosing) {
                this.hide();
            }
        });
    },
    
    /**
     * Show modal with options
     * @param {Object} options - Modal options
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal body content (HTML)
     * @param {string} options.footer - Modal footer content (HTML)
     * @param {Function} options.onClose - Callback when modal closes
     * @param {string} options.size - Modal size ('sm', 'md', 'lg')
     */
    show(options = {}) {
        const { title = '', content = '', footer = '', onClose = null, size = 'md' } = options;
        
        const modalContent = this.container.querySelector('.modal-content');
        modalContent.className = `modal-content modal-${size}`;
        
        this.container.querySelector('.modal-title').textContent = title;
        this.container.querySelector('.modal-body').innerHTML = content;
        this.container.querySelector('.modal-footer').innerHTML = footer;
        
        this.onClose = onClose;
        this.isClosing = false;
        this.container.classList.remove('hidden');
        
        // Focus first focusable element
        setTimeout(() => {
            const firstInput = this.container.querySelector('input, select, textarea, button:not(.modal-close)');
            if (firstInput) firstInput.focus();
        }, 100);
    },
    
    /**
     * Hide the modal with animation
     */
    hide() {
        if (this.isClosing) return;
        this.isClosing = true;
        
        const modalContent = this.container.querySelector('.modal-content');
        modalContent.style.animation = 'slideDown 0.2s ease forwards';
        
        setTimeout(() => {
            this.container.classList.add('hidden');
            modalContent.style.animation = '';
            this.isClosing = false;
            
            if (this.onClose) {
                this.onClose();
                this.onClose = null;
            }
            
            // Resolve any pending promise with false (cancelled)
            if (this.currentResolve) {
                this.currentResolve(false);
                this.currentResolve = null;
            }
        }, 200);
    },
    
    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Object} options - Additional options
     * @param {string} options.title - Dialog title
     * @param {string} options.confirmText - Confirm button text
     * @param {string} options.cancelText - Cancel button text
     * @param {string} options.confirmClass - Confirm button class
     * @returns {Promise<boolean>} User's choice
     */
    confirm(message, options = {}) {
        const {
            title = 'Confirm',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            confirmClass = 'btn-danger'
        } = options;
        
        return new Promise((resolve) => {
            this.currentResolve = resolve;
            
            this.show({
                title,
                content: `<p class="confirm-message">${message}</p>`,
                footer: `
                    <button class="btn btn-secondary" data-action="cancel">${cancelText}</button>
                    <button class="btn ${confirmClass}" data-action="confirm">${confirmText}</button>
                `,
                size: 'sm'
            });
            
            const footer = this.container.querySelector('.modal-footer');
            const handleClick = (e) => {
                const action = e.target.dataset.action;
                if (action === 'confirm') {
                    this.currentResolve = null;
                    resolve(true);
                    this.hide();
                } else if (action === 'cancel') {
                    this.currentResolve = null;
                    resolve(false);
                    this.hide();
                }
            };
            
            footer.addEventListener('click', handleClick);
        });
    },
    
    /**
     * Show form modal with validation
     * @param {Object} config - Form configuration
     * @param {string} config.title - Modal title
     * @param {Array} config.fields - Form field definitions
     * @param {Function} config.onSubmit - Submit handler
     * @param {string} config.submitText - Submit button text
     * @param {Object} config.validation - Validation rules
     * @returns {Promise} Resolves when form is submitted or cancelled
     */
    form(config) {
        return new Promise((resolve, reject) => {
            const { title, fields, onSubmit, submitText = 'Save', validation = {} } = config;
            
            const formHtml = fields.map(field => `
                <div class="form-group">
                    <label class="form-label" for="modal-${field.name}">
                        ${field.label}${field.required ? ' <span class="required">*</span>' : ''}
                    </label>
                    ${this.renderFormField(field)}
                    ${field.hint ? `<div class="form-hint">${field.hint}</div>` : ''}
                </div>
            `).join('');
            
            this.show({
                title,
                content: `<form id="modal-form" novalidate>${formHtml}</form>`,
                footer: `
                    <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                    <button type="submit" form="modal-form" class="btn btn-primary">${submitText}</button>
                `
            });
            
            const form = document.getElementById('modal-form');
            
            const handleSubmit = async (e) => {
                e.preventDefault();
                
                // Validate form
                const validationResult = FormUtils.validate(form, validation);
                if (!validationResult.isValid) {
                    return;
                }
                
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                // Handle array fields (checkboxes, multi-select)
                fields.forEach(field => {
                    if (field.type === 'checkbox-group') {
                        data[field.name] = formData.getAll(field.name);
                    }
                });
                
                try {
                    const result = await onSubmit(data);
                    this.hide();
                    resolve(result);
                } catch (error) {
                    Toast.error(error.message || 'An error occurred');
                    reject(error);
                }
            };
            
            form.addEventListener('submit', handleSubmit);
            
            this.container.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                this.hide();
                resolve(null);
            });
        });
    },
    
    /**
     * Show a selection modal (e.g., for project selection)
     * @param {Object} config - Selection configuration
     * @param {string} config.title - Modal title
     * @param {Array} config.items - Items to select from
     * @param {Function} config.renderItem - Function to render each item
     * @param {string} config.emptyMessage - Message when no items
     * @returns {Promise} Selected item or null
     */
    select(config) {
        return new Promise((resolve) => {
            const { title, items, renderItem, emptyMessage = 'No items available' } = config;
            
            let content;
            if (items.length === 0) {
                content = `<p class="empty-message">${emptyMessage}</p>`;
            } else {
                content = `
                    <div class="selection-list">
                        ${items.map((item, index) => `
                            <div class="selection-item" data-index="${index}">
                                ${renderItem(item)}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            this.show({
                title,
                content,
                footer: `<button class="btn btn-secondary" data-action="cancel">Cancel</button>`
            });
            
            // Handle item selection
            const selectionList = this.container.querySelector('.selection-list');
            if (selectionList) {
                selectionList.addEventListener('click', (e) => {
                    const item = e.target.closest('.selection-item');
                    if (item) {
                        const index = parseInt(item.dataset.index);
                        this.hide();
                        resolve(items[index]);
                    }
                });
            }
            
            this.container.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                this.hide();
                resolve(null);
            });
        });
    },
    
    /**
     * Render a form field based on its type
     * @param {Object} field - Field configuration
     * @returns {string} HTML string
     */
    renderFormField(field) {
        const id = `modal-${field.name}`;
        const required = field.required ? 'required' : '';
        const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
        const disabled = field.disabled ? 'disabled' : '';
        
        switch (field.type) {
            case 'textarea':
                return `<textarea class="form-textarea" name="${field.name}" id="${id}" 
                    rows="${field.rows || 3}" ${required} ${placeholder} ${disabled}>${field.value || ''}</textarea>`;
            
            case 'select':
                const options = (field.options || []).map(opt => {
                    const selected = opt.value === field.value ? 'selected' : '';
                    return `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
                }).join('');
                const emptyOption = field.placeholder ? `<option value="">${field.placeholder}</option>` : '';
                return `<select class="form-select" name="${field.name}" id="${id}" ${required} ${disabled}>
                    ${emptyOption}${options}
                </select>`;
            
            case 'date':
                return `<input type="date" class="form-input" name="${field.name}" id="${id}" 
                    value="${field.value || ''}" ${required} ${disabled}
                    ${field.min ? `min="${field.min}"` : ''} ${field.max ? `max="${field.max}"` : ''}>`;
            
            case 'number':
                return `<input type="number" class="form-input" name="${field.name}" id="${id}" 
                    value="${field.value || ''}" ${required} ${placeholder} ${disabled}
                    ${field.min !== undefined ? `min="${field.min}"` : ''} 
                    ${field.max !== undefined ? `max="${field.max}"` : ''}
                    ${field.step ? `step="${field.step}"` : ''}>`;
            
            case 'color':
                return `<div class="color-input-wrapper">
                    <input type="color" class="form-color" name="${field.name}" id="${id}" 
                        value="${field.value || '#4f46e5'}" ${disabled}>
                    <span class="color-value">${field.value || '#4f46e5'}</span>
                </div>`;
            
            case 'checkbox':
                return `<label class="checkbox-label">
                    <input type="checkbox" name="${field.name}" id="${id}" 
                        ${field.value ? 'checked' : ''} ${disabled}>
                    <span>${field.checkboxLabel || ''}</span>
                </label>`;
            
            case 'hidden':
                return `<input type="hidden" name="${field.name}" value="${field.value || ''}">`;
            
            default:
                return `<input type="${field.type || 'text'}" class="form-input" name="${field.name}" 
                    id="${id}" value="${field.value || ''}" ${required} ${placeholder} ${disabled}
                    ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}>`;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Modal.init());
