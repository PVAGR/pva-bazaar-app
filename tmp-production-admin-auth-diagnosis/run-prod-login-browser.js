const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  try {
    await page.goto('https://pvabazaar.org/#/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    if (await page.getByRole('button', { name: 'Switch to Login' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Switch to Login' }).click();
      await page.waitForTimeout(300);
    }

    await page.getByPlaceholder('Username or Email').fill('richyrichaii');
    await page.getByPlaceholder('Password').fill('pva123zxc!');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(2000);

    const report = {
      finalUrl: page.url(),
      adminVisible: await page.getByText('Admin Governance Decisions', { exact: false }).first().isVisible().catch(() => false),
      alertText: await page.locator('[role="alert"]').allTextContents().catch(() => []),
      tokenPresent: await page.evaluate(() => Boolean(localStorage.getItem('token'))),
    };

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ error: String(error), stack: error?.stack || null }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
