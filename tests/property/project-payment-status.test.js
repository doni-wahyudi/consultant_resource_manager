/**
 * Property-based tests for Project payment status management
 * **Feature: consultant-resource-manager, Property 11: Payment Status Update Persistence**
 * **Feature: consultant-resource-manager, Property 12: Payment Status Filter Accuracy**
 * **Validates: Requirements 5.2, 5.3**
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

testSuite.test('Property 11: Payment Status Update Persistence - For any completed project, updating the payment status to paid and then fetching SHALL return is_paid as true', async () => {
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
    expect(createdProject.is_paid).toBe(false); // Default payment status
    
    // Update project status to completed first (requirement for payment tracking)
    const completedProject = await ProjectService.updateStatus(createdProject.id, 'completed');
    expect(completedProject.status).toBe('completed');
    
    // Update the payment status to paid
    const paidProject = await ProjectService.updatePaymentStatus(createdProject.id, true);
    expect(paidProject).toBeDefined();
    expect(paidProject.is_paid).toBe(true);
    
    // Fetch the project by ID to verify persistence
    const fetchedProject = await ProjectService.getById(createdProject.id);
    expect(fetchedProject).toBeDefined();
    expect(fetchedProject.is_paid).toBe(true);
    expect(fetchedProject.id).toBe(createdProject.id);
    expect(fetchedProject.status).toBe('completed');
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 11 Extended: Payment Status Update Persistence Both Ways - Payment status should persist correctly when updated to both paid and unpaid', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Create a completed project
    const projectData = {
      name: PropertyTest.string({ minLength: 1, maxLength: 150 }),
      description: PropertyTest.string({ minLength: 0, maxLength: 400 })
    };
    
    const createdProject = await ProjectService.create(projectData);
    const completedProject = await ProjectService.updateStatus(createdProject.id, 'completed');
    expect(completedProject.status).toBe('completed');
    
    // Test updating to paid
    const paidProject = await ProjectService.updatePaymentStatus(createdProject.id, true);
    expect(paidProject.is_paid).toBe(true);
    
    let fetchedProject = await ProjectService.getById(createdProject.id);
    expect(fetchedProject.is_paid).toBe(true);
    
    // Test updating back to unpaid
    const unpaidProject = await ProjectService.updatePaymentStatus(createdProject.id, false);
    expect(unpaidProject.is_paid).toBe(false);
    
    fetchedProject = await ProjectService.getById(createdProject.id);
    expect(fetchedProject.is_paid).toBe(false);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 12: Payment Status Filter Accuracy - For any set of completed projects with mixed payment statuses, filtering by payment status SHALL return exactly the matching projects', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Generate a random number of completed projects (3-8 to test filtering)
    const numProjects = Math.floor(Math.random() * 6) + 3;
    const createdProjects = [];
    const paidProjects = [];
    const unpaidProjects = [];
    
    // Create completed projects with mixed payment statuses
    for (let i = 0; i < numProjects; i++) {
      const projectData = {
        name: `Completed Project ${i} - ${PropertyTest.string({ minLength: 5, maxLength: 100 })}`,
        description: PropertyTest.string({ minLength: 0, maxLength: 300 })
      };
      
      const createdProject = await ProjectService.create(projectData);
      expect(createdProject).toBeDefined();
      
      // Set status to completed
      const completedProject = await ProjectService.updateStatus(createdProject.id, 'completed');
      expect(completedProject.status).toBe('completed');
      
      // Randomly assign payment status
      const isPaid = Math.random() < 0.5;
      const updatedProject = await ProjectService.updatePaymentStatus(createdProject.id, isPaid);
      expect(updatedProject.is_paid).toBe(isPaid);
      
      createdProjects.push(updatedProject);
      
      // Track projects by payment status
      if (isPaid) {
        paidProjects.push(updatedProject);
      } else {
        unpaidProjects.push(updatedProject);
      }
    }
    
    // Get all completed projects and filter by payment status
    const completedProjects = await ProjectService.getByStatus('completed');
    expect(completedProjects.length).toBe(numProjects);
    
    // Filter paid projects
    const filteredPaidProjects = completedProjects.filter(p => p.is_paid === true);
    
    // Filter unpaid projects
    const filteredUnpaidProjects = completedProjects.filter(p => p.is_paid === false);
    
    // Verify paid projects filter accuracy
    expect(filteredPaidProjects.length).toBe(paidProjects.length);
    
    // Verify all returned paid projects have is_paid = true
    for (const project of filteredPaidProjects) {
      expect(project.is_paid).toBe(true);
      expect(project.status).toBe('completed');
    }
    
    // Verify all expected paid projects are in the filtered results
    for (const paidProject of paidProjects) {
      const found = filteredPaidProjects.find(p => p.id === paidProject.id);
      expect(found).toBeDefined();
      expect(found.is_paid).toBe(true);
    }
    
    // Verify unpaid projects filter accuracy
    expect(filteredUnpaidProjects.length).toBe(unpaidProjects.length);
    
    // Verify all returned unpaid projects have is_paid = false
    for (const project of filteredUnpaidProjects) {
      expect(project.is_paid).toBe(false);
      expect(project.status).toBe('completed');
    }
    
    // Verify all expected unpaid projects are in the filtered results
    for (const unpaidProject of unpaidProjects) {
      const found = filteredUnpaidProjects.find(p => p.id === unpaidProject.id);
      expect(found).toBeDefined();
      expect(found.is_paid).toBe(false);
    }
    
    // Verify no overlap between paid and unpaid results
    for (const paidProject of filteredPaidProjects) {
      const foundInUnpaid = filteredUnpaidProjects.find(p => p.id === paidProject.id);
      expect(foundInUnpaid).toBeUndefined();
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