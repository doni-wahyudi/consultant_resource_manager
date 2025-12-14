/**
 * Property-based tests for Project cascade delete
 * **Feature: consultant-resource-manager, Property 7: Project Cascade Delete**
 * **Validates: Requirements 3.3**
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
  mockData: { projects: [], allocations: [], talents: [] },
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
          },
          eq: (column, value) => ({
            single: () => {
              const items = this.mockData[table] || [];
              const item = items.find(item => item[column] === value);
              return { data: item || null, error: item ? null : new Error('Item not found') };
            }
          })
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
            
            // Simulate CASCADE DELETE behavior for allocations when project is deleted
            if (table === 'projects') {
              this.mockData.allocations = (this.mockData.allocations || []).filter(
                allocation => allocation.project_id !== value
              );
            }
            
            return { data: null, error: null };
          }
        })
      })
    };
  },
  
  _reset() {
    this.mockData = { projects: [], allocations: [], talents: [] };
    this.shouldReturnClient = true;
  }
};

// Load the services
const ProjectService = require('../../js/services/projects.js');
const AllocationService = require('../../js/services/allocations.js');

// Make mocks and services globally available
global.StateManager = StateManager;
global.SupabaseService = SupabaseService;
global.AllocationService = AllocationService;

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 7: Project Cascade Delete - For any project with associated allocations, deleting the project SHALL also remove all allocations referencing that project', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Create a project
    const projectData = {
      name: PropertyTest.string({ minLength: 1, maxLength: 200 }),
      description: PropertyTest.string({ minLength: 0, maxLength: 500 })
    };
    
    const createdProject = await ProjectService.create(projectData);
    expect(createdProject).toBeDefined();
    expect(createdProject.id).toBeDefined();
    
    // Create a talent for allocations
    const talentData = {
      id: 'test-talent-' + Math.random().toString(36).substr(2, 9),
      name: PropertyTest.string({ minLength: 1, maxLength: 200 }),
      email: PropertyTest.string({ minLength: 5, maxLength: 100 }) + '@example.com',
      created_at: new Date().toISOString()
    };
    SupabaseService.mockData.talents.push(talentData);
    StateManager.setState('talents', [talentData]);
    
    // Create random number of allocations for this project (1-5)
    const numAllocations = Math.floor(Math.random() * 5) + 1;
    const createdAllocations = [];
    
    for (let i = 0; i < numAllocations; i++) {
      const startDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const endDate = new Date(startDate.getTime() + (Math.floor(Math.random() * 30) + 1) * 24 * 60 * 60 * 1000);
      
      const allocationData = {
        talent_id: talentData.id,
        project_id: createdProject.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        notes: PropertyTest.string({ minLength: 0, maxLength: 200 })
      };
      
      const createdAllocation = await AllocationService.create(allocationData);
      expect(createdAllocation).toBeDefined();
      expect(createdAllocation.project_id).toBe(createdProject.id);
      
      createdAllocations.push(createdAllocation);
    }
    
    // Verify allocations exist before deletion
    const allocationsBeforeDelete = await AllocationService.getByProject(createdProject.id);
    expect(allocationsBeforeDelete.length).toBe(numAllocations);
    
    // Create some allocations for other projects to ensure they're not affected
    const otherProjectData = {
      name: 'Other Project - ' + PropertyTest.string({ minLength: 1, maxLength: 100 }),
      description: PropertyTest.string({ minLength: 0, maxLength: 300 })
    };
    const otherProject = await ProjectService.create(otherProjectData);
    
    const otherAllocationData = {
      talent_id: talentData.id,
      project_id: otherProject.id,
      start_date: '2024-06-01',
      end_date: '2024-06-15',
      notes: 'Other project allocation'
    };
    const otherAllocation = await AllocationService.create(otherAllocationData);
    
    // Get total allocations before deletion
    const allAllocationsBeforeDelete = await AllocationService.getAll();
    const totalAllocationsBeforeDelete = allAllocationsBeforeDelete.length;
    
    // Delete the project
    await ProjectService.delete(createdProject.id);
    
    // Verify project is deleted
    const projectsAfterDelete = await ProjectService.getAll();
    const deletedProjectExists = projectsAfterDelete.some(p => p.id === createdProject.id);
    expect(deletedProjectExists).toBe(false);
    
    // Verify all allocations for the deleted project are also deleted (cascade)
    const allocationsAfterDelete = await AllocationService.getByProject(createdProject.id);
    expect(allocationsAfterDelete.length).toBe(0);
    
    // Verify other project's allocations are not affected
    const otherProjectAllocations = await AllocationService.getByProject(otherProject.id);
    expect(otherProjectAllocations.length).toBe(1);
    expect(otherProjectAllocations[0].id).toBe(otherAllocation.id);
    
    // Verify total allocation count decreased by exactly the number of deleted project's allocations
    const allAllocationsAfterDelete = await AllocationService.getAll();
    const expectedAllocationsAfterDelete = totalAllocationsBeforeDelete - numAllocations;
    expect(allAllocationsAfterDelete.length).toBe(expectedAllocationsAfterDelete);
    
    // Double-check: no allocation should reference the deleted project
    const orphanedAllocations = allAllocationsAfterDelete.filter(a => a.project_id === createdProject.id);
    if (orphanedAllocations.length > 0) {
      throw new Error(`Cascade delete failed: ${orphanedAllocations.length} allocations still reference deleted project ${createdProject.id}`);
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 7 Extended: Project Cascade Delete with No Allocations - Deleting a project with no allocations should not affect other allocations', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Create multiple projects
    const project1Data = {
      name: 'Project 1 - ' + PropertyTest.string({ minLength: 1, maxLength: 100 }),
      description: PropertyTest.string({ minLength: 0, maxLength: 300 })
    };
    const project1 = await ProjectService.create(project1Data);
    
    const project2Data = {
      name: 'Project 2 - ' + PropertyTest.string({ minLength: 1, maxLength: 100 }),
      description: PropertyTest.string({ minLength: 0, maxLength: 300 })
    };
    const project2 = await ProjectService.create(project2Data);
    
    // Create a talent
    const talentData = {
      id: 'test-talent-' + Math.random().toString(36).substr(2, 9),
      name: PropertyTest.string({ minLength: 1, maxLength: 200 }),
      email: PropertyTest.string({ minLength: 5, maxLength: 100 }) + '@example.com',
      created_at: new Date().toISOString()
    };
    SupabaseService.mockData.talents.push(talentData);
    StateManager.setState('talents', [talentData]);
    
    // Create allocations only for project2 (project1 will have no allocations)
    const numAllocations = Math.floor(Math.random() * 3) + 1; // 1-3 allocations
    for (let i = 0; i < numAllocations; i++) {
      const allocationData = {
        talent_id: talentData.id,
        project_id: project2.id,
        start_date: '2024-07-01',
        end_date: '2024-07-15',
        notes: `Allocation ${i + 1}`
      };
      await AllocationService.create(allocationData);
    }
    
    // Get allocations before deletion
    const allocationsBeforeDelete = await AllocationService.getAll();
    const project2AllocationsBeforeDelete = await AllocationService.getByProject(project2.id);
    
    // Delete project1 (which has no allocations)
    await ProjectService.delete(project1.id);
    
    // Verify project1 is deleted
    const projectsAfterDelete = await ProjectService.getAll();
    expect(projectsAfterDelete.some(p => p.id === project1.id)).toBe(false);
    expect(projectsAfterDelete.some(p => p.id === project2.id)).toBe(true);
    
    // Verify project2's allocations are unaffected
    const project2AllocationsAfterDelete = await AllocationService.getByProject(project2.id);
    expect(project2AllocationsAfterDelete.length).toBe(project2AllocationsBeforeDelete.length);
    
    // Verify total allocation count is unchanged
    const allocationsAfterDelete = await AllocationService.getAll();
    expect(allocationsAfterDelete.length).toBe(allocationsBeforeDelete.length);
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 7 Extended: Multiple Projects Cascade Delete - Deleting multiple projects should cascade delete all their respective allocations', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    SupabaseService._reset();
    ProjectService.usedColors.clear();
    
    // Create multiple projects
    const numProjects = Math.floor(Math.random() * 4) + 2; // 2-5 projects
    const projects = [];
    const projectAllocationCounts = [];
    
    // Create a talent
    const talentData = {
      id: 'test-talent-' + Math.random().toString(36).substr(2, 9),
      name: PropertyTest.string({ minLength: 1, maxLength: 200 }),
      email: PropertyTest.string({ minLength: 5, maxLength: 100 }) + '@example.com',
      created_at: new Date().toISOString()
    };
    SupabaseService.mockData.talents.push(talentData);
    StateManager.setState('talents', [talentData]);
    
    // Create projects and their allocations
    for (let i = 0; i < numProjects; i++) {
      const projectData = {
        name: `Project ${i + 1} - ` + PropertyTest.string({ minLength: 1, maxLength: 100 }),
        description: PropertyTest.string({ minLength: 0, maxLength: 300 })
      };
      const project = await ProjectService.create(projectData);
      projects.push(project);
      
      // Create random number of allocations for each project (0-3)
      const numAllocations = Math.floor(Math.random() * 4); // 0-3 allocations
      projectAllocationCounts.push(numAllocations);
      
      for (let j = 0; j < numAllocations; j++) {
        const allocationData = {
          talent_id: talentData.id,
          project_id: project.id,
          start_date: `2024-0${(i % 9) + 1}-01`,
          end_date: `2024-0${(i % 9) + 1}-15`,
          notes: `Project ${i + 1} Allocation ${j + 1}`
        };
        await AllocationService.create(allocationData);
      }
    }
    
    // Get initial counts
    const initialAllocations = await AllocationService.getAll();
    const initialAllocationCount = initialAllocations.length;
    
    // Delete projects one by one and verify cascade behavior
    let expectedRemainingAllocations = initialAllocationCount;
    
    for (let i = 0; i < projects.length; i++) {
      const projectToDelete = projects[i];
      const expectedDeletedAllocations = projectAllocationCounts[i];
      
      // Delete the project
      await ProjectService.delete(projectToDelete.id);
      
      // Update expected count
      expectedRemainingAllocations -= expectedDeletedAllocations;
      
      // Verify project is deleted
      const remainingProjects = await ProjectService.getAll();
      expect(remainingProjects.some(p => p.id === projectToDelete.id)).toBe(false);
      
      // Verify allocations for this project are deleted
      const projectAllocations = await AllocationService.getByProject(projectToDelete.id);
      expect(projectAllocations.length).toBe(0);
      
      // Verify total allocation count is correct
      const remainingAllocations = await AllocationService.getAll();
      expect(remainingAllocations.length).toBe(expectedRemainingAllocations);
      
      // Verify no orphaned allocations exist
      const orphanedAllocations = remainingAllocations.filter(a => a.project_id === projectToDelete.id);
      if (orphanedAllocations.length > 0) {
        throw new Error(`Cascade delete failed for project ${projectToDelete.id}: ${orphanedAllocations.length} orphaned allocations found`);
      }
    }
    
    // Final verification: all projects and their allocations should be deleted
    const finalProjects = await ProjectService.getAll();
    const finalAllocations = await AllocationService.getAll();
    
    expect(finalProjects.length).toBe(0);
    expect(finalAllocations.length).toBe(0);
    
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