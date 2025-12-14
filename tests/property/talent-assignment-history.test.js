/**
 * Property-based tests for Talent Assignment History
 * **Feature: consultant-resource-manager, Property 15: Talent Assignment History Completeness**
 * **Validates: Requirements 6.4**
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
  mockData: { talents: [], allocations: [], projects: [] },
  shouldReturnClient: true,
  
  getClient() {
    if (!this.shouldReturnClient) return null;
    
    return {
      from: (table) => ({
        select: (columns = '*') => ({
          order: (column, options) => ({
            then: (resolve) => resolve({ data: this.mockData[table] || [], error: null })
          }),
          eq: (column, value) => ({
            order: (orderColumn, options) => {
              const items = this.mockData[table] || [];
              let filteredData = items.filter(item => item[column] === value);
              
              // Sort by order column if specified
              if (orderColumn === 'start_date' && options?.ascending === false) {
                filteredData = filteredData.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
              }
              
              // Add project information for allocations
              if (table === 'allocations') {
                filteredData = filteredData.map(allocation => {
                  const project = this.mockData.projects.find(p => p.id === allocation.project_id);
                  return {
                    ...allocation,
                    projects: project ? { name: project.name, color: project.color } : null
                  };
                });
              }
              
              return { data: filteredData, error: null };
            },
            single: () => {
              const items = this.mockData[table] || [];
              const data = items.find(item => item[column] === value);
              return { data: data || null, error: data ? null : new Error('No data found') };
            }
          }),
          single: () => {
            const items = this.mockData[table] || [];
            const data = items.length > 0 ? items[0] : null;
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
        })
      })
    };
  },
  
  _reset() {
    this.mockData = { talents: [], allocations: [], projects: [] };
    this.shouldReturnClient = true;
  }
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load the services
const TalentService = require('../../js/services/talents.js');
const AllocationService = require('../../js/services/allocations.js');
const ProjectService = require('../../js/services/projects.js');

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 15: Talent Assignment History Completeness - For any talent with allocations, fetching assignment history SHALL return all allocations where talent_id matches', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate talent data
    const talentName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const talentEmail = `${talentName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const talentData = {
      name: talentName,
      email: talentEmail,
      phone: '+1234567890',
      skills: ['JavaScript', 'React'],
      notes: 'Test talent for assignment history'
    };
    
    // Create the talent
    const createdTalent = await TalentService.create(talentData);
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    
    // Generate project data
    const projectName = PropertyTest.string({ minLength: 1, maxLength: 100 });
    const projectData = {
      name: projectName,
      description: 'Test project',
      color: '#FF5733',
      status: 'in_progress'
    };
    
    // Create the project
    const createdProject = await ProjectService.create(projectData);
    expect(createdProject).toBeDefined();
    expect(createdProject.id).toBeDefined();
    
    // Generate random number of allocations (1-5)
    const numAllocations = Math.floor(Math.random() * 5) + 1;
    const createdAllocations = [];
    
    for (let i = 0; i < numAllocations; i++) {
      // Generate allocation dates
      const startDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const endDate = new Date(startDate.getTime() + (Math.floor(Math.random() * 30) + 1) * 24 * 60 * 60 * 1000);
      
      const allocationData = {
        talent_id: createdTalent.id,
        project_id: createdProject.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        notes: `Test allocation ${i + 1}`
      };
      
      const createdAllocation = await AllocationService.create(allocationData);
      expect(createdAllocation).toBeDefined();
      expect(createdAllocation.id).toBeDefined();
      createdAllocations.push(createdAllocation);
    }
    
    // Create some allocations for other talents to ensure filtering works
    const otherTalentData = {
      name: 'Other Talent',
      email: 'other@example.com',
      phone: '+9876543210',
      skills: ['Python', 'Django'],
      notes: 'Other talent'
    };
    
    const otherTalent = await TalentService.create(otherTalentData);
    
    // Create allocation for other talent
    const otherAllocationData = {
      talent_id: otherTalent.id,
      project_id: createdProject.id,
      start_date: '2024-06-01',
      end_date: '2024-06-15',
      notes: 'Other talent allocation'
    };
    
    await AllocationService.create(otherAllocationData);
    
    // Fetch assignment history for our talent
    const assignmentHistory = await TalentService.getAssignmentHistory(createdTalent.id);
    
    // Verify that assignment history contains all allocations for this talent
    expect(assignmentHistory).toBeDefined();
    expect(assignmentHistory.length).toBe(numAllocations);
    
    // Verify each allocation in the history matches our created allocations
    for (const createdAllocation of createdAllocations) {
      const foundInHistory = assignmentHistory.find(h => h.id === createdAllocation.id);
      expect(foundInHistory).toBeDefined();
      expect(foundInHistory.talent_id).toBe(createdTalent.id);
      expect(foundInHistory.project_id).toBe(createdProject.id);
      expect(foundInHistory.start_date).toBe(createdAllocation.start_date);
      expect(foundInHistory.end_date).toBe(createdAllocation.end_date);
    }
    
    // Verify that no allocations from other talents are included
    for (const historyItem of assignmentHistory) {
      expect(historyItem.talent_id).toBe(createdTalent.id);
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