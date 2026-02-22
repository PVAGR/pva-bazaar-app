import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const FRONTEND = process.env.FRONTEND_URL || "https://pvabazaar.org";
const WAIT_TIMEOUT_MS = Number(process.env.WAIT_TIMEOUT_MS || 60000);
const WAIT_POLL_MS = Number(process.env.WAIT_POLL_MS || 10000);

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

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
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

const home = await get(`${FRONTEND}/`);
if (!home.res.ok) fail(`frontend / failed (${home.res.status})`);
else console.log("✅ frontend home ok");

const assets = [...home.text.matchAll(/\/assets\/[^"']+\.js/g)].map(m => m[0]);
if (assets.length === 0) fail("frontend bundle references missing");
else console.log(`✅ frontend assets found (${assets.length})`);

const runtimeCfg = await getJson(`${FRONTEND}/public/api-base.json`);
if (!runtimeCfg.res.ok || typeof runtimeCfg.json?.apiUrl !== "string") {
  console.warn("⚠️ runtime api-base.json unavailable");
} else if (isLocalhostUrl(runtimeCfg.json.apiUrl)) {
  fail(`runtime api-base.json points to localhost (${runtimeCfg.json.apiUrl})`);
} else {
  console.log(`✅ runtime api base: ${runtimeCfg.json.apiUrl}`);
}

console.log("\n== Deploy parity check ==");
const localShortSha = getLocalShortSha();
const deadline = Date.now() + WAIT_TIMEOUT_MS;
let liveShortSha = version.json?.shortSha || null;

if (!localShortSha) {
  console.warn("⚠️ local git short SHA unavailable; parity skipped.");
} else if (liveShortSha === localShortSha) {
  console.log(`✅ parity ok (live=${liveShortSha}, local=${localShortSha})`);
} else if (!liveShortSha) {
  console.warn("⚠️ live /api/version has no shortSha; cannot prove parity.");
} else {
  while (Date.now() < deadline && liveShortSha !== localShortSha) {
    console.log(`⏳ waiting parity: live=${liveShortSha}, local=${localShortSha}`);
    await sleep(WAIT_POLL_MS);
    const next = await getJson(`${BACKEND}/api/version`);
    if (next.res.ok && next.json?.ok) {
      liveShortSha = next.json.shortSha || null;
      if (!liveShortSha) break;
    }
  }
  if (liveShortSha === localShortSha) {
    console.log(`✅ parity reached (live=${liveShortSha})`);
  } else {
    console.warn(`⚠️ parity pending (live=${liveShortSha || "missing"}, local=${localShortSha})`);
  }
}

console.log("\n== Final status ==");
if (process.exitCode && process.exitCode !== 0) {
  console.error("❌ LIVE NOT READY: critical checks failed.");
} else {
  console.log("✅ LIVE CONNECTIVITY READY: core frontend/backend routes are reachable and configured.");
}
