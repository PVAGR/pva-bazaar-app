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
  // Phase 7: confirmed public routes that were missing from the sweep.
  '/books',
  '/blog',
  '/partnerships',
  '/partners',
  '/contact',
  '/cart',
  '/recovery',
];

// Deep links verified with a REAL slug/id fetched from the live API, so the
// sweep proves detail pages render, not just that the router matches.
async function resolveDeepLinkRoutes() {
  const apiBase = (process.env.BACKEND_URL || 'https://pva-backend-api.vercel.app').replace(/\/+$/, '');
  const routes = [];

  try {
    const res = await fetch(`${apiBase}/api/blogs?limit=1`, { signal: AbortSignal.timeout(15000) });
    const data = await res.json().catch(() => null);
    const slug = data?.blogs?.[0]?.slug;
    if (slug) routes.push(`/blog/${encodeURIComponent(slug)}`);
  } catch { /* advisory: no published blog posts yet */ }

  try {
    const res = await fetch(`${apiBase}/api/book-publishing/public?limit=1`, { signal: AbortSignal.timeout(15000) });
    const data = await res.json().catch(() => null);
    const slug = data?.items?.[0]?.slug;
    if (slug) routes.push(`/books/read/${encodeURIComponent(slug)}`);
  } catch { /* advisory */ }

  try {
    const res = await fetch(`${apiBase}/api/items?limit=1`, { signal: AbortSignal.timeout(15000) });
    const data = await res.json().catch(() => null);
    const item = data?.items?.[0];
    const slugOrId = item?.slug || item?._id || item?.id;
    if (slugOrId) routes.push(`/marketplace/${encodeURIComponent(slugOrId)}`);
  } catch { /* advisory */ }

  return routes;
}

function fullUrl(route) {
  return `${FRONTEND}/#${route}`;
}

function isIgnorableConsoleError(text) {
  const msg = String(text || '').toLowerCase();
  return (
    msg.includes('favicon') ||
    msg.includes('failed to load resource: the server responded with a status of 401') ||
    msg.includes('failed to load resource: the server responded with a status of 403') ||
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
      const hasAnyVisibleBlock = Array.from(document.querySelectorAll('main, section, article, [role="main"], .section-card, .admin-page'))
        .some((el) => {
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

  const deepLinks = await resolveDeepLinkRoutes();
  const allRoutes = [...ROUTES, ...deepLinks];

  console.log(`Routes to check: ${allRoutes.length} (${deepLinks.length} live deep link(s))`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const route of allRoutes) {
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

