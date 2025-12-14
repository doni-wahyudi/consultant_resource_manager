// Test setup file
import { vi } from 'vitest';

// Mock crypto.randomUUID for consistent testing
global.crypto = {
  randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn()
};

// Setup DOM environment
global.document = document;
global.window = window;