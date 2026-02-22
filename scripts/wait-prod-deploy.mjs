import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const FRONTEND = process.env.FRONTEND_URL || "https://pvabazaar.org";
const POLL_MS = Number(process.env.POLL_MS || 10000);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 300000);
const STRICT = process.env.STRICT === "true";

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

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function getVersion(backendBase) {
  const res = await fetch(`${backendBase}/api/version`, { redirect: "follow" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, json, text };
}

const BACKEND =
  normalizeBase(process.env.BACKEND_URL) ||
  getBackendFromProjectConfig() ||
  FRONTEND;

const localShortSha = getLocalShortSha();

console.log(`Frontend URL: ${FRONTEND}`);
console.log(`Backend URL:  ${BACKEND}`);
console.log(`Local SHA:    ${localShortSha || "(unavailable)"}`);
console.log(`Polling:      every ${POLL_MS}ms, timeout ${TIMEOUT_MS}ms`);

if (!localShortSha) {
  console.warn("⚠️ Could not read local git short SHA.");
  if (STRICT) process.exit(1);
  process.exit(0);
}

const deadline = Date.now() + TIMEOUT_MS;
let attempt = 0;
let lastShortSha = null;

while (Date.now() < deadline) {
  attempt += 1;
  const { res, json, text } = await getVersion(BACKEND);
  if (!res.ok) {
    console.warn(`⚠️ [attempt ${attempt}] /api/version returned ${res.status}`);
  } else if (!json || json.ok !== true) {
    console.warn(`⚠️ [attempt ${attempt}] /api/version non-JSON or invalid payload: ${text.slice(0, 140)}`);
  } else {
    lastShortSha = json.shortSha || null;
    if (!lastShortSha) {
      console.warn(`⚠️ [attempt ${attempt}] live /api/version has no shortSha yet.`);
    } else if (lastShortSha === localShortSha) {
      console.log(`✅ Live backend matches local commit (${localShortSha})`);
      process.exit(0);
    } else {
      console.log(`⏳ [attempt ${attempt}] live=${lastShortSha}, local=${localShortSha}`);
    }
  }
  await sleep(POLL_MS);
}

console.warn(
  `⚠️ Timed out waiting for live backend parity. Last live shortSha=${lastShortSha || "missing"}, local=${localShortSha}`,
);
process.exit(STRICT ? 1 : 0);
