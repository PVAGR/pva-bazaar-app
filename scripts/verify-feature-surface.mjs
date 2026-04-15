/**
 * Extra GET coverage for major product surfaces (tabs, hubs, public APIs).
 * Run after verify:network / verify:live. No secrets.
 *
 *   node scripts/verify-feature-surface.mjs
 *   BACKEND_URL=https://pva-bazaar-app-1.onrender.com node scripts/verify-feature-surface.mjs
 */
const DEFAULT_BACKEND = "https://pva-bazaar-app-1.onrender.com";
const TIMEOUT_MS = 45_000;

const base = String(process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "");

/** [label, path, acceptableHttpStatuses] */
const PROBES = [
  // Catalog & commerce (SPA marketplace uses /api/items)
  ["items list", "/api/items?limit=3", [200]],
  ["item inquiries (unauth)", "/api/item-inquiries", [401, 403]],
  // Governance & civic
  ["governance proposals", "/api/governance/proposals", [200]],
  ["governance proposal detail placeholder", "/api/governance/proposals/000000000000000000000000", [200, 400, 404]],
  // Deals & identity
  ["deals join gate", "/api/deals/join", [200, 401, 403]],
  // Blockchain & infra
  ["blockchain health", "/api/blockchain/health", [200]],
  ["decentralized status", "/api/decentralized/status", [200]],
  ["decentralized ready", "/api/decentralized/ready", [200]],
  ["health-check endpoints manifest", "/api/health-check/endpoints", [200]],
  // Content & library
  ["blogs", "/api/blogs", [200]],
  ["library taxonomy", "/api/library-taxonomy", [200]],
  ["career quiz definition", "/api/career-quiz/definition", [200]],
  // Forums (root path is not a route; categories is)
  ["forum categories", "/api/forums/categories", [200]],
  // Agent & help
  ["agent status", "/api/agent/status", [200]],
  ["ai-help guide", "/api/ai-help/guides/getting-started", [200]],
  // OpenClaw extras
  ["openclaw recent events", "/api/openclaw/recent-events?limit=3", [200, 401, 403]],
  // Journal & messaging (auth surfaces)
  ["journal feed (auth)", "/api/journal", [401, 403]],
  ["messages conversations (auth)", "/api/messages/conversations", [401, 403]],
  // Admin HTTP surface (session required)
  ["admin status (session)", "/api/admin/status", [401, 403]],
  ["admin stats (session)", "/api/admin/stats", [401, 403]],
  // Broker hub APIs (already in verify:network; repeat for grouping)
  ["commodities (auth)", "/api/commodities", [401, 403]],
  ["contacts (auth)", "/api/contacts", [401, 403]],
  ["templates (auth)", "/api/templates", [401, 403]],
  // Legacy-gated REST (410 = intentionally retired path; still "connected")
  ["legacy marketplace mount", "/api/marketplace", [410]],
  ["legacy market mount", "/api/market", [410]],
  ["legacy artifacts mount", "/api/artifacts", [410]],
  // Orders (may be 401 or 403 depending on middleware)
  ["orders (auth)", "/api/orders", [401, 403]],
  ["users profile (auth)", "/api/users/profile", [200, 401, 403]],
  ["passport by user placeholder", "/api/passport/user/000000000000000000000000", [400, 404]],
];

async function probe(method, url, { acceptable = [200], headers = {} } = {}) {
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

console.log(`Feature surface probes (backend): ${base}\n`);

let failed = 0;
for (const [label, path, acceptable] of PROBES) {
  const url = `${base}${path}`;
  const r = await probe("GET", url, { acceptable });
  if (!r.ok) {
    console.error(`FAIL [${label}] ${path} -> ${r.status}${r.error ? ` (${r.error})` : ""}`);
    failed++;
  } else {
    console.log(`OK   [${label}] ${path} -> ${r.status}`);
  }
}

console.log("");
if (failed > 0) {
  console.error(`${failed} feature-surface probe(s) failed.`);
  process.exit(1);
}
console.log("All feature-surface probes passed.");
