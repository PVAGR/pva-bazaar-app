const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.LOCAL_FRONTEND_URL || 'http://localhost:5174';
  const outDir = path.join(process.cwd(), 'tmp-production-admin-auth-diagnosis');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const stamp = Date.now();
  const proposalTitle = `LOCAL PROOF ${stamp}`;

  const report = {
    baseUrl,
    startedAt: new Date().toISOString(),
    proposalTitle,
    loginAttempts: [],
  };

  const credentials = [
    { user: 'admin@pvabazaar.org', pass: 'admin123', label: 'seed-admin' },
    { user: 'richyrichaii', pass: 'pva123zxc!', label: 'env-admin' },
  ];

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto(`${baseUrl}/#/conference`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await page.locator('#gov-title').fill(proposalTitle);
    await page.locator('#gov-problem').fill('Local proof problem');
    await page.locator('#gov-proposal').fill('Local proof proposal body');
    await page.locator('#gov-outcome').fill('Local proof expected outcome');
    await page.locator('#gov-cost').fill('Local proof resource plan');
    await page.locator('#gov-timeline').fill('7 days');
    await page.getByRole('button', { name: 'Submit Proposal' }).click();

    const proposalCard = page.locator('article').filter({ hasText: proposalTitle }).first();
    await proposalCard.waitFor({ timeout: 15000 });

    report.proposalCreated = true;
    await page.screenshot({ path: path.join(outDir, 'local-01-conference-created.png'), fullPage: true });

    await page.goto(`${baseUrl}/#/admin/governance`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    report.redirect = {
      finalUrl: page.url(),
      preservedNext: page.url().includes('next=%2Fadmin%2Fgovernance'),
      loginModeVisible: await page.getByText('Enter your credentials to access the admin panel.', { exact: false }).first().isVisible().catch(() => false),
      signupModeVisible: await page.getByText('Create your admin account to initialize the panel.', { exact: false }).first().isVisible().catch(() => false),
    };

    let loggedIn = false;
    for (const cred of credentials) {
      if (await page.getByRole('button', { name: 'Switch to Login' }).isVisible().catch(() => false)) {
        await page.getByRole('button', { name: 'Switch to Login' }).click();
        await page.waitForTimeout(250);
      }

      await page.getByPlaceholder('Username or Email').fill(cred.user).catch(() => {});
      await page.getByPlaceholder('Password').fill(cred.pass).catch(() => {});
      await page.locator('form button[type="submit"]').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(700);

      const governanceVisible = await page.getByText('Admin Governance Decisions', { exact: false }).first().isVisible().catch(() => false);
      const url = page.url();
      const hasToken = await page.evaluate(() => Boolean(localStorage.getItem('token')));
      const alertText = await page.locator('[role="alert"]').allTextContents().catch(() => []);

      report.loginAttempts.push({
        label: cred.label,
        user: cred.user,
        finalUrl: url,
        governanceVisible,
        hasToken,
        alertText,
      });

      if (governanceVisible && hasToken) {
        loggedIn = true;
        report.loginSuccess = { label: cred.label, user: cred.user, finalUrl: url };
        break;
      }
    }

    if (!loggedIn) {
      throw new Error('Could not establish local admin session with available credentials');
    }

    const governanceProposalSection = page.locator('section').filter({ hasText: proposalTitle }).first();
    await governanceProposalSection.waitFor({ timeout: 12000 });

    await governanceProposalSection.locator('select').first().selectOption('accepted');
    await governanceProposalSection.locator('textarea').first().fill(`Accepted by local proof ${stamp}`);
    await governanceProposalSection.getByRole('button', { name: 'Publish Decision' }).click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(outDir, 'local-02-admin-published.png'), fullPage: true });

    await page.goto(`${baseUrl}/#/conference`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const conferenceCard = page.locator('article').filter({ hasText: proposalTitle }).first();
    await conferenceCard.waitFor({ timeout: 10000 });

    report.conferenceReflection = {
      proposalVisible: await conferenceCard.isVisible().catch(() => false),
      acceptedVisible: await conferenceCard.getByText('Accepted', { exact: false }).first().isVisible().catch(() => false),
      reasonVisible: await conferenceCard.getByText('Accepted by local proof', { exact: false }).first().isVisible().catch(() => false),
    };

    await page.screenshot({ path: path.join(outDir, 'local-03-conference-reflects.png'), fullPage: true });

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(outDir, 'report-local-proof.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const out = {
      error: String(error),
      stack: error?.stack || null,
      partial: report,
      at: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(outDir, 'error-local-proof.json'), JSON.stringify(out, null, 2));
    console.error(JSON.stringify(out, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
