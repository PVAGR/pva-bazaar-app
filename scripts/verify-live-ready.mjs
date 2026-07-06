import { execSync } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import {
  getLatencyThresholds,
  getLiveTargets,
  getRequiredHeaders,
  getRuntimeApiCandidates,
  normalizeApiBase,
} from './live-map.mjs';

const STRICT = process.env.STRICT === 'true';
const PARITY_REQUIRED = process.env.PARITY_REQUIRED === 'true';
const REQUIRE_ADMIN = process.env.REQUIRE_ADMIN === 'true';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const WAIT_TIMEOUT_MS = Number(process.env.WAIT_TIMEOUT_MS || 60000);
const WAIT_POLL_MS = Number(process.env.WAIT_POLL_MS || 10000);

const { map, frontend: FRONTEND, backend: BACKEND, apiBase: API_BASE } = getLiveTargets();
const thresholds = getLatencyThresholds(map);
const requiredHeaders = getRequiredHeaders(map);

let softIssues = 0;

function getLocalShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function deriveLiveShortSha(versionPayload) {
  if (!versionPayload || typeof versionPayload !== 'object') return null;

  if (typeof versionPayload.shortSha === 'string' && versionPayload.shortSha.trim()) {
    return versionPayload.shortSha.trim();
  }

  if (typeof versionPayload.sha === 'string' && versionPayload.sha.trim()) {
    const sha = versionPayload.sha.trim();
    if (sha !== 'local') return sha.slice(0, 7);
  }

  return null;
}

function normalizeShaPrefix(value) {
  const sha = String(value || '')
    .trim()
    .toLowerCase();
  return /^[a-f0-9]{7,40}$/.test(sha) ? sha : null;
}

function shasMatch(a, b) {
  const left = normalizeShaPrefix(a);
  const right = normalizeShaPrefix(b);
  if (!left || !right) return false;
  return left.startsWith(right) || right.startsWith(left);
}

function isArrayLike(value) {
  return Array.isArray(value) || (value && typeof value === 'object' && Array.isArray(value.items));
}

function isLocalhostUrl(url) {
  return typeof url === 'string' && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, { redirect: 'follow', ...options });
  const text = await response.text();
  return {
    res: response,
    text,
    elapsedMs: Date.now() - startedAt,
  };
}

async function requestJson(url, options = {}) {
  const result = await request(url, options);
  let json = null;
  try {
    json = JSON.parse(result.text);
  } catch {}
  return { ...result, json };
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function softWarn(message) {
  softIssues += 1;
  console.warn(`⚠️ ${message}`);
}

function checkLatency(name, elapsedMs, limitMs) {
  if (elapsedMs > limitMs) {
    softWarn(`${name} latency ${elapsedMs}ms exceeded target ${limitMs}ms`);
  } else {
    console.log(`✅ ${name} latency ok (${elapsedMs}ms <= ${limitMs}ms)`);
  }
}

function assertHeaders(headers, label) {
  for (const header of requiredHeaders) {
    if (!headers.get(header)) {
      softWarn(`${label} is missing required header: ${header}`);
    }
  }
}

async function assertDns(hostname, label) {
  try {
    const records = await lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      fail(`${label} hostname did not resolve: ${hostname}`);
      return;
    }
    console.log(
      `✅ ${label} DNS ok (${hostname} -> ${records.map((dnsRecord) => dnsRecord.address).join(', ')})`,
    );
  } catch (error) {
    fail(`${label} DNS lookup failed for ${hostname}: ${error.message}`);
  }
}

console.log('== Live readiness check ==');
console.log(`Frontend: ${FRONTEND}`);
console.log(`Backend:  ${BACKEND}`);
console.log(`API base: ${API_BASE}`);

await assertDns(new URL(FRONTEND).hostname, 'frontend');
await assertDns(new URL(BACKEND).hostname, 'backend');

