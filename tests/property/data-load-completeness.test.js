/**
 * Property-based tests for Initial Data Load Completeness
 * **Feature: consultant-resource-manager, Property 23: Initial Data Load Completeness**
 * **Validates: Requirements 11.2**
 */

// Load the simple test framework
const { SimpleTest, PropertyTest, expect } = require('../simple-test-runner.js');

// Mock StateManager
const StateManager = {
  state: {},
  getState(key) {
    const keys = key.split('.');
    let current = this.state;
    for (const k of keys) {
      if (current === undefined) return undefined;
      current = current[k];
    }
    return current;
  },
  setState(key, value) {
    const keys = key.split('.');
    let current = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  },
  _reset() {
    this.state = {};
  }
};

// Mock database data
let mockDbData = {
  areas: [],
  clients: [],
  talents: [],
  projects: [],
  allocations: []
};

// Mock SupabaseService
const SupabaseService = {
  shouldReturnClient: true,
  shouldFail: {},
  
  getClient() {
    if (!this.shouldReturnClient) return null;
    
    const self = this;
    return {
      from: (table) => ({
        select: (columns = '*') => ({
          order: (column) => ({
            then: (resolve) => {
              if (self.shouldFail[table]) {
                resolve({ data: null, error: new Error(`Failed to load ${table}`) });
              } else {
                resolve({ data: mockDbData[table] || [], error: null });
              }
            }
          }),
          single: () => {
            const data = mockDbData[table] && mockDbData[table].length > 0 ? mockDbData[table][0] : null;
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
              mockDbData[table] = [...(mockDbData[table] || []), newItem];
              return { data: newItem, error: null };
            }
          })
        }),
        update: (updateData) => ({
          eq: (column, value) => ({
            select: () => ({
              single: () => {
                const items = mockDbData[table] || [];
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
            const items = mockDbData[table] || [];
            mockDbData[table] = items.filter(item => item[column] !== value);
            return { data: null, error: null };
          }
        })
      })
    };
  },
  
  _reset() {
    this.shouldReturnClient = true;
    this.shouldFail = {};
  }
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load services
const AreaService = require('../../js/services/areas.js');
const ClientService = require('../../js/services/clients.js');
const TalentService = require('../../js/services/talents.js');
const ProjectService = require('../../js/services/projects.js');
const AllocationService = require('../../js/services/allocations.js');

// Make services globally available
global.AreaService = AreaService;
global.ClientService = ClientService;
global.TalentService = TalentService;
global.ProjectService = ProjectService;
global.AllocationService = AllocationService;

// Load DataLoader
const DataLoader = require('../../js/services/dataLoader.js');

// Helper to generate random data
function generateRandomData() {
  const numAreas = Math.floor(Math.random() * 5) + 1;
  const numClients = Math.floor(Math.random() * 5) + 1;
  const numTalents = Math.floor(Math.random() * 5) + 1;
  const numProjects = Math.floor(Math.random() * 5) + 1;
  const numAllocations = Math.floor(Math.random() * 5) + 1;
  
  const areas = [];
  for (let i = 0; i < numAreas; i++) {
    areas.push({
      id: `area-${i}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Area ${i}`,
      created_at: new Date().toISOString()
    });
  }
  
  const clients = [];
  for (let i = 0; i < numClients; i++) {
    clients.push({
      id: `client-${i}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Client ${i}`,
      contact_email: `client${i}@example.com`,
      created_at: new Date().toISOString()
    });
  }
  
  const talents = [];
  for (let i = 0; i < numTalents; i++) {
    talents.push({
      id: `talent-${i}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Talent ${i}`,
      email: `talent${i}@example.com`,
      skills: ['Skill A', 'Skill B'],
      talent_areas: [],
      created_at: new Date().toISOString()
    });
  }
  
  const projects = [];
  for (let i = 0; i < numProjects; i++) {
    projects.push({
      id: `project-${i}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Project ${i}`,
      client_id: clients[i % clients.length].id,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      status: 'in_progress',
      is_paid: false,
      created_at: new Date().toISOString()
    });
  }
  
  const allocations = [];
  for (let i = 0; i < numAllocations; i++) {
    allocations.push({
      id: `allocation-${i}-${Math.random().toString(36).substr(2, 9)}`,
      talent_id: talents[i % talents.length].id,
      project_id: projects[i % projects.length].id,
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      created_at: new Date().toISOString()
    });
  }
  
  return { areas, clients, talents, projects, allocations };
}

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 23: Initial Data Load Completeness - For any database state, loading the application SHALL retrieve all talents, projects, allocations, areas, and clients', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate random database data
    const dbData = generateRandomData();
    mockDbData = { ...dbData };
    
    // Load all data using DataLoader
    const result = await DataLoader.loadAll();
    
    // Verify all data types were loaded
    expect(result.areas).toBeDefined();
    expect(result.clients).toBeDefined();
    expect(result.talents).toBeDefined();
    expect(result.projects).toBeDefined();
    expect(result.allocations).toBeDefined();
    
    // Verify counts match
    if (result.areas.length !== dbData.areas.length) {
      throw new Error(`Areas count mismatch: expected ${dbData.areas.length}, got ${result.areas.length}`);
    }
    if (result.clients.length !== dbData.clients.length) {
      throw new Error(`Clients count mismatch: expected ${dbData.clients.length}, got ${result.clients.length}`);
    }
    if (result.projects.length !== dbData.projects.length) {
      throw new Error(`Projects count mismatch: expected ${dbData.projects.length}, got ${result.projects.length}`);
    }
    if (result.allocations.length !== dbData.allocations.length) {
      throw new Error(`Allocations count mismatch: expected ${dbData.allocations.length}, got ${result.allocations.length}`);
    }
    
    // Verify state was updated
    const stateAreas = StateManager.getState('areas');
    const stateClients = StateManager.getState('clients');
    const stateTalents = StateManager.getState('talents');
    const stateProjects = StateManager.getState('projects');
    const stateAllocations = StateManager.getState('allocations');
    
    if (!Array.isArray(stateAreas) || stateAreas.length !== dbData.areas.length) {
      throw new Error('State areas not properly updated');
    }
    if (!Array.isArray(stateClients) || stateClients.length !== dbData.clients.length) {
      throw new Error('State clients not properly updated');
    }
    if (!Array.isArray(stateProjects) || stateProjects.length !== dbData.projects.length) {
      throw new Error('State projects not properly updated');
    }
    if (!Array.isArray(stateAllocations) || stateAllocations.length !== dbData.allocations.length) {
      throw new Error('State allocations not properly updated');
    }
    
    // Verify all IDs are present
    for (const area of dbData.areas) {
      if (!result.areas.find(a => a.id === area.id)) {
        throw new Error(`Area ${area.id} not found in loaded data`);
      }
    }
    for (const client of dbData.clients) {
      if (!result.clients.find(c => c.id === client.id)) {
        throw new Error(`Client ${client.id} not found in loaded data`);
      }
    }
    for (const project of dbData.projects) {
      if (!result.projects.find(p => p.id === project.id)) {
        throw new Error(`Project ${project.id} not found in loaded data`);
      }
    }
    for (const allocation of dbData.allocations) {
      if (!result.allocations.find(a => a.id === allocation.id)) {
        throw new Error(`Allocation ${allocation.id} not found in loaded data`);
      }
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 23 Extended: isDataLoaded returns true after successful load', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate random database data
    const dbData = generateRandomData();
    mockDbData = { ...dbData };
    
    // Before loading, isDataLoaded should return false
    if (DataLoader.isDataLoaded()) {
      throw new Error('isDataLoaded should return false before loading');
    }
    
    // Load all data
    await DataLoader.loadAll();
    
    // After loading, isDataLoaded should return true
    if (!DataLoader.isDataLoaded()) {
      throw new Error('isDataLoaded should return true after loading');
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 23 Extended: Reload specific data type updates state correctly', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate initial data
    const initialData = generateRandomData();
    mockDbData = { ...initialData };
    
    // Load all data
    await DataLoader.loadAll();
    
    // Add new area to mock database
    const newArea = {
      id: `new-area-${Math.random().toString(36).substr(2, 9)}`,
      name: 'New Area',
      created_at: new Date().toISOString()
    };
    mockDbData.areas.push(newArea);
    
    // Reload areas
    const result = await DataLoader.reload('areas');
    
    // Verify new area is in result
    if (!result.data.find(a => a.id === newArea.id)) {
      throw new Error('New area not found after reload');
    }
    
    // Verify state was updated
    const stateAreas = StateManager.getState('areas');
    if (!stateAreas.find(a => a.id === newArea.id)) {
      throw new Error('New area not found in state after reload');
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
