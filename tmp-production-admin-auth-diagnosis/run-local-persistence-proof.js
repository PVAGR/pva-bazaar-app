const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const frontend = process.env.LOCAL_FRONTEND_URL || 'http://localhost:5173';
  const apiBase = process.env.LOCAL_API_URL || 'http://localhost:5001/api';
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const stamp = Date.now();
  const reason = `Backend persisted decision proof ${stamp}`;
  const nextStep = `Execute phase ${stamp}`;
  const timeline = `T+${(stamp % 30) + 1} days`;

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const report = {
    frontend,
    apiBase,
    startedAt: new Date().toISOString(),
    proposalId: 'PROP-101',
    reason,
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
    await page.waitForLoadState('networkidle');

    if (await page.getByRole('button', { name: 'Switch to Login' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Switch to Login' }).click();
      await page.waitForTimeout(250);
    }

    await page.getByPlaceholder('Username or Email').fill('admin@pvabazaar.org');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.locator('form button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(700);

    const governanceVisible = await page.getByText('Admin Governance Decisions', { exact: false }).first().isVisible().catch(() => false);
    report.adminLogin = {
      governanceVisible,
      finalUrl: page.url(),
      hasToken: await page.evaluate(() => Boolean(localStorage.getItem('token'))),
    };

    if (!governanceVisible) {
      throw new Error('Admin governance page not visible after login');
    }

    const section = page.locator('section').filter({ hasText: 'PROP-101' }).first();
    await section.waitFor({ timeout: 10000 });

    await section.locator('select').first().selectOption('accepted');
    await section.locator('textarea').first().fill(reason);

    const nextStepInput = section.locator('input').nth(0);
    const timelineInput = section.locator('input').nth(1);
    await nextStepInput.fill(nextStep);
    await timelineInput.fill(timeline);

    await section.getByRole('button', { name: 'Publish Decision' }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, 'local-persist-admin-publish.png'), fullPage: true });

    const token = await page.evaluate(() => localStorage.getItem('token') || '');
    if (!token) {
      throw new Error('No token found after admin login');
    }

    const persisted = await page.evaluate(async ({ apiBase, token }) => {
      const res = await fetch(`${apiBase}/governance/admin-responses`, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      });
      const data = await res.json();
      return { status: res.status, data };
    }, { apiBase, token });

    report.backendPersistence = {
      status: persisted.status,
      found: Boolean(
        persisted?.data?.items?.find(
          (item) => item && item.proposalId === 'PROP-101' && String(item.reason || '').includes(String(stamp))
        )
      ),
    };

    await context.close();

    const context2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page2 = await context2.newPage();
    await page2.goto(`${frontend}/#/conference`, { waitUntil: 'domcontentloaded' });
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(1000);

    const proposalCard = page2.locator('article').filter({ hasText: 'PROP-101' }).first();
    const reasonVisible = await proposalCard.getByText(reason, { exact: false }).first().isVisible().catch(() => false);
    const acceptedVisible = await proposalCard.getByText('Accepted', { exact: false }).first().isVisible().catch(() => false);

    report.conferenceHydration = {
      proposalVisible: await proposalCard.isVisible().catch(() => false),
      acceptedVisible,
      reasonVisible,
    };

    await page2.screenshot({ path: path.join(outDir, 'local-persist-conference.png'), fullPage: true });
    await context2.close();

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report-local-persistence-proof.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const out = { error: String(error), stack: error?.stack || null, partial: report };
    fs.writeFileSync(path.join(outDir, 'error-local-persistence-proof.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