const health = await requestJson(`${BACKEND}/api/health`);
if (!health.res.ok || !health.json?.ok) fail(`/api/health failed (${health.res.status})`);
else {
  console.log('✅ health ok');
  checkLatency('health', health.elapsedMs, thresholds.health);
}

const ping = await requestJson(`${BACKEND}/api/ping`);
if (!ping.res.ok || !ping.json?.ok) fail(`/api/ping failed (${ping.res.status})`);
else {
  console.log('✅ ping ok');
  checkLatency('ping', ping.elapsedMs, thresholds.ping);
}

const version = await requestJson(`${BACKEND}/api/version`);
if (!version.res.ok || !version.json?.ok) fail(`/api/version failed (${version.res.status})`);
else console.log('✅ version ok');

const archive = await requestJson(`${BACKEND}/api/archive`);
const entries = archive.json?.entries || archive.json?.items;
if (!archive.res.ok || archive.json?.ok !== true || !Array.isArray(entries))
  fail(`/api/archive failed (${archive.res.status})`);
else console.log('✅ archive ok');

const search = await requestJson(`${BACKEND}/api/search/text?q=test`);
const searchOk =
  search.res.ok &&
  search.json &&
  (search.json.success === true || search.json.ok === true) &&
  isArrayLike(search.json.results || search.json.data);
if (!searchOk) fail(`/api/search/text failed (${search.res.status})`);
else console.log('✅ search ok');

const openclawStatus = await requestJson(`${BACKEND}/api/openclaw/status`);
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
  if (stale > 0) softWarn(`/api/openclaw/status reports stale queue items (${stale})`);
  console.log(
    `✅ openclaw status ok (${openclawStatus.json.mode}, pending=${queue.pending ?? 0}, stale=${stale})`,
  );
}

const openclawWatchdog = await requestJson(`${BACKEND}/api/openclaw/watchdog-status`);
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

const decentralizedReady = await requestJson(`${BACKEND}/api/decentralized/ready`);
if (!decentralizedReady.res.ok || decentralizedReady.json?.ok !== true) {
  fail(`/api/decentralized/ready failed (${decentralizedReady.res.status})`);
} else if (decentralizedReady.json?.passed !== true) {
  softWarn(`/api/decentralized/ready has failing checks`);
  console.log('✅ decentralized readiness endpoint reachable');
} else {
  console.log('✅ decentralized readiness ok');
}

const deals = await requestJson(`${BACKEND}/api/deals`);
if (deals.res.status === 401) console.log('✅ deals route ok (401 unauth as expected)');
else if (deals.res.ok && deals.json?.ok) console.log('✅ deals ok');
else fail(`/api/deals failed (${deals.res.status})`);

const bounties = await requestJson(`${BACKEND}/api/bounties`);
if (bounties.res.status === 401) console.log('✅ bounties route ok (401 unauth as expected)');
else if (bounties.res.ok && bounties.json?.ok) console.log('✅ bounties ok');
else fail(`/api/bounties failed (${bounties.res.status})`);

