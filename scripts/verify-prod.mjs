// scripts/verify-prod.mjs
const FRONTEND = "https://pvabazaar.org";
const BACKEND = "https://pva-backend-api.vercel.app";

function fail(msg) {
  console.error("❌ " + msg);
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
  try { json = JSON.parse(text); } catch {}
  return { res, json, text };
}

(async () => {
  console.log("== Backend checks ==");
  {
    const { res, json, text } = await getJson(`${BACKEND}/api/health`);
    if (!res.ok) fail(`/api/health not ok: ${res.status}`);
    if (!json) fail(`/api/health not JSON: ${text.slice(0, 200)}`);
    else console.log("✅ health ok");
  }

  {
    const { res, json } = await getJson(`${BACKEND}/api/archive`);
    if (!res.ok) fail(`/api/archive not ok: ${res.status}`);
    if (!json || json.ok !== true || !Array.isArray(json.entries)) {
      fail(`/api/archive wrong shape: ${JSON.stringify(json)?.slice(0, 200)}`);
    } else console.log("✅ archive shape ok");
  }

  {
    const { res, json } = await getJson(`${BACKEND}/api/search/text?q=test`);
    if (!res.ok) fail(`/api/search/text not ok: ${res.status}`);
    if (!json || json.success !== true || !Array.isArray(json.results)) {
      fail(`/api/search/text wrong shape: ${JSON.stringify(json)?.slice(0, 200)}`);
    } else console.log("✅ search shape ok");
  }

  {
    const { res } = await get(`${BACKEND}/api/artifacts`);
    if (res.status !== 410) fail(`/api/artifacts expected 410, got ${res.status}`);
    else console.log("✅ legacy gated (410)");
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

  const mustHave = ["/api/archive", "/api/search/text"];
  for (const s of mustHave) {
    if (!js.includes(s)) fail(`bundle missing expected string: ${s}`);
    else console.log(`✅ bundle contains ${s}`);
  }

  const mustNotHave = ["localhost", "/api/market", "/api/artifacts"];
  for (const s of mustNotHave) {
    if (js.includes(s)) fail(`bundle contains forbidden string: ${s}`);
    else console.log(`✅ bundle does not contain ${s}`);
  }

  // Optional but useful: ensure backend base URL is present somewhere (depends on your apiFetch design)
  if (!js.includes("pva-backend-api.vercel.app")) {
    console.warn("⚠️ bundle does not contain backend domain string. This can be OK if using relative /api + proxy, but double-check runtime API base.");
  } else {
    console.log("✅ bundle references backend domain");
  }

  console.log("\nDone.");
  if (process.exitCode) process.exit(process.exitCode);
})();
