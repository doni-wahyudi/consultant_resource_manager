/**
 * Local test runner to check property tests
 */

// Mock crypto for Node.js environment
global.crypto = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
};

// Simple test framework (inline)
class SimpleTest {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('Running tests...\n');
    
    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✓ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Simple property-based testing utilities
class PropertyTest {
  static async assert(property, options = {}) {
    const numRuns = options.numRuns || 10; // Reduced for quick test
    
    for (let i = 0; i < numRuns; i++) {
      try {
        const result = await property();
        if (!result) {
          throw new Error(`Property failed on iteration ${i + 1}`);
        }
      } catch (error) {
        throw new Error(`Property failed on iteration ${i + 1}: ${error.message}`);
      }
    }
  }
  
  static string(options = {}) {
    const minLength = options.minLength || 1;
    const maxLength = options.maxLength || 20; // Reduced for quick test
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result || 'test'; // Ensure non-empty
  }
}

// Simple assertion utilities
function expect(actual) {
  return {
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but got ${actual}`);
      }
    },
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected value to be undefined, but got ${actual}`);
      }
    }
  };
}

// Test if basic functionality works
const testSuite = new SimpleTest();

testSuite.test('Basic test framework works', async () => {
  expect(1).toBe(1);
  expect('test').toBeDefined();
});

testSuite.test('Property test framework works', async () => {
  await PropertyTest.assert(async () => {
    const str = PropertyTest.string();
    expect(str).toBeDefined();
    return true;
  }, { numRuns: 5 });
});

// Run the tests
testSuite.run().then(success => {
  console.log(`\nTest runner ${success ? 'passed' : 'failed'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});