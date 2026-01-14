import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Playwright Global Setup');

  // Start browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for development servers to be ready
    console.log('⏳ Waiting for development servers...');

    // Check backend health
    let backendReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        await page.goto('http://localhost:4000/health');
        backendReady = true;
        break;
      } catch {
        await page.waitForTimeout(1000);
      }
    }

    if (!backendReady) {
      console.warn('⚠️  Backend not ready, some tests may fail');
    }

    // Check frontend
    let frontendReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        await page.goto('http://localhost:3000');
        frontendReady = true;
        break;
      } catch {
        await page.waitForTimeout(1000);
      }
    }

    if (!frontendReady) {
      console.warn('⚠️  Frontend not ready, some tests may fail');
    }

    console.log('✅ Development servers ready');

    // Setup test data if needed
    // You can add API calls here to create test users, artifacts, etc.
  } catch (error) {
    console.error('❌ Global setup failed:', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
