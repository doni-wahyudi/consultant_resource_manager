/**
 * Simple test runner for property-based tests
 * This avoids the npm installation issues and provides a basic testing framework
 */

// Simple test framework
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
    const numRuns = options.numRuns || 100;
    
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
    const maxLength = options.maxLength || 100;
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result.trim() || 'test'; // Ensure non-empty after trim
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
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toMatch(pattern) {
      if (typeof actual !== 'string') {
        throw new Error(`Expected ${actual} to be a string for pattern matching`);
      }
      if (!pattern.test(actual)) {
        throw new Error(`Expected "${actual}" to match pattern ${pattern}`);
      }
    }
  };
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimpleTest, PropertyTest, expect };
} else {
  window.SimpleTest = SimpleTest;
  window.PropertyTest = PropertyTest;
  window.expect = expect;
}