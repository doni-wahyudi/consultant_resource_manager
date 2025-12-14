/**
 * Property-based tests for Project color uniqueness
 * **Feature: consultant-resource-manager, Property 6: Project Color Uniqueness**
 * **Validates: Requirements 3.1, 3.5**
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

testSuite.test('Property 6: Project Color Uniqueness - For any set of projects, each project SHALL have a unique color value that differs from all other projects', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear(); // Reset used colors tracking
    
    // Generate a random number of projects (2-10 to test uniqueness)
    const numProjects = Math.floor(Math.random() * 9) + 2;
    const createdProjects = [];
    
    // Create multiple projects
    for (let i = 0; i < numProjects; i++) {
      const projectData = {
        name: PropertyTest.string({ minLength: 1, maxLength: 200 }),
        description: PropertyTest.string({ minLength: 0, maxLength: 500 })
      };
      
      const createdProject = await ProjectService.create(projectData);
      expect(createdProject).toBeDefined();
      expect(createdProject.color).toBeDefined();
      expect(typeof createdProject.color).toBe('string');
      expect(createdProject.color).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
      
      createdProjects.push(createdProject);
    }
    
    // Verify all colors are unique
    const colors = createdProjects.map(p => p.color);
    const uniqueColors = new Set(colors);
    
    if (colors.length !== uniqueColors.size) {
      throw new Error(`Color uniqueness violated: ${colors.length} projects but only ${uniqueColors.size} unique colors. Colors: ${colors.join(', ')}`);
    }
    
    // Verify each color is different from all others
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        if (colors[i] === colors[j]) {
          throw new Error(`Duplicate colors found: projects ${i} and ${j} both have color ${colors[i]}`);
        }
      }
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 6 Extended: Color Generation Consistency - generateColor() should always return unique colors when called multiple times', async () => {
  await PropertyTest.assert(async () => {
    // Reset used colors tracking
    ProjectService.usedColors.clear();
    
    // Generate multiple colors
    const numColors = Math.floor(Math.random() * 20) + 5; // 5-24 colors
    const generatedColors = [];
    
    for (let i = 0; i < numColors; i++) {
      const color = ProjectService.generateColor();
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/); // Valid hex color
      
      generatedColors.push(color);
    }
    
    // Verify all generated colors are unique
    const uniqueColors = new Set(generatedColors);
    if (generatedColors.length !== uniqueColors.size) {
      throw new Error(`Generated color uniqueness violated: ${generatedColors.length} colors generated but only ${uniqueColors.size} unique. Colors: ${generatedColors.join(', ')}`);
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 6 Extended: Color Persistence After Project Creation - Colors should remain unique even after fetching all projects', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Create several projects
    const numProjects = Math.floor(Math.random() * 8) + 3; // 3-10 projects
    const projectIds = [];
    
    for (let i = 0; i < numProjects; i++) {
      const projectData = {
        name: `Project ${i} - ${PropertyTest.string({ minLength: 5, maxLength: 50 })}`,
        description: PropertyTest.string({ minLength: 0, maxLength: 200 })
      };
      
      const created = await ProjectService.create(projectData);
      projectIds.push(created.id);
    }
    
    // Fetch all projects
    const allProjects = await ProjectService.getAll();
    expect(allProjects.length).toBe(numProjects);
    
    // Verify color uniqueness in the fetched projects
    const colors = allProjects.map(p => p.color);
    const uniqueColors = new Set(colors);
    
    if (colors.length !== uniqueColors.size) {
      throw new Error(`Color uniqueness violated after fetch: ${colors.length} projects but only ${uniqueColors.size} unique colors`);
    }
    
    // Verify usedColors set is properly maintained
    expect(ProjectService.usedColors.size).toBe(numProjects);
    
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