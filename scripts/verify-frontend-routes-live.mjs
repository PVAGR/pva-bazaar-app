import { chromium } from 'playwright';

const FRONTEND = (process.env.FRONTEND_URL || 'https://pvabazaar.org').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS || 25000);

const ROUTES = [
  '/admin',
  '/login',
  '/register',
  '/chat',
  '/',
  '/home',
  '/library',
  '/archive',
  '/creator',
  '/civilization-library',
  '/career-quiz',
  '/about',
  '/agent',
  '/citizens',
  '/forum',
  '/governance/conference',
  '/governance/treasury',
  '/marketplace',
  '/showroom',
  '/download-app',
  '/proposals',
  '/conference',
  '/treasury',
  '/deploy',
  '/dashboard',
  '/account',
  '/onboarding',
  '/passport',
  '/items/new',
  '/items/mine',
  '/deals',
  '/deals/join',
  '/broker-hub',
  '/commodities',
  '/contacts',
  '/templates',
  '/creator/dashboard',
];

function fullUrl(route) {
  return `${FRONTEND}/#${route}`;
}

function isIgnorableConsoleError(text) {
  const msg = String(text || '').toLowerCase();
  return (
    msg.includes('favicon') ||
    msg.includes('failed to load resource: the server responded with a status of 404') ||
    msg.includes('net::err_blocked_by_client')
  );
}

async function checkRoute(browser, route) {
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    pageErrors.push(String(err?.message || err));
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!isIgnorableConsoleError(txt)) consoleErrors.push(txt);
    }
  });

  const target = fullUrl(route);
  let ok = false;
  let reason = '';

  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await page.waitForTimeout(1200);

    const state = await page.evaluate(() => {
      const root = document.querySelector('#root');
      const text = (document.body?.innerText || '').trim();
      const rootChildren = root?.children?.length || 0;
      const hasAnyVisibleBlock = Array.from(
        document.querySelectorAll(
          'main, section, article, [role="main"], .section-card, .admin-page',
        ),
      ).some((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 40 && rect.height > 40;
      });
      return {
        textLength: text.length,
        rootChildren,
        hasAnyVisibleBlock,
        title: document.title || '',
      };
    });

    if (pageErrors.length > 0) {
      reason = `runtime error: ${pageErrors[0]}`;
    } else if (consoleErrors.length > 0) {
      reason = `console error: ${consoleErrors[0]}`;
    } else if (state.rootChildren === 0) {
      reason = 'blank root (no rendered children)';
    } else if (state.textLength < 20 && !state.hasAnyVisibleBlock) {
      reason = `low visible content (textLength=${state.textLength})`;
    } else {
      ok = true;
    }
  } catch (err) {
    reason = `navigation failure: ${err?.message || err}`;
  } finally {
    await page.close();
  }

  return { route, ok, reason };
}

async function main() {
  console.log(`Route sweep target: ${FRONTEND}`);
  console.log(`Routes to check: ${ROUTES.length}`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const route of ROUTES) {
    const result = await checkRoute(browser, route);
    results.push(result);
    if (result.ok) {
      console.log(`OK   ${route}`);
    } else {
      console.log(`FAIL ${route} -> ${result.reason}`);
    }
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} route(s) failed route sweep.`);
    process.exit(1);
  }

  console.log('\nAll checked routes rendered without blank-page runtime failures.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
