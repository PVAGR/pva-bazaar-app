/**
 * Thorough HTTP connectivity sweep for the deployed API (no secrets).
 *
 * Usage:
 *   node scripts/verify-backend-network.mjs
 *   BACKEND_URL=https://pva-bazaar-app-1.onrender.com node scripts/verify-backend-network.mjs
 *
 * Exits non-zero if any probe fails with a network error, timeout, or unexpected HTTP status.
 */
const DEFAULT_BACKEND = "https://pva-bazaar-app-1.onrender.com";
const TIMEOUT_MS = 25_000;

const base = String(process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "");

/** GET paths: [path, acceptableStatusCodes] — 401/403 mean "route exists, auth required". */
const GET_PROBES = [
  ["/api/health-check", [200]],
  ["/api/health-check/test", [200]],
  ["/api/health", [200]],
  ["/api/ping", [200]],
  ["/api/version", [200]],
  ["/api/archive", [200]],
  ["/api/search/text?q=test", [200]],
  ["/api/career-quiz/definition", [200]],
  ["/api/openapi.json", [200]],
  ["/api/openclaw/status", [200]],
  ["/api/openclaw/watchdog-status", [200]],
  ["/api/oauth/twitch/status", [200]],
  ["/api/oauth/youtube/status", [200]],
  ["/api/deals", [200, 401, 403]],
  ["/api/bounties", [200, 401, 403]],
  ["/api/users/profile", [200, 401, 403]],
  ["/api/streams", [200, 401, 403]],
  ["/api/commodities", [401, 403]],
  ["/api/contacts", [401, 403]],
  ["/api/templates", [401, 403]],
  ["/api/docs", [200]],
  ["/Frontend/dist/index.html", [200, 404]], // optional static; 404 ok if not served from API
];

async function probe(method, url, { headers = {}, acceptable = [200] } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, headers, redirect: "follow", signal: controller.signal });
    clearTimeout(t);
    const ok = acceptable.includes(res.status);
    return { ok, status: res.status, url };
  } catch (e) {
    clearTimeout(t);
    const name = e?.name === "AbortError" ? "timeout" : e?.code || e?.name || "error";
    return { ok: false, status: 0, url, error: `${name}: ${e?.message || e}` };
  }
}

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

console.log(`Backend base: ${base}\n`);

let failed = 0;

for (const [path, acceptableStatuses] of GET_PROBES) {
  const url = `${base}${path}`;
  const r = await probe("GET", url, { acceptable: acceptableStatuses });
  if (!r.ok) {
    console.error(`FAIL ${path} -> ${r.status}${r.error ? ` (${r.error})` : ""}`);
    failed++;
  } else {
    console.log(`OK   ${path} -> ${r.status}`);
  }
}

// CORS preflight (browser-like): API must respond without throwing.
const corsUrl = `${base}/api/health`;
const cors = await probe("OPTIONS", corsUrl, {
  acceptable: [200, 204],
  headers: {
    Origin: "https://pvabazaar.org",
    "Access-Control-Request-Method": "GET",
  },
});
if (!cors.ok) {
  console.error(`FAIL CORS OPTIONS /api/health -> ${cors.status}${cors.error ? ` (${cors.error})` : ""}`);
  failed++;
} else {
  console.log(`OK   CORS OPTIONS /api/health -> ${cors.status}`);
}

// Deep health JSON checks
const hc = await probe("GET", `${base}/api/health-check`, { acceptable: [200] });
if (hc.ok) {
  try {
    const res = await fetch(`${base}/api/health-check`);
    const j = await res.json();
    if (!j.summary?.database_ok) {
      fail("FAIL health-check: database_ok is false");
      failed++;
    } else if (j.checks?.environment?.status === "warning") {
      console.warn(`WARN health-check environment: ${j.checks.environment.message}`);
    } else {
      console.log("OK   health-check summary: database_ok=true");
    }
  } catch (e) {
    fail(`FAIL health-check JSON parse: ${e?.message}`);
    failed++;
  }
}

// Optional: production site (separate host) — warn only, do not fail deploy API checks
const FRONTEND = process.env.FRONTEND_URL || "https://pvabazaar.org";
try {
  const home = await probe("GET", `${FRONTEND.replace(/\/+$/, "")}/`, { acceptable: [200, 301, 302, 304] });
  if (home.ok) console.log(`OK   frontend home ${FRONTEND} -> ${home.status}`);
  else console.warn(`WARN frontend home ${FRONTEND} -> ${home.status}`);
} catch {
  console.warn("WARN frontend probe skipped");
}

console.log("");
if (failed > 0) {
  console.error(`\n${failed} probe(s) failed.`);
  process.exit(1);
}
console.log("All network probes passed.");
