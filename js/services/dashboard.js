/**
 * Dashboard Service
 * Metrics calculation functions for dashboard
 * Requirements: 8.1, 8.2, 8.3
 */

const DashboardService = {
    /**
     * Calculate total talent count
     * @returns {number} Total number of talents
     */
    getTalentCount() {
        const talents = StateManager.getState('talents') || [];
        return talents.length;
    },

    /**
     * Calculate active projects count
     * @returns {number} Number of projects with status 'in_progress'
     */
    getActiveProjectsCount() {
        const projects = StateManager.getState('projects') || [];
        return projects.filter(p => p.status === 'in_progress').length;
    },

    /**
     * Calculate utilization percentage for current month
     * Utilization = (allocated talent-days / total talent-days) * 100
     * @returns {number} Utilization percentage (0-100)
     */
    calculateUtilization() {
        const talents = StateManager.getState('talents') || [];
        const allocations = StateManager.getState('allocations') || [];

        if (talents.length === 0) return 0;

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const totalDaysInMonth = endOfMonth.getDate();
        const totalTalentDays = talents.length * totalDaysInMonth;

        if (totalTalentDays === 0) return 0;

        let allocatedDays = 0;

        allocations.forEach(allocation => {
            const allocStart = new Date(allocation.start_date);
            const allocEnd = new Date(allocation.end_date);

            // Calculate overlap with current month
            const overlapStart = new Date(Math.max(allocStart.getTime(), startOfMonth.getTime()));
            const overlapEnd = new Date(Math.min(allocEnd.getTime(), endOfMonth.getTime()));

            if (overlapStart <= overlapEnd) {
                // Calculate days in overlap (inclusive)
                const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                allocatedDays += days;
            }
        });

        return Math.round((allocatedDays / totalTalentDays) * 100);
    },


    /**
     * Get upcoming deadlines (projects ending within next 30 days)
     * @returns {Array} Projects with upcoming deadlines, sorted by end_date
     */
    getUpcomingDeadlines() {
        const projects = StateManager.getState('projects') || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        return projects
            .filter(project => {
                if (!project.end_date) return false;
                const endDate = new Date(project.end_date);
                endDate.setHours(0, 0, 0, 0);
                return endDate >= today && endDate <= thirtyDaysLater;
            })
            .sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    },

    /**
     * Get unpaid completed projects summary
     * @returns {Object} Summary with projects array and total count
     */
    getUnpaidProjectsSummary() {
        const projects = StateManager.getState('projects') || [];
        const unpaidProjects = projects.filter(p => 
            p.status === 'completed' && !p.is_paid
        );

        return {
            projects: unpaidProjects,
            count: unpaidProjects.length,
            totalBudget: unpaidProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
        };
    },

    /**
     * Get all dashboard metrics at once
     * @returns {Object} All dashboard metrics
     */
    getAllMetrics() {
        return {
            talentCount: this.getTalentCount(),
            activeProjectsCount: this.getActiveProjectsCount(),
            utilization: this.calculateUtilization(),
            upcomingDeadlines: this.getUpcomingDeadlines(),
            unpaidProjects: this.getUnpaidProjectsSummary()
        };
    }
};

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardService;
}
