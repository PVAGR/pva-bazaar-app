// scripts/verify-prod.mjs
// Usage:
//   npm run verify:prod
//   FRONTEND_URL=https://pvabazaar.org BACKEND_URL=https://api.example.com npm run verify:prod
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const FRONTEND = process.env.FRONTEND_URL || "https://pvabazaar.org";

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

const BACKEND =
  normalizeBase(process.env.BACKEND_URL) ||
  getBackendFromProjectConfig() ||
  FRONTEND;

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
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

function isLocalhostUrl(url) {
  return typeof url === "string" && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

function isArrayLike(v) {
  return Array.isArray(v) || (v && typeof v === "object" && Array.isArray(v.items));
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

(async () => {
  console.log(`Frontend URL: ${FRONTEND}`);
  console.log(`Backend URL:  ${BACKEND}`);
  console.log("== Backend checks ==");
  let healthJson = null;
  let versionJson = null;
  {
    const { res, json, text } = await getJson(`${BACKEND}/api/health`);
    if (!res.ok) fail(`/api/health not ok: ${res.status}`);
    if (!json) fail(`/api/health not JSON: ${text.slice(0, 200)}`);
    else {
      healthJson = json;
      console.log("✅ health ok");
    }
  }

  {
    const { res, json } = await getJson(`${BACKEND}/api/ping`);
    if (!res.ok) fail(`/api/ping not ok: ${res.status}`);
    if (!json || json.ok !== true) {
      fail(`/api/ping wrong shape: ${JSON.stringify(json)?.slice(0, 200)}`);
    } else {
      console.log("✅ ping ok");
    }
  }

  {
    const { res, json } = await getJson(`${BACKEND}/api/version`);
    if (!res.ok) fail(`/api/version not ok: ${res.status}`);
    const hasNewShape = json && json.ok === true && typeof json.shortSha === "string";
    const hasLegacyShape = json && json.ok === true && typeof json.version === "string";
    if (!hasNewShape && !hasLegacyShape) {
      fail(`/api/version wrong shape: ${JSON.stringify(json)?.slice(0, 200)}`);
    } else {
      versionJson = json;
      console.log("✅ version ok");
    }
  }

  {
    const localShortSha = getLocalShortSha();
    if (localShortSha && versionJson?.shortSha && localShortSha !== versionJson.shortSha) {
      console.warn(
        `⚠️ backend deploy lag detected: live=${versionJson.shortSha}, local=${localShortSha} (latest commit may still be deploying)`,
      );
    } else if (localShortSha && versionJson?.shortSha && localShortSha === versionJson.shortSha) {
      console.log("✅ backend deployment matches local HEAD");
    } else if (localShortSha && !versionJson?.shortSha) {
      console.warn("⚠️ live /api/version does not expose shortSha; cannot confirm deploy parity.");
    }
  }

  {
    const { res, json } = await getJson(`${BACKEND}/api/archive`);
    if (!res.ok) fail(`/api/archive not ok: ${res.status}`);
    const entries = json?.entries || json?.items;
    if (!json || json.ok !== true || !Array.isArray(entries)) {
      fail(`/api/archive wrong shape: ${JSON.stringify(json)?.slice(0, 200)}`);
    } else console.log("✅ archive shape ok");
  }

  {
    const { res, json } = await getJson(`${BACKEND}/api/search/text?q=test`);
    if (!res.ok) fail(`/api/search/text not ok: ${res.status}`);
    const ok = json && (json.success === true || json.ok === true) && isArrayLike(json.results || json.data);
    if (!ok) {
      fail(`/api/search/text wrong shape: ${JSON.stringify(json)?.slice(0, 200)}`);
    } else console.log("✅ search shape ok");
  }

  {
    const { res } = await get(`${BACKEND}/api/artifacts`);
    const hasLegacyMode = Boolean(healthJson && typeof healthJson.legacyMode === "boolean");
    const legacyMode = hasLegacyMode ? healthJson.legacyMode : null;
    if (legacyMode === true && res.status === 200) {
      console.log("✅ legacy enabled (/api/artifacts available)");
    } else if (legacyMode === false && res.status === 410) {
      console.log("✅ legacy gated (410)");
    } else if (!hasLegacyMode) {
      console.warn(`⚠️ /api/health did not include legacyMode; /api/artifacts returned ${res.status}`);
    } else {
      console.warn(
        `⚠️ /api/artifacts returned ${res.status} (legacyMode=${legacyMode}; expected ${
          legacyMode ? "200" : "410"
        })`,
      );
    }
  }

  console.log("\n== Frontend bundle checks ==");
  const { res: frRes, text: html } = await get(`${FRONTEND}/`);
  if (!frRes.ok) fail(`frontend / not ok: ${frRes.status}`);

  // Find built JS assets referenced by the page
  const assets = [...html.matchAll(/\/assets\/[^"']+\.js/g)].map(m => m[0]);
  if (assets.length === 0) {
    fail("No /assets/*.js references found on homepage HTML (deploy issue or nonstandard build?)");
  } else {
    console.log(`✅ found ${assets.length} JS asset refs`);
  }

  // Fetch the first (usually main) JS bundle and scan for critical strings
  const mainJsPath = assets[0];
  const { res: jsRes, text: js } = await get(`${FRONTEND}${mainJsPath}`);
  if (!jsRes.ok) fail(`main bundle fetch failed: ${jsRes.status}`);

  const mustHave = ["/api/"];
  for (const s of mustHave) {
    if (!js.includes(s)) fail(`bundle missing expected string: ${s}`);
    else console.log(`✅ bundle contains ${s}`);
  }

  const mustNotHave = ["/api/market", "/api/artifacts"];
  for (const s of mustNotHave) {
    if (js.includes(s)) fail(`bundle contains forbidden string: ${s}`);
    else console.log(`✅ bundle does not contain ${s}`);
  }

  if (!js.includes("/api/")) {
    console.warn("⚠️ bundle does not contain '/api/' references. Double-check runtime API base configuration.");
  } else {
    console.log("✅ bundle contains API references");
  }

  // Runtime API base validation from deployed static config
  const { res: runtimeCfgRes, json: runtimeCfg } = await getJson(`${FRONTEND}/public/api-base.json`);
  if (!runtimeCfgRes.ok || !runtimeCfg || typeof runtimeCfg.apiUrl !== "string") {
    console.warn("⚠️ Could not read runtime api-base.json from frontend deployment.");
  } else if (isLocalhostUrl(runtimeCfg.apiUrl)) {
    fail(`runtime api-base.json points to localhost: ${runtimeCfg.apiUrl}`);
  } else {
    console.log(`✅ runtime api-base.json URL: ${runtimeCfg.apiUrl}`);
  }

  console.log("\nDone.");
  if (process.exitCode) process.exit(process.exitCode);
})();
