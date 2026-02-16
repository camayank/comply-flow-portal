/**
 * Jest Test Setup
 * Runs before each test file
 */

import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/comply_flow_test';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-purposes-only-min-32-chars';
process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-encryption-key-for-testing-min-32-characters';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Set timeout for async operations
jest.setTimeout(10000);
