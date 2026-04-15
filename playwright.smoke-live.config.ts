import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against production (no local webServer).
 * Usage: npx playwright test --config=playwright.smoke-live.config.ts
 */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/e2e.smoke.spec.js",
  fullyParallel: true,
  workers: 2,
  retries: 1,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  expect: { timeout: 15_000 },
});
