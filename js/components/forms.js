/**
 * Form Components and Validation Utilities
 * Requirements: 1.1 (talent forms), 3.1 (project forms), 7.1 (area forms), 10.3 (client forms)
 */

const FormUtils = {
    /**
     * Validate required field
     * @param {string} value - Field value
     * @returns {boolean} Is valid
     */
    required(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    /**
     * Validate email format
     * @param {string} value - Email value
     * @returns {boolean} Is valid
     */
    email(value) {
        if (!value || value.trim() === '') return true; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value.trim());
    },
    
    /**
     * Validate phone number format
     * @param {string} value - Phone value
     * @returns {boolean} Is valid
     */
    phone(value) {
        if (!value || value.trim() === '') return true; // Optional field
        // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
        const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
        return phoneRegex.test(value.trim()) && value.replace(/\D/g, '').length >= 7;
    },
    
    /**
     * Validate date format
     * @param {string} value - Date value
     * @returns {boolean} Is valid
     */
    date(value) {
        if (!value || value.trim() === '') return true; // Optional field
        const date = new Date(value);
        return !isNaN(date.getTime());
    },
    
    /**
     * Validate date range (end date >= start date)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {boolean} Is valid
     */
    dateRange(startDate, endDate) {
        if (!startDate || !endDate) return true;
        return new Date(startDate) <= new Date(endDate);
    },
    
    /**
     * Validate minimum length
     * @param {string} value - Field value
     * @param {number} min - Minimum length
     * @returns {boolean} Is valid
     */
    minLength(value, min) {
        if (!value) return true; // Let required handle empty
        return value.toString().trim().length >= min;
    },
    
    /**
     * Validate maximum length
     * @param {string} value - Field value
     * @param {number} max - Maximum length
     * @returns {boolean} Is valid
     */
    maxLength(value, max) {
        if (!value) return true;
        return value.toString().trim().length <= max;
    },
    
    /**
     * Validate number range
     * @param {string|number} value - Field value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {boolean} Is valid
     */
    numberRange(value, min, max) {
        if (!value && value !== 0) return true;
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
        return true;
    },
    
    /**
     * Validate hex color format
     * @param {string} value - Color value
     * @returns {boolean} Is valid
     */
    hexColor(value) {
        if (!value) return true;
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexRegex.test(value);
    },
    
    /**
     * Validate URL format
     * @param {string} value - URL value
     * @returns {boolean} Is valid
     */
    url(value) {
        if (!value || value.trim() === '') return true;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    
    /**
     * Validate form and show errors
     * @param {HTMLFormElement} form - Form element
     * @param {Object} rules - Validation rules
     * @returns {Object} { isValid, errors, data }
     */
    validate(form, rules) {
        const errors = {};
        const formData = new FormData(form);
        const data = {};
        
        // Collect all form data
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = formData.get(field);
            
            for (const rule of fieldRules) {
                let isValid = true;
                let message = '';
                
                switch (rule.type) {
                    case 'required':
                        isValid = this.required(value);
                        message = rule.message || `This field is required`;
                        break;
                    case 'email':
                        isValid = this.email(value);
                        message = rule.message || 'Please enter a valid email address';
                        break;
                    case 'phone':
                        isValid = this.phone(value);
                        message = rule.message || 'Please enter a valid phone number';
                        break;
                    case 'date':
                        isValid = this.date(value);
                        message = rule.message || 'Please enter a valid date';
                        break;
                    case 'minLength':
                        isValid = this.minLength(value, rule.value);
                        message = rule.message || `Must be at least ${rule.value} characters`;
                        break;
                    case 'maxLength':
                        isValid = this.maxLength(value, rule.value);
                        message = rule.message || `Must be no more than ${rule.value} characters`;
                        break;
                    case 'numberRange':
                        isValid = this.numberRange(value, rule.min, rule.max);
                        message = rule.message || `Must be between ${rule.min} and ${rule.max}`;
                        break;
                    case 'hexColor':
                        isValid = this.hexColor(value);
                        message = rule.message || 'Please enter a valid hex color (e.g., #FF0000)';
                        break;
                    case 'url':
                        isValid = this.url(value);
                        message = rule.message || 'Please enter a valid URL';
                        break;
                    case 'dateRange':
                        const startValue = formData.get(rule.startField);
                        const endValue = formData.get(rule.endField);
                        isValid = this.dateRange(startValue, endValue);
                        message = rule.message || 'End date must be after start date';
                        break;
                    case 'custom':
                        isValid = rule.validator(value, data);
                        message = rule.message || 'Invalid value';
                        break;
                }
                
                if (!isValid) {
                    errors[field] = message;
                    break; // Stop at first error for this field
                }
            }
        }
        
        // Show/clear errors in form
        this.showErrors(form, errors);
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            data
        };
    },
    
    /**
     * Show validation errors in form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} errors - Error messages by field
     */
    showErrors(form, errors) {
        // Clear existing errors
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        
        // Show new errors
        for (const [field, message] of Object.entries(errors)) {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('error');
                const errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                errorEl.textContent = message;
                
                // Insert error after input or its wrapper
                const wrapper = input.closest('.form-group');
                if (wrapper) {
                    wrapper.appendChild(errorEl);
                } else {
                    input.parentNode.appendChild(errorEl);
                }
            }
        }
        
        // Focus first error field
        const firstErrorField = form.querySelector('.error');
        if (firstErrorField) {
            firstErrorField.focus();
        }
    },
    
    /**
     * Clear all errors from form
     * @param {HTMLFormElement} form - Form element
     */
    clearErrors(form) {
        form.querySelectorAll('.form-error').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    },
    
    /**
     * Get form data as object
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Form data
     */
    getData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            // Handle multiple values (checkboxes, multi-select)
            if (data[key] !== undefined) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },
    
    /**
     * Set form data from object
     * @param {HTMLFormElement} form - Form element
     * @param {Object} data - Data to set
     */
    setData(form, data) {
        for (const [key, value] of Object.entries(data)) {
            const input = form.querySelector(`[name="${key}"]`);
            if (!input) continue;
            
            if (input.type === 'checkbox') {
                input.checked = Boolean(value);
            } else if (input.type === 'radio') {
                const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                if (radio) radio.checked = true;
            } else if (input.tagName === 'SELECT' && input.multiple && Array.isArray(value)) {
                Array.from(input.options).forEach(opt => {
                    opt.selected = value.includes(opt.value);
                });
            } else {
                input.value = value || '';
            }
        }
    },
    
    /**
     * Reset form to initial state
     * @param {HTMLFormElement} form - Form element
     */
    reset(form) {
        form.reset();
        this.clearErrors(form);
    },
    
    /**
     * Create validation rules for common entity types
     */
    rules: {
        /**
         * Talent form validation rules
         */
        talent() {
            return {
                name: [
                    { type: 'required', message: 'Name is required' },
                    { type: 'maxLength', value: 200, message: 'Name must be 200 characters or less' }
                ],
                email: [
                    { type: 'email', message: 'Please enter a valid email address' }
                ],
                phone: [
                    { type: 'phone', message: 'Please enter a valid phone number' }
                ]
            };
        },
        
        /**
         * Project form validation rules
         */
        project() {
            return {
                name: [
                    { type: 'required', message: 'Project name is required' },
                    { type: 'maxLength', value: 200, message: 'Name must be 200 characters or less' }
                ],
                color: [
                    { type: 'required', message: 'Color is required' },
                    { type: 'hexColor', message: 'Please select a valid color' }
                ],
                start_date: [
                    { type: 'date', message: 'Please enter a valid start date' }
                ],
                end_date: [
                    { type: 'date', message: 'Please enter a valid end date' },
                    { type: 'dateRange', startField: 'start_date', endField: 'end_date', message: 'End date must be after start date' }
                ],
                budget: [
                    { type: 'numberRange', min: 0, message: 'Budget must be a positive number' }
                ]
            };
        },
        
        /**
         * Area form validation rules
         */
        area() {
            return {
                name: [
                    { type: 'required', message: 'Area name is required' },
                    { type: 'maxLength', value: 100, message: 'Name must be 100 characters or less' }
                ]
            };
        },
        
        /**
         * Client form validation rules
         */
        client() {
            return {
                name: [
                    { type: 'required', message: 'Client name is required' },
                    { type: 'maxLength', value: 200, message: 'Name must be 200 characters or less' }
                ],
                contact_email: [
                    { type: 'email', message: 'Please enter a valid email address' }
                ],
                contact_phone: [
                    { type: 'phone', message: 'Please enter a valid phone number' }
                ]
            };
        },
        
        /**
         * Allocation form validation rules
         */
        allocation() {
            return {
                talent_id: [
                    { type: 'required', message: 'Please select a talent' }
                ],
                project_id: [
                    { type: 'required', message: 'Please select a project' }
                ],
                start_date: [
                    { type: 'required', message: 'Start date is required' },
                    { type: 'date', message: 'Please enter a valid start date' }
                ],
                end_date: [
                    { type: 'required', message: 'End date is required' },
                    { type: 'date', message: 'Please enter a valid end date' },
                    { type: 'dateRange', startField: 'start_date', endField: 'end_date', message: 'End date must be after start date' }
                ]
            };
        }
    }
};

