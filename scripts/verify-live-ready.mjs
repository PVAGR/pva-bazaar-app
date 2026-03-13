import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const FRONTEND = process.env.FRONTEND_URL || "https://pvabazaar.org";
const WAIT_TIMEOUT_MS = Number(process.env.WAIT_TIMEOUT_MS || 60000);
const WAIT_POLL_MS = Number(process.env.WAIT_POLL_MS || 10000);
const STRICT = process.env.STRICT === "true";
const PARITY_REQUIRED = process.env.PARITY_REQUIRED === "true";
const REQUIRE_ADMIN = process.env.REQUIRE_ADMIN === "true";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
let softIssues = 0;

function normalizeBase(url) {
  return (url || "").replace(/\/+$/, "").replace(/\/api$/, "");
}

function getBackendFromProjectConfig() {
  try {
    const p = resolve(process.cwd(), "Frontend/public/api-base.json");
    const raw = JSON.parse(readFileSync(p, "utf8"));
    if (raw && typeof raw.apiUrl === "string" && raw.apiUrl.length > 0) {
      return normalizeBase(raw.apiUrl);
    }
  } catch {}
  return null;
}

function getLocalShortSha() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function deriveLiveShortSha(versionPayload) {
  if (!versionPayload || typeof versionPayload !== "object") return null;

  if (typeof versionPayload.shortSha === "string" && versionPayload.shortSha.trim()) {
    return versionPayload.shortSha.trim();
  }

  if (typeof versionPayload.sha === "string" && versionPayload.sha.trim()) {
    const sha = versionPayload.sha.trim();
    if (sha !== "local") {
      return sha.slice(0, 7);
    }
  }

  return null;
}

function isArrayLike(v) {
  return Array.isArray(v) || (v && typeof v === "object" && Array.isArray(v.items));
}

function isLocalhostUrl(url) {
  return typeof url === "string" && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { res, text };
}

async function getJson(url) {
  const { res, text } = await get(url);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, json, text };
}

