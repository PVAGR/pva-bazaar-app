import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./qa/config/vitest.setup.ts'],
    hookTimeout: 120000,
    testTimeout: 120000,
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'out',
      '.next',
      // Nested duplicate checkout (see root .gitignore); do not run tests twice
      'pva-bazaar-app/**',
      'backend/node_modules/**',
      '**/node_modules/pva-bazaar/**',
      'qa/backstop',
      'qa/reports',
      // Playwright specs are not Vitest tests
      'tests/e2e*.spec.*',
      'tests/**/*.e2e.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'out/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/tests/**',
        '**/qa/**',
        'vite.config.*',
        'playwright.config.*',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    reporters: ['default', 'json', 'html'],
    outputFile: {
      json: './qa/reports/vitest-results.json',
      html: './qa/reports/vitest-report.html',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
});