if (ADMIN_USERNAME && ADMIN_PASSWORD) {
  const adminLogin = await requestJson(`${BACKEND}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!adminLogin.res.ok || adminLogin.json?.ok !== true || !adminLogin.json?.token) {
    fail(`/api/admin/login failed (${adminLogin.res.status})`);
  } else {
    console.log('✅ admin login ok');
    const authHeaders = { Authorization: ['Bearer', adminLogin.json.token].join(' ') };

    const queueStats = await requestJson(`${BACKEND}/api/openclaw/queue-stats`, {
      headers: authHeaders,
    });
    if (!queueStats.res.ok || queueStats.json?.ok !== true)
      fail(`/api/openclaw/queue-stats failed (${queueStats.res.status})`);
    else
      console.log(
        `✅ openclaw queue-stats ok (pending=${queueStats.json.pendingOutbound ?? 0}, stale=${queueStats.json.staleOutbound ?? 0})`,
      );

    const replayDryRun = await requestJson(`${BACKEND}/api/openclaw/replay-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ dryRun: true, limit: 1 }),
    });
    if (!replayDryRun.res.ok || replayDryRun.json?.ok !== true)
      softWarn(`/api/openclaw/replay-webhook dry-run failed (${replayDryRun.res.status})`);
    else console.log('✅ openclaw replay dry-run ok');

    const bountyStats = await requestJson(`${BACKEND}/api/bounties/stats`, {
      headers: authHeaders,
    });
    if (!bountyStats.res.ok || bountyStats.json?.ok !== true)
      fail(`/api/bounties/stats failed (${bountyStats.res.status})`);
    else console.log(`✅ bounty stats ok (won=${bountyStats.json.wonCount ?? 0})`);
  }
} else if (REQUIRE_ADMIN) {
  fail('admin checks required, but ADMIN_USERNAME/ADMIN_PASSWORD were not provided');
} else {
  console.log('ℹ️ admin checks skipped: ADMIN_USERNAME/ADMIN_PASSWORD not provided');
}

const profile = await requestJson(`${BACKEND}/api/users/profile`);
if (profile.res.status === 401) console.log('✅ users/profile route ok (401 unauth as expected)');
else if (profile.res.ok && profile.json?.ok) console.log('✅ users/profile ok');
else fail(`/api/users/profile failed (${profile.res.status})`);

const streams = await requestJson(`${BACKEND}/api/streams`);
if (streams.res.status === 401) console.log('✅ streams route ok (401 unauth as expected)');
else if (streams.res.ok && (streams.json?.ok || Array.isArray(streams.json?.streams)))
  console.log('✅ streams ok');
else softWarn(`/api/streams unavailable (${streams.res.status})`);

const twitchStatus = await requestJson(`${BACKEND}/api/oauth/twitch/status`);
if (!twitchStatus.res.ok || twitchStatus.json?.ok !== true)
  softWarn(`/api/oauth/twitch/status unavailable (${twitchStatus.res.status})`);
else console.log('✅ twitch status ok');

const youtubeStatus = await requestJson(`${BACKEND}/api/oauth/youtube/status`);
if (!youtubeStatus.res.ok || youtubeStatus.json?.ok !== true)
  softWarn(`/api/oauth/youtube/status unavailable (${youtubeStatus.res.status})`);
else console.log('✅ youtube status ok');

const home = await request(`${FRONTEND}/`);
if (!home.res.ok) fail(`frontend / failed (${home.res.status})`);
else {
  console.log('✅ frontend home ok');
  checkLatency('frontend home', home.elapsedMs, thresholds.frontend);
  assertHeaders(home.res.headers, 'frontend home');
}

const statusPage = await request(`${FRONTEND}/status.html`);
if (!statusPage.res.ok) fail(`frontend /status.html failed (${statusPage.res.status})`);
else console.log('✅ status page ok');

for (const [label, url] of [
  ['llms.txt', map?.urls?.llms || `${FRONTEND}/llms.txt`],
  ['readable-site.json', map?.urls?.readableSite || `${FRONTEND}/readable-site.json`],
  ['sitemap.xml', map?.urls?.sitemap || `${FRONTEND}/sitemap.xml`],
]) {
  const resource = await request(url);
  if (!resource.res.ok) fail(`${label} failed (${resource.res.status})`);
  else console.log(`✅ ${label} ok`);
}

