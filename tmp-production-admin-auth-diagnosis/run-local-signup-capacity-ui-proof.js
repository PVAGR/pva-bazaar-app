const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const frontend = process.env.LOCAL_FRONTEND_URL || 'http://localhost:5173';
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const report = { frontend, startedAt: new Date().toISOString() };

  try {
    await page.route('**/api/admin/signup', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          message: 'you are over your space quota, using 512 MB of 512 MB',
        }),
      });
    });

    await page.goto(`${frontend}/#/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    if (await page.getByRole('button', { name: 'Create Admin Account' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Create Admin Account' }).click();
      await page.waitForTimeout(300);
    }

    await page.getByPlaceholder('Full Name').fill('Capacity Probe');
    await page.getByPlaceholder('Username (optional)').fill('capacity-probe');
    await page.getByPlaceholder('Email').fill('capacity-probe@example.com');
    await page.getByPlaceholder('Password (min 8 chars)').fill('Password123!');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(1000);

    const alertText = await page.locator('[role="alert"]').allTextContents().catch(() => []);
    const loginModeVisible = await page.getByText('Enter your credentials to access the admin panel.', { exact: false }).first().isVisible().catch(() => false);

    report.result = {
      alertText,
      loginModeVisible,
      finalUrl: page.url(),
      hasSwitchToLoginButton: await page.getByRole('button', { name: 'Switch to Login' }).isVisible().catch(() => false),
      hasCreateAdminAccountButton: await page.getByRole('button', { name: 'Create Admin Account' }).isVisible().catch(() => false),
    };

    await page.screenshot({ path: path.join(outDir, 'local-signup-capacity-ui.png'), fullPage: true });

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report-local-signup-capacity-ui-proof.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const out = { error: String(error), stack: error?.stack || null, partial: report };
    fs.writeFileSync(path.join(outDir, 'error-local-signup-capacity-ui-proof.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
