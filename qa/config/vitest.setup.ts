import { beforeAll, afterEach, vi } from 'vitest';
// Optional dependency guard: only require testing-library if installed
let cleanup: () => void = () => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  cleanup = require('@testing-library/react').cleanup;
} catch {
  // testing library not installed; skip cleanup
}

// Optional: extend expect() with jest-dom matchers if installed
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@testing-library/jest-dom/vitest');
} catch {
  // jest-dom not installed; skip
}

// Global test setup for PVA Bazaar

// Mock react-helmet-async so Helmet renders nothing in tests (avoids HelmetProvider requirement)
vi.mock('react-helmet-async', () => ({
  Helmet: () => null,
  HelmetProvider: ({ children }: { children: unknown }) => children,
}));

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
      removeListener: () => {},
    };
  }

  // Mock console methods in test environment
  const originalWarn = console.warn;
  global.console = {
    ...console,
    // Suppress logs in tests unless debugging
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: (...args: unknown[]) => {
      const msg = String(args[0] ?? '');
      if (msg.includes('React Router Future Flag') || msg.includes('v7_startTransition') || msg.includes('v7_relativeSplatPath')) return;
      originalWarn.apply(console, args);
    },
    error: console.error,
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
  textMuted: '#a8b0b9',
};

// Mock fetch for API tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = async (url: string, _options?: any) => {
  console.warn(`Mock fetch called with: ${url}`);
  return new Response(JSON.stringify({ message: 'Mock response' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
