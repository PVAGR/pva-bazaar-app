const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  try {
    await page.goto('https://pvabazaar.org/#/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    if (await page.getByRole('button', { name: 'Create Admin Account' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Create Admin Account' }).click();
      await page.waitForTimeout(300);
    }

    await page.getByPlaceholder('Full Name').fill('Browser Signup Probe');
    await page.getByPlaceholder('Username (optional)').fill(`browser${Date.now()}`);
    await page.getByPlaceholder('Email').fill(`browser-${Date.now()}@pvabazaar.org`);
    await page.getByPlaceholder('Password (min 8 chars)').fill('BrowserProbe123!');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(2000);

    const report = {
      finalUrl: page.url(),
      alertText: await page.locator('[role="alert"]').allTextContents().catch(() => []),
      loginModeVisible: await page.getByText('Enter your credentials to access the admin panel.', { exact: false }).first().isVisible().catch(() => false),
      createButtonVisible: await page.getByRole('button', { name: 'Create Admin Account' }).isVisible().catch(() => false),
    };
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ error: String(error), stack: error?.stack || null }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
