const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  try {
    await page.goto('https://pvabazaar.org/#/conference', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const report = {
      finalUrl: page.url(),
      citizenMembershipVisible: await page.getByText('Citizen Membership', { exact: false }).first().isVisible().catch(() => false),
      proposalInputVisible: await page.locator('#gov-title').isVisible().catch(() => false),
      seededProposalVisible: await page.getByText('PROP-101', { exact: false }).first().isVisible().catch(() => false),
    };
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ error: String(error), stack: error?.stack || null }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
