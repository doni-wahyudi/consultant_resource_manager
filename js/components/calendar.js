/**
 * Calendar Component
 * Monthly calendar view with drag-and-drop allocation support
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

const Calendar = {
    container: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    onDateClickCallback: null,
    onAllocationClickCallback: null,
    
    /**
     * Render calendar for month/year
     * @param {HTMLElement} container - Container element
     * @param {number} month - Month (0-11)
     * @param {number} year - Year
     */
    render(container, month = this.currentMonth, year = this.currentYear) {
        this.container = container;
        this.currentMonth = month;
        this.currentYear = year;
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        
        container.innerHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <h2 class="calendar-title">${monthNames[month]} ${year}</h2>
                    <div class="calendar-nav">
                        <button class="calendar-nav-btn" data-action="prev">&lt; Prev</button>
                        <button class="calendar-nav-btn" data-action="today">Today</button>
                        <button class="calendar-nav-btn" data-action="next">Next &gt;</button>
                    </div>
                </div>
                <div class="calendar-grid">
                    ${this.renderDayHeaders()}
                    ${this.renderDays(month, year)}
                </div>
            </div>
        `;
        
        this.setupNavigation();
        this.setDropHandlers();
        this.showAllocations();
        
        // Subscribe to allocation changes
        this.subscribeToState();
    },
    
    /**
     * Subscribe to state changes for auto-refresh
     */
    subscribeToState() {
        StateManager.subscribe('allocations', () => {
            if (this.container) {
                this.showAllocations();
            }
        });
        StateManager.subscribe('projects', () => {
            if (this.container) {
                this.showAllocations();
            }
        });
    },
    
    renderDayHeaders() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map(day => `<div class="calendar-day-header">${day}</div>`).join('');
    },
    
    renderDays(month, year) {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        // Get today's date in local timezone (not UTC)
        const now = new Date();
        const todayYear = now.getFullYear();
        const todayMonth = now.getMonth();
        const todayDay = now.getDate();
        const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
        
        let days = [];
        
        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = this.formatDateLocal(year, month - 1, day);
            days.push(this.renderDay(day, date, true, date === todayStr));
        }
        
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = this.formatDateLocal(year, month, day);
            const isToday = date === todayStr;
            days.push(this.renderDay(day, date, false, isToday));
        }
        
        // Next month days
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const date = this.formatDateLocal(year, month + 1, day);
            days.push(this.renderDay(day, date, true, date === todayStr));
        }
        
        return days.join('');
    },
    
    formatDateLocal(year, month, day) {
        // Handle month overflow/underflow
        const d = new Date(year, month, day);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    },
    
    renderDay(day, date, isOtherMonth, isToday = false) {
        const classes = ['calendar-day'];
        if (isOtherMonth) classes.push('other-month');
        if (isToday) classes.push('today');
        
        return `
            <div class="${classes.join(' ')}" data-date="${date}">
                <div class="calendar-date">${day}</div>
                <div class="calendar-allocations" data-date="${date}"></div>
            </div>
        `;
    },
    
    formatDate(year, month, day) {
        // Use local date formatting to avoid timezone issues
        return this.formatDateLocal(year, month, day);
    },
    
    setupNavigation() {
        this.container.querySelectorAll('.calendar-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'prev') this.navigateMonth(-1);
                else if (action === 'next') this.navigateMonth(1);
                else if (action === 'today') {
                    this.currentMonth = new Date().getMonth();
                    this.currentYear = new Date().getFullYear();
                    this.render(this.container);
                }
            });
        });
    },
    
    navigateMonth(direction) {
        this.currentMonth += direction;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.render(this.container);
    },
    
    setDropHandlers() {
        const dayCells = this.container.querySelectorAll('.calendar-day');
        
        dayCells.forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('drop-target');
            });
            
            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drop-target');
            });
            
            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drop-target');
                const talentId = e.dataTransfer.getData('text/plain');
                const date = cell.dataset.date;
                if (this.onDateClickCallback) {
                    this.onDateClickCallback(date, talentId);
                }
            });
            
            cell.addEventListener('click', (e) => {
                // Skip if clicking on allocation items (they have their own handlers)
                if (e.target.classList.contains('allocation-item') || 
                    e.target.closest('.allocation-item')) return;
                
                const date = cell.dataset.date;
                if (this.onDateClickCallback) {
                    this.onDateClickCallback(date);
                }
            });
        });
    },
    
    onProjectClickCallback: null,
    
    /**
     * Display allocations and project dates on the calendar with project colors
     * Requirement: 2.3 - Show all resource allocations with project color coding
     */
    showAllocations() {
        const allocations = StateManager.getState('allocations') || [];
        const projects = StateManager.getState('projects') || [];
        const talents = StateManager.getState('talents') || [];
        
        // Clear existing allocations
        this.container.querySelectorAll('.calendar-allocations').forEach(el => {
            el.innerHTML = '';
        });
        
        // Get visible date range for this month
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        // Show project date ranges on calendar continuously (all projects with dates)
        projects.forEach(project => {
            if (!project.start_date && !project.end_date) return;
            
            const startDate = project.start_date ? new Date(project.start_date + 'T00:00:00') : null;
            const endDate = project.end_date ? new Date(project.end_date + 'T00:00:00') : null;
            
            // Check if project overlaps with current month
            if (startDate && startDate > lastDay) return;
            if (endDate && endDate < firstDay) return;
            
            // Determine the visible range for this project within the current month view
            const visibleStart = startDate && startDate >= firstDay ? startDate : firstDay;
            const visibleEnd = endDate && endDate <= lastDay ? endDate : lastDay;
            
            // Show project bar on every day within the range
            for (let d = new Date(visibleStart); d <= visibleEnd; d.setDate(d.getDate() + 1)) {
                const dateStr = this.formatDateLocal(d.getFullYear(), d.getMonth(), d.getDate());
                const container = this.container.querySelector(`.calendar-allocations[data-date="${dateStr}"]`);
                if (container) {
                    const item = document.createElement('div');
                    item.className = 'allocation-item project-date-marker';
                    item.style.backgroundColor = project.color;
                    item.style.opacity = '0.5';
                    item.dataset.projectId = project.id;
                    
                    // Show icon on start/end dates, just color bar on middle days
                    const isStart = startDate && d.getTime() === startDate.getTime();
                    const isEnd = endDate && d.getTime() === endDate.getTime();
                    
                    if (isStart && isEnd) {
                        item.textContent = `📅 ${project.name}`;
                    } else if (isStart) {
                        item.textContent = `📅 ${project.name}`;
                    } else if (isEnd) {
                        item.textContent = `🏁 ${project.name}`;
                    } else {
                        // Middle days - show abbreviated name or just color
                        item.textContent = project.name.length > 8 ? project.name.substring(0, 8) + '…' : project.name;
                        item.style.opacity = '0.4';
                    }
                    
                    item.title = `Project: ${project.name}\n${project.start_date || 'No start'} to ${project.end_date || 'No end'}`;
                    
                    // Add click handler for project popup
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (this.onProjectClickCallback) {
                            this.onProjectClickCallback(project);
                        }
                    });
                    
                    container.appendChild(item);
                }
            }
        });
        
        // Filter allocations that overlap with current month view
        const visibleAllocations = allocations.filter(a => {
            const start = new Date(a.start_date + 'T00:00:00');
            const end = new Date(a.end_date + 'T00:00:00');
            return start <= lastDay && end >= firstDay;
        });
        
        visibleAllocations.forEach(allocation => {
            const project = projects.find(p => p.id === allocation.project_id);
            const talent = talents.find(t => t.id === allocation.talent_id);
            if (!project || !talent) return;
            
            // Find all days this allocation spans
            const startDate = new Date(allocation.start_date + 'T00:00:00');
            const endDate = new Date(allocation.end_date + 'T00:00:00');
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = this.formatDateLocal(d.getFullYear(), d.getMonth(), d.getDate());
                const container = this.container.querySelector(`.calendar-allocations[data-date="${dateStr}"]`);
                if (container) {
                    const item = document.createElement('div');
                    item.className = 'allocation-item';
                    item.style.backgroundColor = project.color;
                    item.textContent = talent.name;
                    item.dataset.allocationId = allocation.id;
                    item.title = `${talent.name} - ${project.name}\n${allocation.start_date} to ${allocation.end_date}`;
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (this.onAllocationClickCallback) {
                            this.onAllocationClickCallback(allocation);
                        }
                    });
                    container.appendChild(item);
                }
            }
        });
    },
    
    onDateClick(callback) {
        this.onDateClickCallback = callback;
    },
    
    onAllocationClick(callback) {
        this.onAllocationClickCallback = callback;
    },
    
    onProjectClick(callback) {
        this.onProjectClickCallback = callback;
    }
};

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calendar;
}
