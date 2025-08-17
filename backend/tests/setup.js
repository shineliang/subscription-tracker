// Test setup file
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Suppress console logs during tests
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Global test timeout
jest.setTimeout(10000);