const assetPaths = [...home.text.matchAll(/\/assets\/[^"']+\.(?:js|css)/g)].map(
  (match) => match[0],
);
if (assetPaths.length === 0) fail('frontend bundle references missing');
else console.log(`✅ frontend assets found (${assetPaths.length})`);

const mainAsset = await request(`${FRONTEND}${assetPaths[0]}`);
if (!mainAsset.res.ok) fail(`main asset fetch failed (${mainAsset.res.status})`);
else {
  console.log(`✅ main asset ok (${assetPaths[0]})`);
  checkLatency('main asset', mainAsset.elapsedMs, thresholds.asset);
  assertHeaders(mainAsset.res.headers, 'main asset');
}

let runtimeCfg = null;
for (const candidateUrl of getRuntimeApiCandidates(FRONTEND)) {
  const candidate = await requestJson(candidateUrl);
  if (candidate.res.ok && typeof candidate.json?.apiUrl === 'string') {
    runtimeCfg = candidate;
    break;
  }
}

if (!runtimeCfg || !runtimeCfg.res.ok || typeof runtimeCfg.json?.apiUrl !== 'string') {
  fail('runtime api-base.json unavailable');
} else if (isLocalhostUrl(runtimeCfg.json.apiUrl)) {
  fail(`runtime api-base.json points to localhost (${runtimeCfg.json.apiUrl})`);
} else {
  const apiRoot = normalizeApiBase(runtimeCfg.json.apiUrl);
  if (apiRoot !== API_BASE)
    fail(`runtime api-base.json drift detected (${apiRoot} != ${API_BASE})`);

  const pingRuntime = await requestJson(`${apiRoot}/ping`);
  if (!pingRuntime.res.ok || pingRuntime.json?.ok !== true) {
    fail(
      `runtime api-base.json points to a dead API (${apiRoot}/ping -> ${pingRuntime.res.status})`,
    );
  } else {
    console.log(`✅ runtime api base: ${runtimeCfg.json.apiUrl} (ping ok)`);
  }
}

console.log('\n== Deploy parity check ==');
const localShortSha = getLocalShortSha();
const deadline = Date.now() + WAIT_TIMEOUT_MS;
let liveShortSha = deriveLiveShortSha(version.json);

if (!localShortSha) {
  if (PARITY_REQUIRED) softWarn('local git short SHA unavailable; parity skipped.');
  else console.log('ℹ️ parity skipped: local git short SHA unavailable.');
} else if (shasMatch(liveShortSha, localShortSha)) {
  console.log(`✅ parity ok (live=${liveShortSha}, local=${localShortSha})`);
} else if (!liveShortSha) {
  if (PARITY_REQUIRED)
    softWarn('live /api/version has no usable sha/shortSha; cannot prove parity.');
  else console.log('ℹ️ parity skipped: live /api/version has no usable sha/shortSha.');
} else {
  while (Date.now() < deadline && !shasMatch(liveShortSha, localShortSha)) {
    console.log(`⏳ waiting parity: live=${liveShortSha}, local=${localShortSha}`);
    await sleep(WAIT_POLL_MS);
    const next = await requestJson(`${BACKEND}/api/version`);
    if (next.res.ok && next.json?.ok) {
      liveShortSha = deriveLiveShortSha(next.json);
      if (!liveShortSha) break;
    }
  }

  if (shasMatch(liveShortSha, localShortSha)) {
    console.log(`✅ parity reached (live=${liveShortSha})`);
  } else if (PARITY_REQUIRED) {
    softWarn(`parity pending (live=${liveShortSha || 'missing'}, local=${localShortSha})`);
  } else {
    console.log(`ℹ️ parity pending (live=${liveShortSha || 'missing'}, local=${localShortSha})`);
  }
}

console.log('\n== Final status ==');
if (process.exitCode && process.exitCode !== 0) {
  console.error('❌ LIVE NOT READY: critical checks failed.');
} else if (STRICT && softIssues > 0) {
  console.error(`❌ LIVE NOT READY (STRICT): ${softIssues} warning(s) present.`);
  process.exitCode = 1;
} else if (softIssues > 0) {
  console.log(`⚠️ LIVE PARTIAL: core checks passed with ${softIssues} warning(s).`);
} else {
  console.log(
    '✅ LIVE CONNECTIVITY READY: core frontend/backend routes are reachable and configured.',
  );
}