async function getJsonWithHeaders(url, headers = {}) {
  const res = await fetch(url, { headers, redirect: "follow" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, json, text };
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
    redirect: "follow",
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, json, text };
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function softWarn(msg) {
  softIssues += 1;
  console.warn(`⚠️ ${msg}`);
}

const BACKEND =
  normalizeBase(process.env.BACKEND_URL) ||
  getBackendFromProjectConfig() ||
  FRONTEND;

console.log("== Live readiness check ==");
console.log(`Frontend: ${FRONTEND}`);
console.log(`Backend:  ${BACKEND}`);

const health = await getJson(`${BACKEND}/api/health`);
if (!health.res.ok || !health.json?.ok) fail(`/api/health failed (${health.res.status})`);
else console.log("✅ health ok");

const ping = await getJson(`${BACKEND}/api/ping`);
if (!ping.res.ok || !ping.json?.ok) fail(`/api/ping failed (${ping.res.status})`);
else console.log("✅ ping ok");

const version = await getJson(`${BACKEND}/api/version`);
if (!version.res.ok || !version.json?.ok) fail(`/api/version failed (${version.res.status})`);
else console.log("✅ version ok");

const archive = await getJson(`${BACKEND}/api/archive`);
const entries = archive.json?.entries || archive.json?.items;
if (!archive.res.ok || archive.json?.ok !== true || !Array.isArray(entries)) fail(`/api/archive failed (${archive.res.status})`);
else console.log("✅ archive ok");

const search = await getJson(`${BACKEND}/api/search/text?q=test`);
const searchOk =
  search.res.ok &&
  search.json &&
  (search.json.success === true || search.json.ok === true) &&
  isArrayLike(search.json.results || search.json.data);
if (!searchOk) fail(`/api/search/text failed (${search.res.status})`);
else console.log("✅ search ok");

const openclawStatus = await getJson(`${BACKEND}/api/openclaw/status`);
const openclawStatusOk =
  openclawStatus.res.ok &&
  openclawStatus.json?.ok === true &&
  openclawStatus.json?.configured === true &&
  typeof openclawStatus.json?.mode === 'string';
if (!openclawStatusOk) {
  fail(`/api/openclaw/status failed (${openclawStatus.res.status})`);
} else {
  const queue = openclawStatus.json?.queue || {};
  const stale = Number(queue.stale || 0);
  if (stale > 0) {
    softWarn(`/api/openclaw/status reports stale queue items (${stale})`);
  }
  console.log(`✅ openclaw status ok (${openclawStatus.json.mode}, pending=${queue.pending ?? 0}, stale=${stale})`);
}

const openclawWatchdog = await getJson(`${BACKEND}/api/openclaw/watchdog-status`);
const openclawWatchdogOk =
  openclawWatchdog.res.ok &&
  openclawWatchdog.json?.ok === true &&
  typeof openclawWatchdog.json?.available === 'boolean';
if (!openclawWatchdogOk) {
  fail(`/api/openclaw/watchdog-status failed (${openclawWatchdog.res.status})`);
} else if (openclawWatchdog.json?.summary?.state && openclawWatchdog.json.summary.state !== 'ok') {
  softWarn(`/api/openclaw/watchdog-status degraded (${openclawWatchdog.json.summary.state})`);
  console.log(`✅ openclaw watchdog reachable (${openclawWatchdog.json.summary.state})`);
} else {
  console.log('✅ openclaw watchdog ok');
}

// Auth-required endpoints: accept 401 as "route exists".
const deals = await getJson(`${BACKEND}/api/deals`);
if (deals.res.status === 401) console.log("✅ deals route ok (401 unauth as expected)");
else if (deals.res.ok && deals.json?.ok) console.log("✅ deals ok");
else fail(`/api/deals failed (${deals.res.status})`);

const bounties = await getJson(`${BACKEND}/api/bounties`);
if (bounties.res.status === 401) console.log('✅ bounties route ok (401 unauth as expected)');
else if (bounties.res.ok && bounties.json?.ok) console.log('✅ bounties ok');
else fail(`/api/bounties failed (${bounties.res.status})`);

if (ADMIN_USERNAME && ADMIN_PASSWORD) {
  const adminLogin = await postJson(`${BACKEND}/api/admin/login`, {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });

  if (!adminLogin.res.ok || adminLogin.json?.ok !== true || !adminLogin.json?.token) {
    fail(`/api/admin/login failed (${adminLogin.res.status})`);
  } else {
    console.log('✅ admin login ok');

    const authHeaders = {
      Authorization: `Bearer ${adminLogin.json.token}`,
    };

    const queueStats = await getJsonWithHeaders(`${BACKEND}/api/openclaw/queue-stats`, authHeaders);
    if (!queueStats.res.ok || queueStats.json?.ok !== true) {
      fail(`/api/openclaw/queue-stats failed (${queueStats.res.status})`);
    } else {
      console.log(`✅ openclaw queue-stats ok (pending=${queueStats.json.pendingOutbound ?? 0}, stale=${queueStats.json.staleOutbound ?? 0})`);
    }

    const replayDryRun = await postJson(`${BACKEND}/api/openclaw/replay-webhook`, { dryRun: true, limit: 1 }, authHeaders);
    if (!replayDryRun.res.ok || replayDryRun.json?.ok !== true) {
      softWarn(`/api/openclaw/replay-webhook dry-run failed (${replayDryRun.res.status})`);
    } else {
      console.log('✅ openclaw replay dry-run ok');
    }

    const bountyStats = await getJsonWithHeaders(`${BACKEND}/api/bounties/stats`, authHeaders);
    if (!bountyStats.res.ok || bountyStats.json?.ok !== true) {
      fail(`/api/bounties/stats failed (${bountyStats.res.status})`);
    } else {
      console.log(`✅ bounty stats ok (won=${bountyStats.json.wonCount ?? 0})`);
    }
  }
} else if (REQUIRE_ADMIN) {
  fail('admin checks required, but ADMIN_USERNAME/ADMIN_PASSWORD were not provided');
} else {
  console.log('ℹ️ admin checks skipped: ADMIN_USERNAME/ADMIN_PASSWORD not provided');
}

const profile = await getJson(`${BACKEND}/api/users/profile`);
if (profile.res.status === 401) console.log("✅ users/profile route ok (401 unauth as expected)");
else if (profile.res.ok && profile.json?.ok) console.log("✅ users/profile ok");
else fail(`/api/users/profile failed (${profile.res.status})`);

// Uptime checks: streaming and deals routes
const streams = await getJson(`${BACKEND}/api/streams`);
if (streams.res.status === 401) console.log("✅ streams route ok (401 unauth as expected)");
else if (streams.res.ok && (streams.json?.ok || Array.isArray(streams.json?.streams))) console.log("✅ streams ok");
else softWarn(`/api/streams unavailable (${streams.res.status})`);

const twitchStatus = await getJson(`${BACKEND}/api/oauth/twitch/status`);
if (!twitchStatus.res.ok || twitchStatus.json?.ok !== true) {
  softWarn(`/api/oauth/twitch/status unavailable (${twitchStatus.res.status})`);
} else {
  console.log("✅ twitch status ok");
}

const youtubeStatus = await getJson(`${BACKEND}/api/oauth/youtube/status`);
if (!youtubeStatus.res.ok || youtubeStatus.json?.ok !== true) {
  softWarn(`/api/oauth/youtube/status unavailable (${youtubeStatus.res.status})`);
} else {
  console.log("✅ youtube status ok");
}

const home = await get(`${FRONTEND}/`);
if (!home.res.ok) fail(`frontend / failed (${home.res.status})`);
else console.log("✅ frontend home ok");

const assets = [...home.text.matchAll(/\/assets\/[^"']+\.js/g)].map(m => m[0]);
if (assets.length === 0) fail("frontend bundle references missing");
else console.log(`✅ frontend assets found (${assets.length})`);

const runtimeCfg = await getJson(`${FRONTEND}/public/api-base.json`);
if (!runtimeCfg.res.ok || typeof runtimeCfg.json?.apiUrl !== "string") {
  softWarn("runtime api-base.json unavailable");
} else if (isLocalhostUrl(runtimeCfg.json.apiUrl)) {
  fail(`runtime api-base.json points to localhost (${runtimeCfg.json.apiUrl})`);
} else {
  console.log(`✅ runtime api base: ${runtimeCfg.json.apiUrl}`);
}

console.log("\n== Deploy parity check ==");
const localShortSha = getLocalShortSha();
const deadline = Date.now() + WAIT_TIMEOUT_MS;
let liveShortSha = deriveLiveShortSha(version.json);

if (!localShortSha) {
  if (PARITY_REQUIRED) {
    softWarn("local git short SHA unavailable; parity skipped.");
  } else {
    console.log("ℹ️ parity skipped: local git short SHA unavailable.");
  }
} else if (liveShortSha === localShortSha) {
  console.log(`✅ parity ok (live=${liveShortSha}, local=${localShortSha})`);
} else if (!liveShortSha) {
  if (PARITY_REQUIRED) {
    softWarn("live /api/version has no usable sha/shortSha; cannot prove parity.");
  } else {
    console.log("ℹ️ parity skipped: live /api/version has no usable sha/shortSha.");
  }
} else {
  while (Date.now() < deadline && liveShortSha !== localShortSha) {
    console.log(`⏳ waiting parity: live=${liveShortSha}, local=${localShortSha}`);
    await sleep(WAIT_POLL_MS);
    const next = await getJson(`${BACKEND}/api/version`);
    if (next.res.ok && next.json?.ok) {
      liveShortSha = deriveLiveShortSha(next.json);
      if (!liveShortSha) break;
    }
  }
  if (liveShortSha === localShortSha) {
    console.log(`✅ parity reached (live=${liveShortSha})`);
  } else {
    if (PARITY_REQUIRED) {
      softWarn(`parity pending (live=${liveShortSha || "missing"}, local=${localShortSha})`);
    } else {
      console.log(`ℹ️ parity pending (live=${liveShortSha || "missing"}, local=${localShortSha})`);
    }
  }
}

console.log("\n== Final status ==");
if (process.exitCode && process.exitCode !== 0) {
  console.error("❌ LIVE NOT READY: critical checks failed.");
} else {
  if (STRICT && softIssues > 0) {
    console.error(`❌ LIVE NOT READY (STRICT): ${softIssues} warning(s) present.`);
    process.exitCode = 1;
  } else if (softIssues > 0) {
    console.log(`⚠️ LIVE PARTIAL: core checks passed with ${softIssues} warning(s).`);
  } else {
    console.log("✅ LIVE CONNECTIVITY READY: core frontend/backend routes are reachable and configured.");
  }
}
