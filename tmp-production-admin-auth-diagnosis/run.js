const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const report = {
    startedAt: new Date().toISOString(),
    governanceEntry: {},
    adminEntryInitial: {},
    adminToggleChecks: {},
    loginAttempt: {},
    signupAttempt: {},
  };

  const screenshot = async (name) => {
    const file = path.join(outDir, name);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  };

  const getTexts = async (selector) => {
    return await page.locator(selector).allTextContents().catch(() => []);
  };

  const hasText = async (text) => {
    return await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  };

  try {
    await page.goto('https://pvabazaar.org/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());

    await page.goto('https://pvabazaar.org/#/admin/governance', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    report.governanceEntry = {
      finalUrl: page.url(),
      hasNextInUrl: page.url().includes('next='),
      h1: await getTexts('h1'),
      hasCreateAdminPath: await hasText('Create Admin Account'),
      hasSwitchToLoginPath: await hasText('Switch to Login'),
      hasBootstrapCodeField: await hasText('Bootstrap Code'),
      screenshot: await screenshot('01-governance-unauth.png')
    };

    await page.goto('https://pvabazaar.org/#/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    report.adminEntryInitial = {
      finalUrl: page.url(),
      h1: await getTexts('h1'),
      hasCreateAdminPath: await hasText('Create Admin Account'),
      hasSwitchToLoginPath: await hasText('Switch to Login'),
      hasBootstrapCodeField: await hasText('Bootstrap Code'),
      loginButtonVisible: await page.getByRole('button', { name: 'Login' }).isVisible().catch(() => false),
      createButtonVisible: await page.getByRole('button', { name: 'Create Admin Account' }).isVisible().catch(() => false),
      screenshot: await screenshot('02-admin-initial.png')
    };

    const createModeButton = page.getByRole('button', { name: 'Create Admin Account' });
    if (await createModeButton.isVisible().catch(() => false)) {
      await createModeButton.click();
      await page.waitForTimeout(300);
    }

    report.adminToggleChecks = {
      afterCreateClickUrl: page.url(),
      createModeHasBootstrapCodeField: await hasText('Bootstrap Code'),
      createModeHasSwitchToLoginPath: await hasText('Switch to Login'),
      screenshot: await screenshot('03-admin-create-mode.png')
    };

    const switchToLogin = page.getByRole('button', { name: 'Switch to Login' });
    if (await switchToLogin.isVisible().catch(() => false)) {
      await switchToLogin.click();
      await page.waitForTimeout(300);
    }

    await page.locator('#admin-username').fill('production_admin_probe_user').catch(() => {});
    await page.locator('#admin-password').fill('WrongPassword123!').catch(() => {});
    const loginButton = page.getByRole('button', { name: 'Login' });
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await page.waitForTimeout(1500);
    }

    report.loginAttempt = {
      finalUrl: page.url(),
      alertText: await page.locator('[role="alert"]').allTextContents().catch(() => []),
      visibleErrors: await getTexts('.error, .alert, .text-red-500, .text-red-600, .text-red-700, .text-danger'),
      pageTextSnippet: (await page.locator('body').innerText().catch(() => '')).slice(0, 2000),
      screenshot: await screenshot('04-login-attempt.png')
    };

    const createModeButton2 = page.getByRole('button', { name: 'Create Admin Account' });
    if (await createModeButton2.isVisible().catch(() => false)) {
      await createModeButton2.click();
      await page.waitForTimeout(300);
    }

    await page.locator('#admin-username').fill('production_admin_probe_user').catch(() => {});
    await page.locator('#admin-password').fill('WrongPassword123!').catch(() => {});
    await page.locator('#admin-secret').fill('invalid-bootstrap-code').catch(() => {});

    const createButton = page.getByRole('button', { name: 'Create Admin Account' });
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1500);
    }

    report.signupAttempt = {
      finalUrl: page.url(),
      alertText: await page.locator('[role="alert"]').allTextContents().catch(() => []),
      visibleErrors: await getTexts('.error, .alert, .text-red-500, .text-red-600, .text-red-700, .text-danger'),
      pageTextSnippet: (await page.locator('body').innerText().catch(() => '')).slice(0, 2000),
      screenshot: await screenshot('05-signup-attempt.png')
    };

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    const out = {
      error: String(err),
      stack: err && err.stack ? err.stack : null,
      at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(outDir, 'error.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
