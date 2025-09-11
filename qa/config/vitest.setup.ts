import { beforeAll, afterEach } from 'vitest';
// Optional dependency guard: only require testing-library if installed
let cleanup: () => void = () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  cleanup = require('@testing-library/react').cleanup;
} catch {
  // testing library not installed; skip cleanup
}

// Global test setup for PVA Bazaar

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup before all tests
beforeAll(() => {
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';
  
  // Mock Web3 if needed
  if (typeof window !== 'undefined') {
    (window as any).ethereum = {
      request: () => Promise.resolve(['0x1234567890abcdef']),
      on: () => {},
      removeListener: () => {}
    };
  }
  
  // Mock console methods in test environment
  global.console = {
    ...console,
    // Suppress logs in tests unless debugging
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: console.warn,
    error: console.error
  };
});

// Global test utilities
// Extend global type (declare first for TS)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).PVA_TEST_COLORS = {
  primaryDark: '#0f3b2d',
  primary: '#1c5a45',
  primaryLight: '#2d7d5a',
  accent: '#4ef8a3',
  accentDark: '#2bb673',
  gold: '#d4af37',
  textLight: '#e8f4f0',
  textMuted: '#a8b0b9'
};

// Mock fetch for API tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = async (url: string, _options?: any) => {
  console.warn(`Mock fetch called with: ${url}`);
  return new Response(JSON.stringify({ message: 'Mock response' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
