/**
 * Property-based tests for Area Deletion Cascade
 * **Feature: consultant-resource-manager, Property 17: Area Deletion Cascade**
 * **Validates: Requirements 7.3**
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
    this.state = {
      areas: [],
      talents: []
    };
  }
};

// Mock SupabaseService with talent_areas support
const SupabaseService = {
  mockData: { 
    areas: [],
    talents: [],
    talent_areas: []
  },
  shouldReturnClient: true,
  
  getClient() {
    if (!this.shouldReturnClient) return null;
    
    const self = this;
    return {
      from: (table) => ({
        select: (columns = '*') => ({
          order: (column) => ({
            then: (resolve) => resolve({ data: self.mockData[table] || [], error: null })
          }),
          eq: (column, value) => ({
            single: () => {
              const items = self.mockData[table] || [];
              const item = items.find(i => i[column] === value);
              return { data: item || null, error: item ? null : new Error('Not found') };
            }
          }),
          single: () => {
            const data = self.mockData[table] && self.mockData[table].length > 0 ? self.mockData[table][0] : null;
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
              self.mockData[table] = [...(self.mockData[table] || []), newItem];
              return { data: newItem, error: null };
            }
          })
        }),
        update: (updateData) => ({
          eq: (column, value) => ({
            select: () => ({
              single: () => {
                const items = self.mockData[table] || [];
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
            const items = self.mockData[table] || [];
            self.mockData[table] = items.filter(item => item[column] !== value);
            return { data: null, error: null };
          }
        })
      })
    };
  },
  
  _reset() {
    this.mockData = { 
      areas: [],
      talents: [],
      talent_areas: []
    };
    this.shouldReturnClient = false; // Use local state mode for testing
  }
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load the Area service
const AreaService = require('../../js/services/areas.js');

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 17: Area Deletion Cascade - For any area assigned to talents, deleting the area SHALL remove that area from all talent_areas records', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate random area name
    const areaName = PropertyTest.string({ minLength: 1, maxLength: 50 });
    
    // Create an area
    const createdArea = await AreaService.create({ name: areaName });
    expect(createdArea).toBeDefined();
    expect(createdArea.id).toBeDefined();
    
    // Create multiple talents with this area assigned
    const numTalents = Math.floor(Math.random() * 5) + 1; // 1-5 talents
    const talents = [];
    
    for (let i = 0; i < numTalents; i++) {
      const talent = {
        id: 'talent-' + Math.random().toString(36).substr(2, 9),
        name: PropertyTest.string({ minLength: 1, maxLength: 50 }),
        email: `test${i}@example.com`,
        skills: [],
        areas: [createdArea.id], // Assign the area to this talent
        created_at: new Date().toISOString()
      };
      talents.push(talent);
    }
    
    // Also add some talents without this area (to verify they're not affected)
    const otherAreaId = 'other-area-' + Math.random().toString(36).substr(2, 9);
    const talentWithoutArea = {
      id: 'talent-no-area-' + Math.random().toString(36).substr(2, 9),
      name: PropertyTest.string({ minLength: 1, maxLength: 50 }),
      email: 'noarea@example.com',
      skills: [],
      areas: [otherAreaId], // Different area
      created_at: new Date().toISOString()
    };
    talents.push(talentWithoutArea);
    
    // Set talents in state
    StateManager.setState('talents', talents);
    
    // Verify talents have the area before deletion
    const talentsBefore = StateManager.getState('talents');
    const talentsWithAreaBefore = talentsBefore.filter(t => t.areas.includes(createdArea.id));
    expect(talentsWithAreaBefore.length).toBe(numTalents);
    
    // Delete the area
    await AreaService.delete(createdArea.id);
    
    // Verify the area is removed from all talents
    const talentsAfter = StateManager.getState('talents');
    const talentsWithAreaAfter = talentsAfter.filter(t => t.areas.includes(createdArea.id));
    
    // No talent should have the deleted area
    if (talentsWithAreaAfter.length !== 0) {
      throw new Error(`Expected 0 talents with deleted area, but found ${talentsWithAreaAfter.length}`);
    }
    
    // Verify other areas are not affected
    const talentWithOtherArea = talentsAfter.find(t => t.id === talentWithoutArea.id);
    expect(talentWithOtherArea).toBeDefined();
    if (!talentWithOtherArea.areas.includes(otherAreaId)) {
      throw new Error('Other area was incorrectly removed');
    }
    
    // Verify the area itself is deleted
    const areasAfter = StateManager.getState('areas');
    const deletedArea = areasAfter.find(a => a.id === createdArea.id);
    if (deletedArea !== undefined) {
      throw new Error('Area was not deleted');
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 17 Extended: Area Deletion Cascade preserves talent records - Talents should still exist after area deletion', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate random area name
    const areaName = PropertyTest.string({ minLength: 1, maxLength: 50 });
    
    // Create an area
    const createdArea = await AreaService.create({ name: areaName });
    
    // Create talents with this area
    const numTalents = Math.floor(Math.random() * 3) + 1;
    const talents = [];
    
    for (let i = 0; i < numTalents; i++) {
      const talent = {
        id: 'talent-' + Math.random().toString(36).substr(2, 9),
        name: PropertyTest.string({ minLength: 1, maxLength: 50 }),
        email: `test${i}@example.com`,
        skills: [],
        areas: [createdArea.id],
        created_at: new Date().toISOString()
      };
      talents.push(talent);
    }
    
    StateManager.setState('talents', talents);
    
    const talentCountBefore = StateManager.getState('talents').length;
    
    // Delete the area
    await AreaService.delete(createdArea.id);
    
    // Verify talent count is preserved (talents are not deleted, only area association)
    const talentCountAfter = StateManager.getState('talents').length;
    
    if (talentCountAfter !== talentCountBefore) {
      throw new Error(`Talent count changed from ${talentCountBefore} to ${talentCountAfter}`);
    }
    
    // Verify each talent still exists with their other properties intact
    const talentsAfter = StateManager.getState('talents');
    for (const originalTalent of talents) {
      const foundTalent = talentsAfter.find(t => t.id === originalTalent.id);
      expect(foundTalent).toBeDefined();
      if (foundTalent.name !== originalTalent.name) {
        throw new Error('Talent name was modified');
      }
      if (foundTalent.email !== originalTalent.email) {
        throw new Error('Talent email was modified');
      }
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 17 Extended: Area Deletion with multiple areas - Only the deleted area is removed from talents', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Create two areas
    const area1 = await AreaService.create({ name: PropertyTest.string({ minLength: 1, maxLength: 50 }) });
    const area2 = await AreaService.create({ name: PropertyTest.string({ minLength: 1, maxLength: 50 }) });
    
    // Create a talent with both areas
    const talent = {
      id: 'talent-' + Math.random().toString(36).substr(2, 9),
      name: PropertyTest.string({ minLength: 1, maxLength: 50 }),
      email: 'multi@example.com',
      skills: [],
      areas: [area1.id, area2.id], // Both areas assigned
      created_at: new Date().toISOString()
    };
    
    StateManager.setState('talents', [talent]);
    
    // Verify talent has both areas
    const talentBefore = StateManager.getState('talents')[0];
    if (talentBefore.areas.length !== 2) {
      throw new Error('Talent should have 2 areas before deletion');
    }
    
    // Delete area1
    await AreaService.delete(area1.id);
    
    // Verify only area1 is removed, area2 remains
    const talentAfter = StateManager.getState('talents')[0];
    
    if (talentAfter.areas.includes(area1.id)) {
      throw new Error('Deleted area1 should be removed from talent');
    }
    
    if (!talentAfter.areas.includes(area2.id)) {
      throw new Error('Area2 should still be assigned to talent');
    }
    
    if (talentAfter.areas.length !== 1) {
      throw new Error(`Talent should have 1 area after deletion, but has ${talentAfter.areas.length}`);
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
