/**
 * Property-based tests for Talent CRUD operations
 * **Feature: consultant-resource-manager, Property 1: Talent CRUD Round-Trip Consistency**
 * **Feature: consultant-resource-manager, Property 2: Talent Update Persistence**
 * **Feature: consultant-resource-manager, Property 3: Talent Deletion Completeness**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
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
  mockData: { talents: [], talent_areas: [] },
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
              let data = items.find(item => item[column] === value);
              
              // For talents, add talent_areas relationship
              if (table === 'talents' && data) {
                const talentAreas = this.mockData.talent_areas || [];
                data = {
                  ...data,
                  talent_areas: talentAreas.filter(ta => ta.talent_id === data.id)
                };
              }
              
              return { data: data || null, error: data ? null : new Error('No data found') };
            }
          }),
          single: () => {
            const items = this.mockData[table] || [];
            let data = items.length > 0 ? items[0] : null;
            
            // For talents, add talent_areas relationship
            if (table === 'talents' && data) {
              const talentAreas = this.mockData.talent_areas || [];
              data = {
                ...data,
                talent_areas: talentAreas.filter(ta => ta.talent_id === data.id)
              };
            }
            
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
              
              // Add default values for talents
              if (table === 'talents') {
                newItem.skills = newItem.skills || [];
                newItem.areas = [];
              }
              
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
            
            // For talents, also remove from talent_areas
            if (table === 'talents') {
              this.mockData.talent_areas = (this.mockData.talent_areas || []).filter(ta => ta.talent_id !== value);
            }
            
            return { data: null, error: null };
          }
        })
      })
    };
  },
  
  _reset() {
    this.mockData = { talents: [], talent_areas: [] };
    this.shouldReturnClient = true;
  }
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load the Talent service
const TalentService = require('../../js/services/talents.js');

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 1: Talent CRUD Round-Trip Consistency - For any valid talent data, creating a talent and then fetching all talents SHALL return a list containing a talent with matching data fields', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate valid talent data
    const talentName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const talentEmail = `${talentName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const talentPhone = '+1234567890';
    const talentSkills = [
      PropertyTest.string({ minLength: 1, maxLength: 50 }),
      PropertyTest.string({ minLength: 1, maxLength: 50 })
    ];
    
    const talentData = {
      name: talentName,
      email: talentEmail,
      phone: talentPhone,
      skills: talentSkills,
      notes: 'Test talent notes'
    };
    
    // Create the talent
    const createdTalent = await TalentService.create(talentData);
    
    // Verify the talent was created with expected properties
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    expect(createdTalent.name).toBe(talentData.name);
    expect(createdTalent.email).toBe(talentData.email);
    expect(createdTalent.phone).toBe(talentData.phone);
    expect(createdTalent.created_at).toBeDefined();
    
    // Fetch all talents
    const allTalents = await TalentService.getAll();
    
    // Verify the created talent is in the list with matching data
    const foundTalent = allTalents.find(talent => talent.id === createdTalent.id);
    expect(foundTalent).toBeDefined();
    expect(foundTalent.name).toBe(talentData.name);
    expect(foundTalent.email).toBe(talentData.email);
    expect(foundTalent.phone).toBe(talentData.phone);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 2: Talent Update Persistence - For any existing talent and any valid modification, updating the talent and then fetching it by ID SHALL return the modified data', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate initial talent data
    const originalName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const originalEmail = `${originalName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const originalData = {
      name: originalName,
      email: originalEmail,
      phone: '+1234567890',
      skills: ['JavaScript', 'React'],
      notes: 'Original notes'
    };
    
    // Create initial talent
    const createdTalent = await TalentService.create(originalData);
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    
    // Generate updated data
    const updatedName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const updatedEmail = `${updatedName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const updatedSkills = [
      PropertyTest.string({ minLength: 1, maxLength: 50 }),
      PropertyTest.string({ minLength: 1, maxLength: 50 }),
      PropertyTest.string({ minLength: 1, maxLength: 50 })
    ];
    
    const updateData = {
      name: updatedName,
      email: updatedEmail,
      phone: '+9876543210',
      skills: updatedSkills,
      notes: 'Updated notes'
    };
    
    // Update the talent
    const updatedTalent = await TalentService.update(createdTalent.id, updateData);
    
    // Verify update was successful
    expect(updatedTalent).toBeDefined();
    expect(updatedTalent.id).toBe(createdTalent.id);
    expect(updatedTalent.name).toBe(updateData.name);
    expect(updatedTalent.email).toBe(updateData.email);
    expect(updatedTalent.phone).toBe(updateData.phone);
    expect(updatedTalent.updated_at).toBeDefined();
    
    // Fetch the talent by ID and verify the update persisted
    const fetchedTalent = await TalentService.getById(createdTalent.id);
    expect(fetchedTalent).toBeDefined();
    expect(fetchedTalent.id).toBe(createdTalent.id);
    expect(fetchedTalent.name).toBe(updateData.name);
    expect(fetchedTalent.email).toBe(updateData.email);
    expect(fetchedTalent.phone).toBe(updateData.phone);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 3: Talent Deletion Completeness - For any existing talent, deleting the talent and then fetching all talents SHALL return a list that does not contain that talent\'s ID', async () => {
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
      skills: ['JavaScript', 'Node.js'],
      notes: 'Test talent for deletion'
    };
    
    // Create talent
    const createdTalent = await TalentService.create(talentData);
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    
    // Verify talent exists in the list
    let allTalents = await TalentService.getAll();
    const foundBeforeDelete = allTalents.find(talent => talent.id === createdTalent.id);
    expect(foundBeforeDelete).toBeDefined();
    
    // Delete the talent
    await TalentService.delete(createdTalent.id);
    
    // Verify talent is removed from the list
    allTalents = await TalentService.getAll();
    const foundAfterDelete = allTalents.find(talent => talent.id === createdTalent.id);
    expect(foundAfterDelete).toBeUndefined();
    
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