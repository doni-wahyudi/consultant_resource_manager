/**
 * Property-based tests for Talent Availability and Allocation Conflicts
 * **Feature: consultant-resource-manager, Property 20: Talent Availability Calculation**
 * **Feature: consultant-resource-manager, Property 21: Allocation Conflict Detection**
 * **Validates: Requirements 9.1, 9.2, 9.3**
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

// Helper function to check if two date ranges overlap
function dateRangesOverlap(start1, end1, start2, end2) {
  return start1 <= end2 && start2 <= end1;
}

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 20: Talent Availability Calculation - For any talent and date, the availability status SHALL be "unavailable" if and only if there exists an allocation where the date falls within [start_date, end_date]', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate a talent ID and test date
    const talentId = 'talent-' + Math.random().toString(36).substr(2, 9);
    const testDate = generateValidDate();
    
    // Generate some random allocations for this talent
    const numAllocations = Math.floor(Math.random() * 5); // 0-4 allocations
    const allocations = [];
    
    for (let i = 0; i < numAllocations; i++) {
      const dateRange = generateValidDateRange();
      const allocation = {
        id: 'allocation-' + i,
        talent_id: talentId,
        project_id: 'project-' + i,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      };
      allocations.push(allocation);
    }
    
    // Set the allocations in state
    StateManager.setState('allocations', allocations);
    
    // Check if the talent should be available on the test date
    const shouldBeUnavailable = allocations.some(allocation => 
      allocation.talent_id === talentId &&
      allocation.start_date <= testDate && 
      allocation.end_date >= testDate
    );
    
    // Test the availability function
    const isAvailable = AllocationService.isTalentAvailable(talentId, testDate);
    
    // The talent should be available if and only if there's no overlapping allocation
    expect(isAvailable).toBe(!shouldBeUnavailable);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 21: Allocation Conflict Detection - For any talent with existing allocations, attempting to create an overlapping allocation SHALL be detected as a conflict', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate a talent ID
    const talentId = 'talent-' + Math.random().toString(36).substr(2, 9);
    
    // Create some existing allocations for this talent
    const numExistingAllocations = Math.floor(Math.random() * 3) + 1; // 1-3 existing allocations
    const existingAllocations = [];
    
    for (let i = 0; i < numExistingAllocations; i++) {
      const dateRange = generateValidDateRange();
      const allocation = {
        id: 'existing-allocation-' + i,
        talent_id: talentId,
        project_id: 'project-' + i,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      };
      existingAllocations.push(allocation);
    }
    
    // Set the existing allocations in state
    StateManager.setState('allocations', existingAllocations);
    
    // Generate a new allocation that may or may not overlap
    const newDateRange = generateValidDateRange();
    const newStartDate = newDateRange.start_date;
    const newEndDate = newDateRange.end_date;
    
    // Check if the new allocation should conflict with existing ones
    const shouldHaveConflicts = existingAllocations.some(existing => 
      dateRangesOverlap(existing.start_date, existing.end_date, newStartDate, newEndDate)
    );
    
    // Test the conflict detection function
    const conflicts = await AllocationService.checkConflicts(talentId, newStartDate, newEndDate);
    
    // Verify conflict detection matches our expectation
    if (shouldHaveConflicts) {
      expect(conflicts.length).toBeGreaterThan(0);
      // Verify that all detected conflicts actually overlap
      conflicts.forEach(conflict => {
        expect(dateRangesOverlap(conflict.start_date, conflict.end_date, newStartDate, newEndDate)).toBe(true);
        expect(conflict.talent_id).toBe(talentId);
      });
    } else {
      expect(conflicts.length).toBe(0);
    }
    
    return true;
  }, { numRuns: 100 });
});

// Additional test to verify conflict detection excludes the allocation being updated
testSuite.test('Property 21 Extension: Conflict detection should exclude allocation being updated', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate a talent ID
    const talentId = 'talent-' + Math.random().toString(36).substr(2, 9);
    
    // Create an existing allocation
    const dateRange = generateValidDateRange();
    const existingAllocation = {
      id: 'existing-allocation-1',
      talent_id: talentId,
      project_id: 'project-1',
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    };
    
    // Set the allocation in state
    StateManager.setState('allocations', [existingAllocation]);
    
    // Test conflict detection when updating the same allocation (should not conflict with itself)
    const conflicts = await AllocationService.checkConflicts(
      talentId, 
      dateRange.start_date, 
      dateRange.end_date, 
      existingAllocation.id // Exclude this allocation
    );
    
    // Should not detect a conflict with itself
    expect(conflicts.length).toBe(0);
    
    return true;
  }, { numRuns: 50 });
});

// Run the tests
if (require.main === module) {
  testSuite.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testSuite;