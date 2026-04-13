const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const report = { startedAt: new Date().toISOString(), attempts: [] };

  const candidates = [
    { user: 'admin@pvabazaar.org', pass: 'admin123', label: 'seed-doc-credentials' },
    { user: 'richyrichaii', pass: 'pva123zxc!', label: 'env-style-credentials' }
  ];

  try {
    for (const candidate of candidates) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      const apiTrace = [];

      page.on('response', async (res) => {
        const url = res.url();
        if (!/\/api\/admin\/(login|status)/.test(url)) return;
        let body = '';
        try {
          body = await res.text();
        } catch (_e) {
          body = '<unreadable>';
        }
        apiTrace.push({ url, status: res.status(), body: body.slice(0, 500) });
      });

      await page.goto('https://pvabazaar.org/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
      await page.goto('https://pvabazaar.org/#/admin/governance', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      if (await page.getByRole('button', { name: 'Switch to Login' }).isVisible().catch(() => false)) {
        await page.getByRole('button', { name: 'Switch to Login' }).click();
        await page.waitForTimeout(300);
      }

      await page.getByPlaceholder('Username or Email').fill(candidate.user).catch(() => {});
      await page.getByPlaceholder('Password').fill(candidate.pass).catch(() => {});
      await page.locator('form button[type="submit"]').click();
      await page.waitForTimeout(2200);

      const finalUrl = page.url();
      const hasAdminGovernanceTitle = await page.getByText('Admin Governance Decisions', { exact: false }).first().isVisible().catch(() => false);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      report.attempts.push({
        label: candidate.label,
        usernameOrEmail: candidate.user,
        finalUrl,
        hasToken: Boolean(token),
        governanceVisible: hasAdminGovernanceTitle,
        alertText: await page.locator('[role="alert"]').allTextContents().catch(() => []),
        apiTrace,
      });

      await page.screenshot({ path: path.join(outDir, `session-${candidate.label}.png`), fullPage: true });
      await context.close();
    }

    const c = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p = await c.newPage();
    await p.goto('https://pvabazaar.org/#/conference', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    report.conference = {
      finalUrl: p.url(),
      hasCitizenMembership: await p.getByText('Citizen Membership', { exact: false }).first().isVisible().catch(() => false),
      hasProposalInput: await p.locator('#gov-title').isVisible().catch(() => false),
    };
    await p.screenshot({ path: path.join(outDir, 'conference-check.png'), fullPage: true });
    await c.close();

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report-session-check.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const out = { error: String(error), stack: error?.stack || null };
    fs.writeFileSync(path.join(outDir, 'error-session-check.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