/**
 * Form field component generators
 */
const FormFields = {
    /**
     * Create a text input field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    text(config) {
        const { name, label, value = '', required = false, placeholder = '', maxLength = '' } = config;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <input type="text" class="form-input" name="${name}" id="${name}" 
                    value="${this.escapeHtml(value)}" 
                    ${required ? 'required' : ''} 
                    ${placeholder ? `placeholder="${placeholder}"` : ''}
                    ${maxLength ? `maxlength="${maxLength}"` : ''}>
            </div>
        `;
    },
    
    /**
     * Create an email input field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    email(config) {
        const { name, label, value = '', required = false, placeholder = 'email@example.com' } = config;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <input type="email" class="form-input" name="${name}" id="${name}" 
                    value="${this.escapeHtml(value)}" 
                    ${required ? 'required' : ''} 
                    placeholder="${placeholder}">
            </div>
        `;
    },
    
    /**
     * Create a phone input field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    phone(config) {
        const { name, label, value = '', required = false, placeholder = '' } = config;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <input type="tel" class="form-input" name="${name}" id="${name}" 
                    value="${this.escapeHtml(value)}" 
                    ${required ? 'required' : ''} 
                    ${placeholder ? `placeholder="${placeholder}"` : ''}>
            </div>
        `;
    },
    
    /**
     * Create a date input field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    date(config) {
        const { name, label, value = '', required = false, min = '', max = '' } = config;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <input type="date" class="form-input" name="${name}" id="${name}" 
                    value="${value}" 
                    ${required ? 'required' : ''} 
                    ${min ? `min="${min}"` : ''} 
                    ${max ? `max="${max}"` : ''}>
            </div>
        `;
    },
    
    /**
     * Create a select dropdown field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    select(config) {
        const { name, label, value = '', required = false, options = [], placeholder = 'Select...' } = config;
        const optionsHtml = options.map(opt => 
            `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <select class="form-select" name="${name}" id="${name}" ${required ? 'required' : ''}>
                    <option value="">${placeholder}</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
    },
    
    /**
     * Create a textarea field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    textarea(config) {
        const { name, label, value = '', required = false, rows = 3, placeholder = '' } = config;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <textarea class="form-textarea" name="${name}" id="${name}" 
                    rows="${rows}" 
                    ${required ? 'required' : ''} 
                    ${placeholder ? `placeholder="${placeholder}"` : ''}>${this.escapeHtml(value)}</textarea>
            </div>
        `;
    },
    
    /**
     * Create a color picker field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    color(config) {
        const { name, label, value = '#4f46e5', required = false } = config;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <div class="color-input-wrapper">
                    <input type="color" class="form-color" name="${name}" id="${name}" 
                        value="${value}" ${required ? 'required' : ''}>
                    <span class="color-value">${value}</span>
                </div>
            </div>
        `;
    },
    
    /**
     * Create a number input field
     * @param {Object} config - Field configuration
     * @returns {string} HTML string
     */
    number(config) {
        const { name, label, value = '', required = false, min, max, step = 'any', placeholder = '' } = config;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${label}${required ? ' <span class="required">*</span>' : ''}
                </label>
                <input type="number" class="form-input" name="${name}" id="${name}" 
                    value="${value}" 
                    ${required ? 'required' : ''} 
                    ${min !== undefined ? `min="${min}"` : ''} 
                    ${max !== undefined ? `max="${max}"` : ''} 
                    step="${step}"
                    ${placeholder ? `placeholder="${placeholder}"` : ''}>
            </div>
        `;
    },
    
    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
