const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const frontend = 'https://pvabazaar.org';
  const apiBase = 'https://api.pvabazaar.org/api';
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const stamp = Date.now();
  const reason = `Prod persisted decision proof ${stamp}`;

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const report = {
    startedAt: new Date().toISOString(),
    proposalId: 'PROP-101',
    reason,
    frontend,
    apiBase,
  };

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();

    await page.goto(`${frontend}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto(`${frontend}/#/admin/governance`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    if (await page.getByRole('button', { name: 'Switch to Login' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Switch to Login' }).click();
      await page.waitForTimeout(250);
    }

    await page.getByPlaceholder('Username or Email').fill('richyrichaii').catch(() => {});
    await page.getByPlaceholder('Password').fill('pva123zxc!').catch(() => {});
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(1800);

    const governanceVisible = await page.getByText('Admin Governance Decisions', { exact: false }).first().isVisible().catch(() => false);
    const token = await page.evaluate(() => localStorage.getItem('token') || '');

    report.login = {
      governanceVisible,
      finalUrl: page.url(),
      hasToken: Boolean(token),
      alertText: await page.locator('[role="alert"]').allTextContents().catch(() => []),
    };

    if (!governanceVisible || !token) {
      report.finishedAt = new Date().toISOString();
      fs.writeFileSync(path.join(outDir, 'report-prod-persistence-check.json'), JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report, null, 2));
      await context.close();
      await browser.close();
      return;
    }

    const section = page.locator('section').filter({ hasText: 'PROP-101' }).first();
    await section.waitFor({ timeout: 12000 });

    await section.locator('select').first().selectOption('accepted');
    await section.locator('textarea').first().fill(reason);
    await section.getByRole('button', { name: 'Publish Decision' }).click();
    await page.waitForTimeout(1400);

    await page.screenshot({ path: path.join(outDir, 'prod-admin-publish.png'), fullPage: true });

    const persisted = await page.evaluate(async ({ apiBase, token, reason }) => {
      const res = await fetch(`${apiBase}/governance/admin-responses`, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      });
      const data = await res.json();
      const match = Array.isArray(data?.items)
        ? data.items.find((item) => item && item.proposalId === 'PROP-101' && String(item.reason || '').includes(reason))
        : null;
      return {
        status: res.status,
        found: Boolean(match),
      };
    }, { apiBase, token, reason });

    report.persistence = persisted;
    await context.close();

    const context2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page2 = await context2.newPage();
    await page2.goto(`${frontend}/#/conference`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(1400);

    const card = page2.locator('article').filter({ hasText: 'PROP-101' }).first();
    report.conference = {
      proposalVisible: await card.isVisible().catch(() => false),
      reasonVisible: await card.getByText(reason, { exact: false }).first().isVisible().catch(() => false),
      acceptedVisible: await card.getByText('Accepted', { exact: false }).first().isVisible().catch(() => false),
    };

    await page2.screenshot({ path: path.join(outDir, 'prod-conference-persisted.png'), fullPage: true });
    await context2.close();

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report-prod-persistence-check.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const out = { error: String(error), stack: error?.stack || null, partial: report };
    fs.writeFileSync(path.join(outDir, 'error-prod-persistence-check.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
