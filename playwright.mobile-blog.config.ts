import { defineConfig, devices } from '@playwright/test';

/**
 * Final UX patch — mobile nav + blog feed spec.
 * Runs against an already-running vite preview server (npm run preview in
 * Frontend/ on port 4173). No webServer block: the server is managed outside.
 *
 * Usage:
 *   cd Frontend && npx vite preview --port 4173 --strictPort
 *   npx playwright test --config=playwright.mobile-blog.config.ts
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/mobile-nav-blog.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    // When LOCAL_FEED_API is set, tests run against the vite dev server
    // (port 5173, VITE_API_URL pointed at the local seeded backend). Without
    // it, they run against a vite preview of the production build (4173).
    baseURL: process.env.MOBILE_E2E_BASE_URL || (process.env.LOCAL_FEED_API ? 'http://localhost:5173' : 'http://localhost:4173'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  expect: { timeout: 15_000 },
});
