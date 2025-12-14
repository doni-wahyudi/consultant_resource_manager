/**
 * Property-based tests for Client-Project Association
 * **Feature: consultant-resource-manager, Property 22: Client-Project Association**
 * **Validates: Requirements 10.1, 10.2**
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
  mockData: { clients: [], projects: [] },
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
              
              // Add default values for projects
              if (table === 'projects') {
                newItem.status = newItem.status || 'in_progress';
                newItem.is_paid = newItem.is_paid || false;
                newItem.color = newItem.color || '#4f46e5';
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
            return { data: null, error: null };
          }
        })
      })
    };
  },
  
  _reset() {
    this.mockData = { clients: [], projects: [] };
    this.shouldReturnClient = true;
  }
};

// Make mocks globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;

// Load the services
const ClientService = require('../../js/services/clients.js');
const ProjectService = require('../../js/services/projects.js');

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 22: Client-Project Association - For any project created with a client_id, fetching projects by that client_id SHALL include the created project', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Generate client data
    const clientName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const clientData = { 
      name: clientName,
      contact_email: `${clientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      contact_phone: '+1234567890',
      notes: 'Test client notes'
    };
    
    // Create the client
    const createdClient = await ClientService.create(clientData);
    expect(createdClient).toBeDefined();
    expect(createdClient.id).toBeDefined();
    expect(createdClient.name).toBe(clientData.name);
    
    // Generate project data with client association
    const projectName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const projectData = {
      name: projectName,
      description: 'Test project description',
      client_id: createdClient.id,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      budget: 50000
    };
    
    // Create the project
    const createdProject = await ProjectService.create(projectData);
    expect(createdProject).toBeDefined();
    expect(createdProject.id).toBeDefined();
    expect(createdProject.name).toBe(projectData.name);
    expect(createdProject.client_id).toBe(createdClient.id);
    
    // Fetch projects by client ID
    const clientProjects = await ProjectService.getByClient(createdClient.id);
    expect(clientProjects).toBeDefined();
    
    // Verify the created project is in the client's projects list
    const foundProject = clientProjects.find(project => project.id === createdProject.id);
    expect(foundProject).toBeDefined();
    expect(foundProject.name).toBe(projectData.name);
    expect(foundProject.client_id).toBe(createdClient.id);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 22 Extended: Multiple Projects per Client - For any client with multiple projects, fetching by client_id SHALL return all associated projects', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Create a client
    const clientName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const clientData = { 
      name: clientName,
      contact_email: `${clientName.toLowerCase().replace(/\s+/g, '')}@example.com`
    };
    const createdClient = await ClientService.create(clientData);
    
    // Create multiple projects for this client
    const numProjects = Math.floor(Math.random() * 5) + 2; // 2-6 projects
    const createdProjects = [];
    
    for (let i = 0; i < numProjects; i++) {
      const projectName = PropertyTest.string({ minLength: 1, maxLength: 200 });
      const projectData = {
        name: `${projectName} ${i}`,
        description: `Test project ${i}`,
        client_id: createdClient.id
      };
      
      const project = await ProjectService.create(projectData);
      createdProjects.push(project);
    }
    
    // Fetch projects by client ID
    const clientProjects = await ProjectService.getByClient(createdClient.id);
    
    // Verify all created projects are returned
    expect(clientProjects.length).toBe(numProjects);
    
    for (const createdProject of createdProjects) {
      const foundProject = clientProjects.find(p => p.id === createdProject.id);
      expect(foundProject).toBeDefined();
      expect(foundProject.client_id).toBe(createdClient.id);
    }
    
    return true;
  }, { numRuns: 50 }); // Fewer runs for this more complex test
});

testSuite.test('Property 22 Extended: Client without Projects - For any client with no projects, fetching by client_id SHALL return empty array', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    
    // Create a client
    const clientName = PropertyTest.string({ minLength: 1, maxLength: 200 });
    const clientData = { 
      name: clientName,
      contact_email: `${clientName.toLowerCase().replace(/\s+/g, '')}@example.com`
    };
    const createdClient = await ClientService.create(clientData);
    
    // Fetch projects by client ID (should be empty)
    const clientProjects = await ProjectService.getByClient(createdClient.id);
    
    // Verify no projects are returned
    expect(clientProjects.length).toBe(0);
    
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