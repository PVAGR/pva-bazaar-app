#!/usr/bin/env node
// Phase 7: core public API smoke test (read-only, no deps).
// Verifies the API endpoints the frontend depends on for first-paint
// content respond correctly. Complements verify-live-ready.mjs (which
// checks infra health) by proving the DATA endpoints work.
const BACKEND = (process.env.BACKEND_URL || 'https://pva-backend-api.vercel.app').replace(/\/+$/, '');

let failures = 0;

async function check(name, path, validate, method = 'GET') {
  try {
    const res = await fetch(`${BACKEND}${path}`, { method, signal: AbortSignal.timeout(20000) });
    const json = await res.json().catch(() => null);
    // The validator owns the decision: 401-expecting checks must see the
    // real status, not be gated behind res.ok.
    const ok = validate(json, res.status);
    if (ok) {
      console.log(`✅ ${name} (${res.status})`);
    } else {
      failures += 1;
      console.error(`❌ ${name} -> status=${res.status} ok=${json?.ok}`);
    }
  } catch (err) {
    failures += 1;
    console.error(`❌ ${name} -> ${err.message}`);
  }
}

console.log(`Core API smoke target: ${BACKEND}`);

// Health + identity
await check('health', '/api/health', (j) => j?.ok === true);
await check('ping', '/api/ping', (j) => j?.ok === true);
await check('version', '/api/version', (j) => j?.ok === true && typeof j?.shortSha === 'string');

// First-paint data endpoints (used by homepage/marketplace/books)
await check('home-feed', '/api/home-feed', (j) => j?.ok === true || Array.isArray(j?.items) || Array.isArray(j?.artifacts));
await check('items (marketplace)', '/api/items?limit=3', (j) => j?.ok === true && Array.isArray(j?.items));
await check('archive', '/api/archive', (j) => j?.ok === true && Array.isArray(j?.entries || j?.items));
await check('public books', '/api/book-publishing/public?limit=3', (j) => j?.ok === true && Array.isArray(j?.items));
await check('universal search', '/api/search/text?q=test', (j) => j?.ok === true || j?.success === true);
await check('blogs', '/api/blogs', (j) => j?.ok === true && Array.isArray(j?.blogs));

// Auth-gated routes must REJECT anonymous access (401, not 200/500)
await check('users/profile rejects anon (401)', '/api/users/profile', (_j, status) => status === 401);
await check('deals rejects anon (401)', '/api/deals', (_j, status) => status === 401);

// OpenClaw bridge must FAIL CLOSED (401 without secret/admin).
// Pre-deploy: these return 200 (the auth hole). Post-deploy: 401.
await check('openclaw/queue-stats fails closed (401)', '/api/openclaw/queue-stats', (_j, status) => status === 401);
await check('openclaw/recover fails closed (401)', '/api/openclaw/recover', (_j, status) => status === 401, 'POST');
await check('openclaw/agent-config fails closed (401)', '/api/openclaw/agent-config', (_j, status) => status === 401);

// OpenClaw public status stays open (used by admin UI + readiness)
await check('openclaw/status public', '/api/openclaw/status', (j) => j?.ok === true);

if (failures > 0) {
  console.error(`\n❌ ${failures} core API check(s) failed.`);
  process.exit(1);
}
console.log('\n✅ Core public API smoke passed.');
