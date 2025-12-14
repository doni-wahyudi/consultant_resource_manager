/**
 * Property-based tests for Project status management
 * **Feature: consultant-resource-manager, Property 9: Project Status Update Persistence**
 * **Feature: consultant-resource-manager, Property 10: Completed Projects Filter Accuracy**
 * **Validates: Requirements 4.1, 4.2, 4.3, 5.1**
 */

// Load the simple test framework
const { SimpleTest, PropertyTest, expect } = require('../simple-test-runner.js');

// Mock StateManager
const StateManager = {
  state: {},
  getState(key) {
    return this.state[key];
  },
  setState(key, value) {
    this.state[key] = value;
  },
  _reset() {
    this.state = {};
  }
};

// Mock SupabaseService
const SupabaseService = {
  mockData: { projects: [] },
  shouldReturnClient: true,
  
  getClient() {
    if (!this.shouldReturnClient) return null;
    
    return {
      from: (table) => ({
        select: (columns = '*') => ({
          order: () => ({
            then: (resolve) => resolve({ data: this.mockData[table] || [], error: null })
          }),
          eq: (column, value) => ({
            single: () => {
              const items = this.mockData[table] || [];
              const item = items.find(item => item[column] === value);
              return { data: item || null, error: item ? null : new Error('No data found') };
            }
          }),
          single: () => {
            const data = this.mockData[table] && this.mockData[table].length > 0 ? this.mockData[table][0] : null;
            return { data, error: data ? null : new Error('No data found') };
          }
        }),
        insert: (data) => ({
          select: () => ({
            single: () => {
              const newItem = { 
                id: 'test-uuid-' + Math.random().toString(36).substring(2, 11), 
                ...data[0], 
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              this.mockData[table] = [...(this.mockData[table] || []), newItem];
              return { data: newItem, error: null };
            }
          })
        }),
        update: (updateData) => ({
          eq: (column, value) => ({
            select: () => ({
              single: () => {
                const items = this.mockData[table] || [];
                const index = items.findIndex(item => item[column] === value);
                if (index !== -1) {
                  items[index] = { ...items[index], ...updateData, updated_at: new Date().toISOString() };
                  return { data: items[index], error: null };
                }
                return { data: null, error: new Error('Item not found') };
              }
            })
          })
        }),
        delete: () => ({
          eq: (column, value) => {
            const items = this.mockData[table] || [];
            this.mockData[table] = items.filter(item => item[column] !== value);
            return { data: null, error: null };
          }
        })
      })
    };
  },
  
  _reset() {
    this.mockData = { projects: [] };
    this.shouldReturnClient = true;
  }
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load the Project service
const ProjectService = require('../../js/services/projects.js');

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 9: Project Status Update Persistence - For any project and any valid status value (in_progress, completed, canceled), updating the status and then fetching the project SHALL return the updated status', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Create a project first
    const projectData = {
      name: PropertyTest.string({ minLength: 1, maxLength: 200 }),
      description: PropertyTest.string({ minLength: 0, maxLength: 500 })
    };
    
    const createdProject = await ProjectService.create(projectData);
    expect(createdProject).toBeDefined();
    expect(createdProject.id).toBeDefined();
    expect(createdProject.status).toBe('in_progress'); // Default status
    
    // Generate a random valid status
    const validStatuses = ['in_progress', 'completed', 'canceled'];
    const newStatus = validStatuses[Math.floor(Math.random() * validStatuses.length)];
    
    // Update the project status
    const updatedProject = await ProjectService.updateStatus(createdProject.id, newStatus);
    expect(updatedProject).toBeDefined();
    expect(updatedProject.status).toBe(newStatus);
    
    // Fetch the project by ID to verify persistence
    const fetchedProject = await ProjectService.getById(createdProject.id);
    expect(fetchedProject).toBeDefined();
    expect(fetchedProject.status).toBe(newStatus);
    expect(fetchedProject.id).toBe(createdProject.id);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 10: Completed Projects Filter Accuracy - For any set of projects with mixed statuses, filtering by "completed" status SHALL return exactly the projects with status "completed"', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Generate a random number of projects (3-10 to test filtering)
    const numProjects = Math.floor(Math.random() * 8) + 3;
    const createdProjects = [];
    const completedProjects = [];
    
    // Create projects with mixed statuses
    for (let i = 0; i < numProjects; i++) {
      const projectData = {
        name: `Project ${i} - ${PropertyTest.string({ minLength: 5, maxLength: 100 })}`,
        description: PropertyTest.string({ minLength: 0, maxLength: 300 })
      };
      
      const createdProject = await ProjectService.create(projectData);
      expect(createdProject).toBeDefined();
      
      // Randomly assign status
      const validStatuses = ['in_progress', 'completed', 'canceled'];
      const randomStatus = validStatuses[Math.floor(Math.random() * validStatuses.length)];
      
      // Update to the random status
      const updatedProject = await ProjectService.updateStatus(createdProject.id, randomStatus);
      expect(updatedProject.status).toBe(randomStatus);
      
      createdProjects.push(updatedProject);
      
      // Track completed projects
      if (randomStatus === 'completed') {
        completedProjects.push(updatedProject);
      }
    }
    
    // Filter projects by "completed" status
    const filteredProjects = await ProjectService.getByStatus('completed');
    
    // Verify the filter returns exactly the completed projects
    expect(filteredProjects.length).toBe(completedProjects.length);
    
    // Verify all returned projects have "completed" status
    for (const project of filteredProjects) {
      expect(project.status).toBe('completed');
    }
    
    // Verify all completed projects are in the filtered results
    for (const completedProject of completedProjects) {
      const found = filteredProjects.find(p => p.id === completedProject.id);
      expect(found).toBeDefined();
      expect(found.status).toBe('completed');
    }
    
    // Verify no non-completed projects are in the results
    const nonCompletedProjects = createdProjects.filter(p => p.status !== 'completed');
    for (const nonCompletedProject of nonCompletedProjects) {
      const found = filteredProjects.find(p => p.id === nonCompletedProject.id);
      expect(found).toBeUndefined();
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 9 Extended: Status Update Persistence Across All Valid Statuses - Each valid status should persist correctly when updated', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Create a project
    const projectData = {
      name: PropertyTest.string({ minLength: 1, maxLength: 150 }),
      description: PropertyTest.string({ minLength: 0, maxLength: 400 })
    };
    
    const createdProject = await ProjectService.create(projectData);
    expect(createdProject).toBeDefined();
    
    // Test each valid status
    const validStatuses = ['in_progress', 'completed', 'canceled'];
    
    for (const status of validStatuses) {
      // Update to this status
      const updatedProject = await ProjectService.updateStatus(createdProject.id, status);
      expect(updatedProject).toBeDefined();
      expect(updatedProject.status).toBe(status);
      
      // Verify persistence by fetching
      const fetchedProject = await ProjectService.getById(createdProject.id);
      expect(fetchedProject).toBeDefined();
      expect(fetchedProject.status).toBe(status);
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 10 Extended: Filter Accuracy for All Status Types - Filtering should work correctly for all status types', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    const validStatuses = ['in_progress', 'completed', 'canceled'];
    const projectsByStatus = { 'in_progress': [], 'completed': [], 'canceled': [] };
    
    // Create projects with each status type
    for (const status of validStatuses) {
      // Create 1-3 projects for each status
      const numProjectsForStatus = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numProjectsForStatus; i++) {
        const projectData = {
          name: `${status} Project ${i} - ${PropertyTest.string({ minLength: 5, maxLength: 80 })}`,
          description: PropertyTest.string({ minLength: 0, maxLength: 200 })
        };
        
        const createdProject = await ProjectService.create(projectData);
        const updatedProject = await ProjectService.updateStatus(createdProject.id, status);
        
        projectsByStatus[status].push(updatedProject);
      }
    }
    
    // Test filtering for each status
    for (const status of validStatuses) {
      const filteredProjects = await ProjectService.getByStatus(status);
      const expectedProjects = projectsByStatus[status];
      
      // Verify count matches
      expect(filteredProjects.length).toBe(expectedProjects.length);
      
      // Verify all returned projects have the correct status
      for (const project of filteredProjects) {
        expect(project.status).toBe(status);
      }
      
      // Verify all expected projects are in the results
      for (const expectedProject of expectedProjects) {
        const found = filteredProjects.find(p => p.id === expectedProject.id);
        expect(found).toBeDefined();
        expect(found.status).toBe(status);
      }
    }
    
    return true;
  }, { numRuns: 100 });
});

// Run the tests
if (require.main === module) {
  testSuite.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testSuite;