/**
 * Property-based tests for Allocation CRUD operations
 * **Feature: consultant-resource-manager, Property 4: Allocation Creation Round-Trip**
 * **Validates: Requirements 2.2, 2.5**
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
  mockData: { allocations: [], talents: [], projects: [] },
  shouldReturnClient: true,
  
  getClient() {
    if (!this.shouldReturnClient) return null;
    
    return {
      from: (table) => ({
        select: (columns = '*') => ({
          order: (column) => ({
            then: (resolve) => resolve({ data: this.mockData[table] || [], error: null })
          }),
          eq: (column, value) => ({
            single: () => {
              const items = this.mockData[table] || [];
              const data = items.find(item => item[column] === value);
              return { data: data || null, error: data ? null : new Error('No data found') };
            }
          }),
          lte: (column, value) => ({
            gte: (column2, value2) => {
              const items = this.mockData[table] || [];
              const data = items.filter(item => 
                item[column] <= value && item[column2] >= value2
              );
              return { data, error: null };
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
                id: 'test-uuid-' + Math.random().toString(36).substr(2, 9), 
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
    this.mockData = { allocations: [], talents: [], projects: [] };
    this.shouldReturnClient = true;
  }
};

// Mock crypto for Node.js environment
global.crypto = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load the Allocation service
const AllocationService = require('../../js/services/allocations.js');

// Helper function to generate valid date strings
function generateValidDate() {
  const year = 2024 + Math.floor(Math.random() * 2); // 2024-2025
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1; // Use 28 to avoid month-end issues
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// Helper function to generate valid date range
function generateValidDateRange() {
  const startDate = generateValidDate();
  const start = new Date(startDate);
  const endDate = new Date(start.getTime() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000); // Add 0-30 days
  return {
    start_date: startDate,
    end_date: endDate.toISOString().split('T')[0]
  };
}

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 4: Allocation Creation Round-Trip - For any valid allocation data (talent, project, date range), creating an allocation and then fetching allocations for that date range SHALL include the created allocation', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate valid allocation data
    const talentId = 'talent-' + Math.random().toString(36).substr(2, 9);
    const projectId = 'project-' + Math.random().toString(36).substr(2, 9);
    const dateRange = generateValidDateRange();
    
    const allocationData = {
      talent_id: talentId,
      project_id: projectId,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
      notes: PropertyTest.string({ minLength: 0, maxLength: 200 })
    };
    
    // Create the allocation
    const createdAllocation = await AllocationService.create(allocationData);
    
    // Verify the allocation was created with expected properties
    expect(createdAllocation).toBeDefined();
    expect(createdAllocation.id).toBeDefined();
    expect(createdAllocation.talent_id).toBe(allocationData.talent_id);
    expect(createdAllocation.project_id).toBe(allocationData.project_id);
    expect(createdAllocation.start_date).toBe(allocationData.start_date);
    expect(createdAllocation.end_date).toBe(allocationData.end_date);
    expect(createdAllocation.created_at).toBeDefined();
    
    // Fetch allocations for the date range
    const allocationsInRange = await AllocationService.getByDateRange(
      allocationData.start_date, 
      allocationData.end_date
    );
    
    // Verify the created allocation is in the date range results
    const foundAllocation = allocationsInRange.find(allocation => allocation.id === createdAllocation.id);
    expect(foundAllocation).toBeDefined();
    expect(foundAllocation.talent_id).toBe(allocationData.talent_id);
    expect(foundAllocation.project_id).toBe(allocationData.project_id);
    expect(foundAllocation.start_date).toBe(allocationData.start_date);
    expect(foundAllocation.end_date).toBe(allocationData.end_date);
    
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