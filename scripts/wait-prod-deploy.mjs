import { execSync } from "node:child_process";
import { getLiveTargets } from "./live-map.mjs";

const { frontend: FRONTEND, backend: BACKEND } = getLiveTargets();
const POLL_MS = Number(process.env.POLL_MS || 10000);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 300000);
const STRICT = process.env.STRICT === "true";

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
    if (sha !== "local") return sha.slice(0, 7);
  }
  return null;
}

function normalizeShaPrefix(value) {
  const sha = String(value || "").trim().toLowerCase();
  return /^[a-f0-9]{7,40}$/.test(sha) ? sha : null;
}

function shasMatch(a, b) {
  const left = normalizeShaPrefix(a);
  const right = normalizeShaPrefix(b);
  if (!left || !right) return false;
  return left.startsWith(right) || right.startsWith(left);
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
    lastShortSha = deriveLiveShortSha(json);
    if (!lastShortSha) {
      console.warn(`⚠️ [attempt ${attempt}] live /api/version has no shortSha yet.`);
    } else if (shasMatch(lastShortSha, localShortSha)) {
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
