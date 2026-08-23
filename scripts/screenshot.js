const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    console.log('Loading homepage...');
    await page.goto('https://pvabazaar.org', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'home_before.png', fullPage: true });
    console.log('Saved home_before.png');

    const toggle = await page.$('.theme-toggle');
    if (toggle) {
      console.log('Clicking theme toggle...');
      await toggle.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'home_after.png', fullPage: true });
      console.log('Saved home_after.png');
    } else {
      console.log('Theme toggle not found.');
    }

    // Open archive page by clicking first entry item if present
    const entry = await page.$('.entry-item');
    if (entry) {
      console.log('Clicking first archive entry...');
      await entry.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'article.png', fullPage: true });
      console.log('Saved article.png');
    } else {
      console.log('No entry-item found on homepage.');
    }
  } catch (err) {
    console.error('Error during screenshots:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
