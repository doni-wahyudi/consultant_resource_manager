/**
 * Property-based tests for Area CRUD operations
 * **Feature: consultant-resource-manager, Property 16: Area CRUD Round-Trip**
 * **Validates: Requirements 7.1**
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
  mockData: { areas: [] },
  shouldReturnClient: true,
  
  getClient() {
    if (!this.shouldReturnClient) return null;
    
    return {
      from: (table) => ({
        select: (columns = '*') => ({
          order: (column) => ({
            then: (resolve) => resolve({ data: this.mockData[table] || [], error: null })
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
                  items[index] = { ...items[index], ...updateData };
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
    this.mockData = { areas: [] };
    this.shouldReturnClient = true;
  }
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load the Area service
const AreaService = require('../../js/services/areas.js');

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 16: Area CRUD Round-Trip - For any valid area name, creating an area and then fetching all areas SHALL include an area with that name', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate a valid area name
    const areaName = PropertyTest.string({ minLength: 1, maxLength: 100 });
    const areaData = { name: areaName };
    
    // Create the area
    const createdArea = await AreaService.create(areaData);
    
    // Verify the area was created with expected properties
    expect(createdArea).toBeDefined();
    expect(createdArea.id).toBeDefined();
    expect(createdArea.name).toBe(areaData.name);
    expect(createdArea.created_at).toBeDefined();
    
    // Fetch all areas
    const allAreas = await AreaService.getAll();
    
    // Verify the created area is in the list
    const foundArea = allAreas.find(area => area.name === areaData.name);
    expect(foundArea).toBeDefined();
    expect(foundArea.id).toBe(createdArea.id);
    expect(foundArea.name).toBe(areaData.name);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 16 Extended: Area Update Round-Trip - For any existing area and valid name change, updating should persist', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate area names
    const originalName = PropertyTest.string({ minLength: 1, maxLength: 100 });
    const updatedName = PropertyTest.string({ minLength: 1, maxLength: 100 });
    
    // Create initial area
    const originalData = { name: originalName };
    const createdArea = await AreaService.create(originalData);
    
    // Update the area
    const updateData = { name: updatedName };
    const updatedArea = await AreaService.update(createdArea.id, updateData);
    
    // Verify update was successful
    expect(updatedArea).toBeDefined();
    expect(updatedArea.id).toBe(createdArea.id);
    expect(updatedArea.name).toBe(updateData.name);
    expect(updatedArea.updated_at).toBeDefined();
    
    // Fetch all areas and verify the update persisted
    const allAreas = await AreaService.getAll();
    const foundArea = allAreas.find(area => area.id === createdArea.id);
    expect(foundArea).toBeDefined();
    expect(foundArea.name).toBe(updateData.name);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 16 Extended: Area Delete Round-Trip - For any created area, deleting should remove it from the list', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate area name
    const areaName = PropertyTest.string({ minLength: 1, maxLength: 100 });
    const areaData = { name: areaName };
    
    // Create area
    const createdArea = await AreaService.create(areaData);
    
    // Verify area exists
    let allAreas = await AreaService.getAll();
    expect(allAreas.find(area => area.id === createdArea.id)).toBeDefined();
    
    // Delete the area
    await AreaService.delete(createdArea.id);
    
    // Verify area is removed
    allAreas = await AreaService.getAll();
    const foundArea = allAreas.find(area => area.id === createdArea.id);
    expect(foundArea).toBeUndefined();
    
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