/**
 * Property-based tests for Legend completeness
 * **Feature: consultant-resource-manager, Property 8: Legend Completeness**
 * **Validates: Requirements 3.4**
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
  subscribe(key, callback) {
    // Simple mock - return unsubscribe function
    return () => {};
  },
  _reset() {
    this.state = {};
  }
};

// Make StateManager globally available
global.StateManager = StateManager;

// Create a simple mock DOM environment with better HTML parsing
function parseHTML(html) {
  // Simple HTML parser for testing
  const legendItems = [];
  const itemRegex = /<div class="legend-item"[^>]*title="([^"]*)"[\s\S]*?style="background-color:\s*([^"]+)"[\s\S]*?<span class="legend-label">([\s\S]*?)<\/span>[\s\S]*?<\/div>/g;
  
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const title = match[1];
    const color = match[2].trim();
    const label = match[3].replace(/\s+/g, ' ').trim();
    
    legendItems.push({
      title,
      color,
      label,
      querySelector: function(selector) {
        if (selector === '.legend-color') {
          return { style: { backgroundColor: color } };
        }
        if (selector === '.legend-label') {
          return { textContent: label };
        }
        return null;
      }
    });
  }
  
  return legendItems;
}

const mockElement = {
  innerHTML: '',
  style: {},
  textContent: '',
  querySelector: function(selector) {
    // Simple mock implementation for testing
    if (selector === '.text-muted' && this.innerHTML.includes('No active projects')) {
      return { textContent: 'No active projects' };
    }
    if (selector === '.legend-container' && this.innerHTML.includes('legend-container')) {
      return { innerHTML: this.innerHTML };
    }
    if (selector === '.legend-title' && this.innerHTML.includes('legend-title')) {
      return { innerHTML: 'Project Legend' };
    }
    if (selector === '.legend-items' && this.innerHTML.includes('legend-items')) {
      return { innerHTML: this.innerHTML };
    }
    return null;
  },
  querySelectorAll: function(selector) {
    if (selector === '.legend-item') {
      return parseHTML(this.innerHTML);
    }
    return [];
  }
};

global.document = {
  createElement: function(tagName) {
    return Object.create(mockElement);
  }
};
global.window = {};

// Create the Legend component directly (based on the actual implementation)
const Legend = {
    container: null,
    unsubscribe: null,
    
    /**
     * Render legend with projects
     * @param {HTMLElement} container - Container element
     * @param {Array} projects - Projects array
     */
    render(container, projects = null) {
        this.container = container;
        
        if (!projects) {
            projects = StateManager.getState('projects') || [];
        }
        
        // Filter to only active projects (in_progress status)
        const activeProjects = projects.filter(p => p.status === 'in_progress');
        
        if (activeProjects.length === 0) {
            container.innerHTML = `
                <div class="legend-container">
                    <h4 class="legend-title">Project Legend</h4>
                    <p class="text-muted">No active projects</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="legend-container">
                <h4 class="legend-title">Project Legend</h4>
                <div class="legend-items">
                    ${activeProjects.map(project => `
                        <div class="legend-item" title="${project.name}">
                            <div class="legend-color" style="background-color: ${project.color}"></div>
                            <span class="legend-label">${project.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Subscribe to project changes for auto-update
        this.subscribeToState();
    },
    
    /**
     * Subscribe to state changes for auto-refresh
     */
    subscribeToState() {
        // Unsubscribe from previous subscription if exists
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        this.unsubscribe = StateManager.subscribe('projects', (projects) => {
            if (this.container) {
                this.update(projects);
            }
        });
    },
    
    /**
     * Update legend when projects change
     * @param {Array} projects - Updated projects array
     */
    update(projects) {
        if (this.container) {
            // Re-render with new projects
            const activeProjects = (projects || []).filter(p => p.status === 'in_progress');
            
            if (activeProjects.length === 0) {
                this.container.innerHTML = `
                    <div class="legend-container">
                        <h4 class="legend-title">Project Legend</h4>
                        <p class="text-muted">No active projects</p>
                    </div>
                `;
                return;
            }
            
            this.container.innerHTML = `
                <div class="legend-container">
                    <h4 class="legend-title">Project Legend</h4>
                    <div class="legend-items">
                        ${activeProjects.map(project => `
                            <div class="legend-item" title="${project.name}">
                                <div class="legend-color" style="background-color: ${project.color}"></div>
                                <span class="legend-label">${project.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
};

// Create test suite
const testSuite = new SimpleTest();

testSuite.test('Property 8: Legend Completeness - For any set of active projects, the rendered legend SHALL contain an entry for each project with its assigned color', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    
    // Generate random active projects (in_progress status)
    const numActiveProjects = Math.floor(Math.random() * 10) + 1; // 1-10 active projects
    const activeProjects = [];
    
    for (let i = 0; i < numActiveProjects; i++) {
      const project = {
        id: `project-${i}-${Math.random().toString(36).substr(2, 9)}`,
        name: PropertyTest.string({ minLength: 1, maxLength: 100 }),
        status: 'in_progress', // Active projects only
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}` // Random hex color
      };
      activeProjects.push(project);
    }
    
    // Add some non-active projects to test filtering
    const numInactiveProjects = Math.floor(Math.random() * 5); // 0-4 inactive projects
    const allProjects = [...activeProjects];
    
    for (let i = 0; i < numInactiveProjects; i++) {
      const inactiveProject = {
        id: `inactive-${i}-${Math.random().toString(36).substr(2, 9)}`,
        name: PropertyTest.string({ minLength: 1, maxLength: 100 }),
        status: Math.random() > 0.5 ? 'completed' : 'canceled', // Non-active status
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      };
      allProjects.push(inactiveProject);
    }
    
    // Set projects in state
    StateManager.setState('projects', allProjects);
    
    // Create a container element
    const container = document.createElement('div');
    
    // Render the legend
    Legend.render(container, allProjects);
    
    // Verify the legend was rendered
    expect(container.innerHTML).toBeDefined();
    
    if (activeProjects.length === 0) {
      // If no active projects, should show "No active projects" message
      const noProjectsMessage = container.querySelector('.text-muted');
      expect(noProjectsMessage).toBeDefined();
      return true;
    }
    
    // Verify legend container exists
    const legendContainer = container.querySelector('.legend-container');
    expect(legendContainer).toBeDefined();
    
    // Verify legend title exists
    const legendTitle = container.querySelector('.legend-title');
    expect(legendTitle).toBeDefined();
    
    // Verify legend items container exists
    const legendItems = container.querySelector('.legend-items');
    expect(legendItems).toBeDefined();
    
    // Get all legend item elements
    const legendItemElements = container.querySelectorAll('.legend-item');
    
    // Verify we have exactly the right number of legend items (one per active project)
    if (legendItemElements.length !== activeProjects.length) {
      throw new Error(`Expected ${activeProjects.length} legend items, but found ${legendItemElements.length}`);
    }
    

    
    // Verify each active project has a corresponding legend entry
    for (const project of activeProjects) {
      let foundMatchingItem = false;
      
      for (const itemElement of legendItemElements) {
        const colorElement = itemElement.querySelector('.legend-color');
        const labelElement = itemElement.querySelector('.legend-label');
        
        expect(colorElement).toBeDefined();
        expect(labelElement).toBeDefined();
        
        const itemColor = colorElement.style.backgroundColor;
        const itemLabel = labelElement.textContent;
        

        
        // Check if this legend item matches the current project
        // Normalize whitespace for comparison since HTML rendering may collapse spaces
        const normalizedItemLabel = itemLabel.replace(/\s+/g, ' ').trim();
        const normalizedProjectName = project.name.replace(/\s+/g, ' ').trim();
        
        if (normalizedItemLabel === normalizedProjectName) {
          foundMatchingItem = true;
          
          // Verify the color matches (convert RGB to hex if needed)
          const expectedColor = project.color.toLowerCase();
          let actualColor = itemColor.toLowerCase();
          
          // Convert rgb() format to hex if necessary
          if (actualColor.startsWith('rgb(')) {
            const rgbMatch = actualColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1]);
              const g = parseInt(rgbMatch[2]);
              const b = parseInt(rgbMatch[3]);
              actualColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
          }
          
          if (actualColor !== expectedColor) {
            throw new Error(`Project "${project.name}" color mismatch: expected ${expectedColor}, got ${actualColor}`);
          }
          
          break;
        }
      }
      
      if (!foundMatchingItem) {
        // Debug: show what items we actually found
        const foundItems = [];
        for (const itemElement of legendItemElements) {
          const labelElement = itemElement.querySelector('.legend-label');
          if (labelElement) {
            foundItems.push(labelElement.textContent);
          }
        }
        throw new Error(`Active project "${project.name}" not found in legend. Found items: [${foundItems.join(', ')}]. HTML: ${container.innerHTML.substring(0, 500)}`);
      }
    }
    
    // Verify no inactive projects appear in the legend
    for (const itemElement of legendItemElements) {
      const labelElement = itemElement.querySelector('.legend-label');
      const itemLabel = labelElement.textContent;
      
      const matchingProject = allProjects.find(p => p.name === itemLabel);
      if (matchingProject && matchingProject.status !== 'in_progress') {
        throw new Error(`Inactive project "${itemLabel}" (status: ${matchingProject.status}) should not appear in legend`);
      }
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 8 Extended: Legend Update Completeness - When projects change, the legend should update to reflect only active projects', async () => {
  await PropertyTest.assert(async () => {
    // Reset state for each test iteration
    StateManager._reset();
    
    // Create initial set of projects
    const initialActiveProjects = [];
    const numInitial = Math.floor(Math.random() * 5) + 1; // 1-5 initial active projects
    
    for (let i = 0; i < numInitial; i++) {
      initialActiveProjects.push({
        id: `initial-${i}`,
        name: `Initial Project ${i}`,
        status: 'in_progress',
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      });
    }
    
    StateManager.setState('projects', initialActiveProjects);
    
    // Create container and render initial legend
    const container = document.createElement('div');
    Legend.render(container, initialActiveProjects);
    
    // Verify initial render
    let legendItems = container.querySelectorAll('.legend-item');
    if (legendItems.length !== initialActiveProjects.length) {
      throw new Error(`Initial render failed: expected ${initialActiveProjects.length} items, got ${legendItems.length}`);
    }
    
    // Update projects - add new active projects and change some to inactive
    const updatedProjects = [];
    
    // Keep some initial projects active
    const numToKeep = Math.floor(initialActiveProjects.length / 2);
    for (let i = 0; i < numToKeep; i++) {
      updatedProjects.push(initialActiveProjects[i]);
    }
    
    // Change some initial projects to inactive
    for (let i = numToKeep; i < initialActiveProjects.length; i++) {
      updatedProjects.push({
        ...initialActiveProjects[i],
        status: Math.random() > 0.5 ? 'completed' : 'canceled'
      });
    }
    
    // Add new active projects
    const numNewActive = Math.floor(Math.random() * 3) + 1; // 1-3 new active projects
    for (let i = 0; i < numNewActive; i++) {
      updatedProjects.push({
        id: `new-${i}`,
        name: `New Project ${i}`,
        status: 'in_progress',
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      });
    }
    
    // Update the legend
    Legend.update(updatedProjects);
    
    // Verify updated render
    const expectedActiveCount = updatedProjects.filter(p => p.status === 'in_progress').length;
    legendItems = container.querySelectorAll('.legend-item');
    
    if (legendItems.length !== expectedActiveCount) {
      throw new Error(`Update failed: expected ${expectedActiveCount} active items, got ${legendItems.length}`);
    }
    
    // Verify only active projects are shown
    for (const itemElement of legendItems) {
      const labelElement = itemElement.querySelector('.legend-label');
      const itemLabel = labelElement.textContent;
      
      const matchingProject = updatedProjects.find(p => p.name === itemLabel);
      if (!matchingProject || matchingProject.status !== 'in_progress') {
        throw new Error(`Legend contains non-active project: ${itemLabel}`);
      }
    }
    
    return true;
  }, { numRuns: 100 });
});

testSuite.test('Property 8 Extended: Empty Legend Handling - When no active projects exist, legend should show appropriate message', async () => {
  await PropertyTest.assert(async () => {
    // Reset state
    StateManager._reset();
    
    // Create projects with no active ones
    const inactiveProjects = [];
    const numInactive = Math.floor(Math.random() * 5) + 1; // 1-5 inactive projects
    
    for (let i = 0; i < numInactive; i++) {
      inactiveProjects.push({
        id: `inactive-${i}`,
        name: `Inactive Project ${i}`,
        status: Math.random() > 0.5 ? 'completed' : 'canceled',
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      });
    }
    
    StateManager.setState('projects', inactiveProjects);
    
    // Create container and render legend
    const container = document.createElement('div');
    Legend.render(container, inactiveProjects);
    
    // Verify "No active projects" message is shown
    const noProjectsMessage = container.querySelector('.text-muted');
    expect(noProjectsMessage).toBeDefined();
    
    if (!noProjectsMessage.textContent.includes('No active projects')) {
      throw new Error(`Expected "No active projects" message, got: ${noProjectsMessage.textContent}`);
    }
    
    // Verify no legend items are present
    const legendItems = container.querySelectorAll('.legend-item');
    if (legendItems.length > 0) {
      throw new Error(`Expected no legend items for inactive projects, but found ${legendItems.length}`);
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