/**
 * Property-based tests for Talent Modifications
 * **Feature: consultant-resource-manager, Property 13: Talent Skills Modification Persistence**
 * **Feature: consultant-resource-manager, Property 14: Talent Area Assignment Persistence**
 * **Validates: Requirements 6.2, 6.3**
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
          }),
          then: (resolve) => {
            // Handle talent_areas inserts
            if (table === 'talent_areas') {
              const newItem = { ...data[0] };
              this.mockData[table] = [...(this.mockData[table] || []), newItem];
              return resolve({ data: newItem, error: null });
            }
            return resolve({ data: null, error: null });
          }
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
          eq: (column, value) => ({
            eq: (column2, value2) => {
              // Handle talent_areas deletion with two conditions
              if (table === 'talent_areas') {
                this.mockData[table] = (this.mockData[table] || []).filter(item => 
                  !(item[column] === value && item[column2] === value2)
                );
              }
              return { data: null, error: null };
            }
          })
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

testSuite.test('Property 13: Talent Skills Modification Persistence - For any talent and any skill string, adding the skill and then fetching the talent SHALL include that skill in the skills array', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate initial talent data
    const talentName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const talentEmail = `${talentName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const initialSkills = [
      PropertyTest.string({ minLength: 1, maxLength: 50 }),
      PropertyTest.string({ minLength: 1, maxLength: 50 })
    ];
    
    const talentData = {
      name: talentName,
      email: talentEmail,
      phone: '+1234567890',
      skills: initialSkills,
      notes: 'Test talent for skill modification'
    };
    
    // Create the talent
    const createdTalent = await TalentService.create(talentData);
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    
    // Generate a new skill to add
    const newSkill = PropertyTest.string({ minLength: 1, maxLength: 50 });
    
    // Add the skill
    const updatedTalent = await TalentService.addSkill(createdTalent.id, newSkill);
    
    // Verify the skill was added
    expect(updatedTalent).toBeDefined();
    expect(updatedTalent.skills).toBeDefined();
    expect(updatedTalent.skills.includes(newSkill)).toBe(true);
    
    // Fetch the talent and verify the skill persisted
    const fetchedTalent = await TalentService.getById(createdTalent.id);
    expect(fetchedTalent).toBeDefined();
    expect(fetchedTalent.skills).toBeDefined();
    expect(fetchedTalent.skills.includes(newSkill)).toBe(true);
    
    // Verify original skills are still there
    for (const originalSkill of initialSkills) {
      expect(fetchedTalent.skills.includes(originalSkill)).toBe(true);
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 13 (Remove): Talent Skills Removal Persistence - For any talent with existing skills, removing a skill and then fetching the talent SHALL NOT include that skill in the skills array', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate initial talent data with multiple skills
    const talentName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const talentEmail = `${talentName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const skill1 = PropertyTest.string({ minLength: 1, maxLength: 50 });
    const skill2 = PropertyTest.string({ minLength: 1, maxLength: 50 });
    const skill3 = PropertyTest.string({ minLength: 1, maxLength: 50 });
    const initialSkills = [skill1, skill2, skill3];
    
    const talentData = {
      name: talentName,
      email: talentEmail,
      phone: '+1234567890',
      skills: initialSkills,
      notes: 'Test talent for skill removal'
    };
    
    // Create the talent
    const createdTalent = await TalentService.create(talentData);
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    
    // Remove the second skill
    const skillToRemove = skill2;
    const updatedTalent = await TalentService.removeSkill(createdTalent.id, skillToRemove);
    
    // Verify the skill was removed
    expect(updatedTalent).toBeDefined();
    expect(updatedTalent.skills).toBeDefined();
    expect(updatedTalent.skills.includes(skillToRemove)).toBe(false);
    
    // Fetch the talent and verify the skill removal persisted
    const fetchedTalent = await TalentService.getById(createdTalent.id);
    expect(fetchedTalent).toBeDefined();
    expect(fetchedTalent.skills).toBeDefined();
    expect(fetchedTalent.skills.includes(skillToRemove)).toBe(false);
    
    // Verify other skills are still there
    expect(fetchedTalent.skills.includes(skill1)).toBe(true);
    expect(fetchedTalent.skills.includes(skill3)).toBe(true);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 14: Talent Area Assignment Persistence - For any talent and any valid area, assigning the area and then fetching the talent\'s areas SHALL include that area', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate initial talent data
    const talentName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const talentEmail = `${talentName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    
    const talentData = {
      name: talentName,
      email: talentEmail,
      phone: '+1234567890',
      skills: ['JavaScript', 'React'],
      notes: 'Test talent for area assignment'
    };
    
    // Create the talent
    const createdTalent = await TalentService.create(talentData);
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    
    // Generate an area ID to assign
    const areaId = 'test-area-' + Math.random().toString(36).substr(2, 9);
    
    // Assign the area
    await TalentService.assignArea(createdTalent.id, areaId);
    
    // Fetch the talent and verify the area was assigned
    const fetchedTalent = await TalentService.getById(createdTalent.id);
    expect(fetchedTalent).toBeDefined();
    expect(fetchedTalent.areas).toBeDefined();
    expect(fetchedTalent.areas.includes(areaId)).toBe(true);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 14 (Remove): Talent Area Removal Persistence - For any talent with assigned areas, removing an area and then fetching the talent SHALL NOT include that area in the areas array', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate initial talent data
    const talentName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const talentEmail = `${talentName.toLowerCase().replace(/\s+/g, '')}@example.com`;
    
    const talentData = {
      name: talentName,
      email: talentEmail,
      phone: '+1234567890',
      skills: ['JavaScript', 'React'],
      notes: 'Test talent for area removal'
    };
    
    // Create the talent
    const createdTalent = await TalentService.create(talentData);
    expect(createdTalent).toBeDefined();
    expect(createdTalent.id).toBeDefined();
    
    // Generate area IDs to assign
    const area1Id = 'test-area-1-' + Math.random().toString(36).substr(2, 9);
    const area2Id = 'test-area-2-' + Math.random().toString(36).substr(2, 9);
    
    // Assign both areas
    await TalentService.assignArea(createdTalent.id, area1Id);
    await TalentService.assignArea(createdTalent.id, area2Id);
    
    // Verify both areas are assigned
    let fetchedTalent = await TalentService.getById(createdTalent.id);
    expect(fetchedTalent.areas.includes(area1Id)).toBe(true);
    expect(fetchedTalent.areas.includes(area2Id)).toBe(true);
    
    // Remove the first area
    await TalentService.removeArea(createdTalent.id, area1Id);
    
    // Fetch the talent and verify the area was removed
    fetchedTalent = await TalentService.getById(createdTalent.id);
    expect(fetchedTalent).toBeDefined();
    expect(fetchedTalent.areas).toBeDefined();
    expect(fetchedTalent.areas.includes(area1Id)).toBe(false);
    
    // Verify the other area is still there
    expect(fetchedTalent.areas.includes(area2Id)).toBe(true);
    
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