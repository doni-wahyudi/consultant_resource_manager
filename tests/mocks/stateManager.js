// Mock StateManager for testing
let mockState = {};

export const StateManager = {
  getState(key) {
    return mockState[key];
  },
  
  setState(key, value) {
    mockState[key] = value;
  },
  
  // Test utility to reset state
  _reset() {
    mockState = {};
  }
};