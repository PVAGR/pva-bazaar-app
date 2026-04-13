const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const apiTrace = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (!/\/api\/admin\/(bootstrap-status|login|signup)/.test(url)) return;
    let body = '';
    try {
      body = await res.text();
    } catch (_e) {
      body = '<unreadable>';
    }
    apiTrace.push({ url, status: res.status(), body: body.slice(0, 1000) });
  });

  const visible = async (text) => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  const textAll = async (selector) => page.locator(selector).allTextContents().catch(() => []);
  const bodyText = async () => (await page.locator('body').innerText().catch(() => '')).slice(0, 1500);

  async function fillLoginFields() {
    const userInput = page.getByPlaceholder('Username or Email');
    const passInput = page.getByPlaceholder('Password');
    if (await userInput.isVisible().catch(() => false)) {
      await userInput.fill('production_admin_probe_user');
    }
    if (await passInput.isVisible().catch(() => false)) {
      await passInput.fill('WrongPassword123!');
    }
  }

  async function fillSignupFields() {
    const fullName = page.getByPlaceholder('Full Name');
    const username = page.getByPlaceholder('Username (optional)');
    const email = page.getByPlaceholder('Email');
    const password = page.getByPlaceholder('Password (min 8 chars)');
    const bootstrap = page.getByPlaceholder('Bootstrap Code');

    if (await fullName.isVisible().catch(() => false)) await fullName.fill('Production Probe');
    if (await username.isVisible().catch(() => false)) await username.fill('production_admin_probe_user');
    if (await email.isVisible().catch(() => false)) await email.fill('probe-admin@example.com');
    if (await password.isVisible().catch(() => false)) await password.fill('WrongPassword123!');
    if (await bootstrap.isVisible().catch(() => false)) await bootstrap.fill('invalid-bootstrap-code');
  }

  const report = { startedAt: new Date().toISOString() };

  try {
    await page.goto('https://pvabazaar.org/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());

    await page.goto('https://pvabazaar.org/#/admin/governance', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    report.governance = {
      finalUrl: page.url(),
      hasNextInUrl: page.url().includes('next='),
      h1: await textAll('h1'),
      hasCreateAdminPath: await visible('Create Admin Account'),
      hasSwitchToLoginPath: await visible('Switch to Login'),
      hasBootstrapCodeRequirementText: await visible('Bootstrap Code'),
      bodySnippet: await bodyText(),
    };
    await page.screenshot({ path: path.join(outDir, '11-governance.png'), fullPage: true });

    await page.goto('https://pvabazaar.org/#/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    report.adminInitial = {
      finalUrl: page.url(),
      h1: await textAll('h1'),
      hasCreateAdminPath: await visible('Create Admin Account'),
      hasSwitchToLoginPath: await visible('Switch to Login'),
      hasBootstrapCodeRequirementText: await visible('Bootstrap Code'),
      bodySnippet: await bodyText(),
    };
    await page.screenshot({ path: path.join(outDir, '12-admin-initial.png'), fullPage: true });

    // Force login mode
    if (await visible('Switch to Login')) {
      await page.getByRole('button', { name: 'Switch to Login' }).click();
      await page.waitForTimeout(400);
    }

    await fillLoginFields();
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(1800);

    report.loginAttempt = {
      finalUrl: page.url(),
      errorAlertText: await textAll('[role="alert"]'),
      bodySnippet: await bodyText(),
    };
    await page.screenshot({ path: path.join(outDir, '13-login-attempt.png'), fullPage: true });

    // Switch/create signup mode
    if (await visible('Create Admin Account')) {
      // Could be toggle or submit; prefer explicit non-submit toggle button if available.
      const toggles = page.locator('button[type="button"]');
      const count = await toggles.count();
      let clicked = false;
      for (let i = 0; i < count; i += 1) {
        const t = toggles.nth(i);
        const txt = (await t.innerText().catch(() => '')).trim();
        if (/Create Admin Account/i.test(txt)) {
          await t.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        // Fallback: click first matching button by role
        await page.getByRole('button', { name: 'Create Admin Account' }).first().click();
      }
      await page.waitForTimeout(500);
    }

    await fillSignupFields();
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(1800);

    report.signupAttempt = {
      finalUrl: page.url(),
      errorAlertText: await textAll('[role="alert"]'),
      bodySnippet: await bodyText(),
    };
    await page.screenshot({ path: path.join(outDir, '14-signup-attempt.png'), fullPage: true });

    report.apiTrace = apiTrace;
    report.finishedAt = new Date().toISOString();

    const fp = path.join(outDir, 'report-precise.json');
    fs.writeFileSync(fp, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const out = { error: String(error), stack: error?.stack || null, apiTrace };
    fs.writeFileSync(path.join(outDir, 'error-precise.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
