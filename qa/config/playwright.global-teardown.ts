import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Playwright Global Teardown');

  // Cleanup test data if needed
  // Reset test database, clear uploads, etc.

  console.log('✅ Teardown completed');
}

export default globalTeardown;
