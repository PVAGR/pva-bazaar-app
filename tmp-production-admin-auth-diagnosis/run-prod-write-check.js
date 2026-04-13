const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const frontend = 'https://pvabazaar.org';
  const apiBase = 'https://api.pvabazaar.org/api';
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const stamp = Date.now();
  const signupEmail = `atlas-verify-${stamp}@pvabazaar.org`;
  const signupUsername = `atlasverify${stamp}`;
  const password = 'AtlasVerify123!';
  const reason = `Atlas upgrade verification ${stamp}`;

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const report = {
    startedAt: new Date().toISOString(),
    frontend,
    apiBase,
    signupEmail,
    signupUsername,
    reason,
  };

  try {
    // API: signup
    let signupResponse = null;
    try {
      const res = await fetch(`${apiBase}/admin/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Atlas Verify Admin',
          username: signupUsername,
          email: signupEmail,
          password,
        }),
      });
      signupResponse = { status: res.status, body: await res.text() };
    } catch (error) {
      signupResponse = { error: String(error) };
    }
    report.signup = signupResponse;

    // API: login with known production admin credentials.
    const loginRes = await fetch(`${apiBase}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'richyrichaii', password: 'pva123zxc!' }),
    });
    const loginBody = await loginRes.text();
    report.login = { status: loginRes.status, body: loginBody };
    const token = (() => {
      try { return JSON.parse(loginBody).token || ''; } catch (_e) { return ''; }
    })();

    if (!token) {
      throw new Error('Production admin login did not yield a token');
    }

    // API: write governance admin response.
    const writePayload = {
      decision: 'accepted',
      reason,
      nextStep: `Atlas upgrade verification next step ${stamp}`,
      targetTimeline: 'T+7 days',
      executionBlock: {
        owner: 'Production Admin',
        milestones: [
          { id: 'M-1', title: 'Confirm write path', done: true },
          { id: 'M-2', title: 'Confirm conference hydration', done: false },
        ],
        progressPercent: 20,
        latestUpdate: 'Verification write initiated',
        completed: false,
      },
    };

    const putRes = await fetch(`${apiBase}/governance/admin-responses/PROP-101`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(writePayload),
    });
    const putBody = await putRes.text();
    report.write = { status: putRes.status, body: putBody };

    // API: read governance admin responses.
    const readRes = await fetch(`${apiBase}/governance/admin-responses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const readBody = await readRes.text();
    report.read = { status: readRes.status, body: readBody };

    // Browser: login and check admin/governance + conference.
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.goto(`${frontend}/#/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    if (await page.getByRole('button', { name: 'Switch to Login' }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Switch to Login' }).click();
      await page.waitForTimeout(250);
    }

    await page.getByPlaceholder('Username or Email').fill('richyrichaii');
    await page.getByPlaceholder('Password').fill('pva123zxc!');
    await page.locator('form button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    report.browserAdmin = {
      finalUrl: page.url(),
      governanceVisible: await page.getByText('Admin Governance Decisions', { exact: false }).first().isVisible().catch(() => false),
      tokenPresent: await page.evaluate(() => Boolean(localStorage.getItem('token'))),
    };

    await page.goto(`${frontend}/#/conference`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const card = page.locator('article').filter({ hasText: 'PROP-101' }).first();
    report.conference = {
      finalUrl: page.url(),
      proposalVisible: await card.isVisible().catch(() => false),
      reasonVisible: await card.getByText(reason, { exact: false }).first().isVisible().catch(() => false),
      acceptedVisible: await card.getByText('Accepted', { exact: false }).first().isVisible().catch(() => false),
    };

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const cardAfterRefresh = page.locator('article').filter({ hasText: 'PROP-101' }).first();
    report.conferenceAfterRefresh = {
      proposalVisible: await cardAfterRefresh.isVisible().catch(() => false),
      reasonVisible: await cardAfterRefresh.getByText(reason, { exact: false }).first().isVisible().catch(() => false),
      acceptedVisible: await cardAfterRefresh.getByText('Accepted', { exact: false }).first().isVisible().catch(() => false),
    };

    await page.screenshot({ path: path.join(outDir, 'prod-write-check.png'), fullPage: true });
    await context.close();

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report-prod-write-check.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const out = { error: String(error), stack: error?.stack || null, partial: report };
    fs.writeFileSync(path.join(outDir, 'error-prod-write-check.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
