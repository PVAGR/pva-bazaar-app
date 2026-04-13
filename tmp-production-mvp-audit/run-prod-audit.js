const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function parseSupport(text) {
  const m = String(text || '').match(/(\d+)\s*$/);
  return m ? Number(m[1]) : NaN;
}

(async () => {
  const outDir = path.join(process.cwd(), 'tmp-production-mvp-audit');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const shots = {
    root: path.join(outDir, 'root.png'),
    conferenceBefore: path.join(outDir, 'conference-before.png'),
    conferenceAfter: path.join(outDir, 'conference-after.png'),
    adminDiagnostic: path.join(outDir, 'admin-diagnostic.png'),
  };

  const results = [];
  const log = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
  };

  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  const stamp = Date.now();
  const proposalTitle = `PROD AUDIT ${stamp}`;
  const proposalComment = `PROD AUDIT COMMENT ${stamp}`;

  let adminWithoutToken = { url: '', title: '', h1: [] };
  let adminWithToken = { url: '', title: '', h1: [], governanceVisible: false };

  try {
    await page.goto('https://pvabazaar.org/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());

    await page.goto('https://pvabazaar.org/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: shots.root, fullPage: true });
    log('Root page loads on production', true, `title=${await page.title()}`);

    await page.goto('https://pvabazaar.org/#/conference', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: shots.conferenceBefore, fullPage: true });

    const conferenceLoaded = await page.getByText('Citizen Membership', { exact: false }).first().isVisible().catch(() => false);
    log('Conference page loads', conferenceLoaded, 'Citizen Membership visible check');

    const requiredFields = ['Title', 'Problem', 'Committee Category', 'Urgency', 'Proposal', 'Expected Outcome', 'Cost / Resources', 'Target Timeline (optional)'];
    let formVisible = true;
    for (const f of requiredFields) {
      const ok = await page.getByText(f, { exact: false }).first().isVisible().catch(() => false);
      if (!ok) {
        formVisible = false;
        break;
      }
    }
    log('Proposal form has expanded fields', formVisible, requiredFields.join(', '));

    const seededVisible =
      (await page.getByText('PROP-101', { exact: false }).first().isVisible().catch(() => false)) &&
      (await page.getByText('PROP-102', { exact: false }).first().isVisible().catch(() => false)) &&
      (await page.getByText('PROP-103', { exact: false }).first().isVisible().catch(() => false));
    log('Seeded proposals render', seededVisible, 'PROP-101/102/103');

    await page.locator('#gov-title').fill(proposalTitle);
    await page.locator('#gov-problem').fill('PROD AUDIT problem statement');
    await page.locator('#gov-proposal').fill('PROD AUDIT proposal body');
    await page.locator('#gov-outcome').fill('PROD AUDIT expected outcome');
    await page.locator('#gov-cost').fill('PROD AUDIT resources and budget');
    await page.locator('#gov-timeline').fill('PROD AUDIT timeline 14 days');
    await page.getByRole('button', { name: 'Submit Proposal' }).click();

    const auditCard = page.locator('article').filter({ hasText: proposalTitle }).first();
    await auditCard.waitFor({ timeout: 15000 });
    log('Disposable PROD AUDIT proposal created', true, proposalTitle);

    const supportBtn = auditCard.locator('.gov-card-actions button').first();
    const s0 = parseSupport(await supportBtn.innerText());
    await supportBtn.click();
    await page.waitForTimeout(250);
    const s1 = parseSupport(await supportBtn.innerText());
    log('Support once works', Number.isFinite(s0) && s1 === s0 + 1, `${s0} -> ${s1}`);

    await supportBtn.click();
    await page.waitForTimeout(250);
    const s2 = parseSupport(await supportBtn.innerText());
    log('Second support attempt blocked', s2 === s1, `${s1} -> ${s2}`);

    await auditCard.getByPlaceholder('Add a public comment to this proposal').fill(proposalComment);
    await auditCard.getByRole('button', { name: 'Add Comment' }).click();
    await page.getByText(proposalComment, { exact: false }).first().waitFor({ timeout: 10000 });
    log('Comment added to PROD AUDIT proposal', true, proposalComment);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const persistedCard = page.locator('article').filter({ hasText: proposalTitle }).first();
    const persistedProposal = await persistedCard.isVisible().catch(() => false);
    const persistedComment = await persistedCard.getByText(proposalComment, { exact: false }).first().isVisible().catch(() => false);
    log('Proposal persists after refresh in same context', persistedProposal, `proposal=${persistedProposal}`);
    log('Comment persists after refresh in same context', persistedComment, `comment=${persistedComment}`);

    await page.screenshot({ path: shots.conferenceAfter, fullPage: true });

    await page.goto('https://pvabazaar.org/#/admin/governance', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    adminWithoutToken.url = page.url();
    adminWithoutToken.title = await page.title();
    adminWithoutToken.h1 = await page.locator('h1').allTextContents();

    log('Admin diagnostic without token', true, `url=${adminWithoutToken.url}; title=${adminWithoutToken.title}; h1=${JSON.stringify(adminWithoutToken.h1)}`);

    await page.evaluate(() => localStorage.setItem('token', 'prod-audit-disposable-token'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    adminWithToken.url = page.url();
    adminWithToken.title = await page.title();
    adminWithToken.h1 = await page.locator('h1').allTextContents();
    adminWithToken.governanceVisible = await page.getByText('Admin Governance Decisions', { exact: false }).first().isVisible().catch(() => false);

    log('Admin diagnostic with disposable token', true, `url=${adminWithToken.url}; governanceVisible=${adminWithToken.governanceVisible}; h1=${JSON.stringify(adminWithToken.h1)}`);

    await page.screenshot({ path: shots.adminDiagnostic, fullPage: true });

    console.log('SCREENSHOT_ROOT', shots.root);
    console.log('SCREENSHOT_CONF_BEFORE', shots.conferenceBefore);
    console.log('SCREENSHOT_CONF_AFTER', shots.conferenceAfter);
    console.log('SCREENSHOT_ADMIN', shots.adminDiagnostic);
    console.log('AUDIT_TITLE', proposalTitle);
    console.log('AUDIT_COMMENT', proposalComment);

    const failed = results.filter(r => !r.ok).length;
    console.log(`SUMMARY | total=${results.length} | failed=${failed}`);
    if (failed > 0) process.exitCode = 2;
  } catch (err) {
    console.error('FATAL', err && err.stack ? err.stack : err);
    process.exitCode = 3;
  } finally {
    await browser.close();
  }
})();
