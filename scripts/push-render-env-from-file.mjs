/**
 * Merge a local .env-style file into a Render web service (GET + merge + PUT).
 * Uses JSON.stringify so control characters and quotes are safe (PowerShell ConvertTo-Json is not).
 *
 * Env: RENDER_API_KEY (required), RENDER_SERVICE_ID (optional, default below)
 * Args: [--dry-run] [--allow-localhost-mongo] [path/to.env]
 */
import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const DEFAULT_SERVICE_ID = "srv-d7etc3n41pts73f3b0fg";

function parseArgs(argv) {
  const out = { dryRun: false, allowLocalhostMongo: false, envFile: path.join(REPO_ROOT, "render-dashboard.env") };
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--allow-localhost-mongo") out.allowLocalhostMongo = true;
    else if (!a.startsWith("-")) out.envFile = path.isAbsolute(a) ? a : path.join(REPO_ROOT, a);
  }
  return out;
}

function parseEnvFile(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trimEnd();
    if (!t || /^\s*#/.test(t)) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k) map[k] = v;
  }
  return map;
}

function request(method, pathname, bodyObj) {
  const token = process.env.RENDER_API_KEY;
  if (!token) throw new Error("RENDER_API_KEY is not set.");
  const data = bodyObj != null ? JSON.stringify(bodyObj) : null;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.render.com",
        path: pathname,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data, "utf8") } : {}),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Render API ${res.statusCode}: ${buf}`));
          } else {
            resolve(buf ? JSON.parse(buf) : null);
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data, "utf8");
    req.end();
  });
}

async function listAllEnvVars(serviceId) {
  const byKey = {};
  let cursor = null;
  for (;;) {
    let p = `/v1/services/${serviceId}/env-vars?limit=100`;
    if (cursor) p += `&cursor=${encodeURIComponent(cursor)}`;
    const chunk = await request("GET", p, null);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    for (const row of chunk) {
      const ev = row.envVar || row;
      if (ev && ev.key) byKey[ev.key] = ev.value ?? "";
    }
    const last = chunk[chunk.length - 1];
    if (!last?.cursor) break;
    cursor = last.cursor;
  }
  return byKey;
}

const args = parseArgs(process.argv.slice(2));
const serviceId = process.env.RENDER_SERVICE_ID || DEFAULT_SERVICE_ID;

const raw = fs.readFileSync(args.envFile, "utf8");
const fileMap = parseEnvFile(raw);

const mongo = fileMap.MONGODB_URI || "";
if (!args.allowLocalhostMongo && /localhost|127\.0\.0\.1/.test(mongo)) {
  throw new Error("MONGODB_URI points at localhost; fix render-dashboard.env or pass --allow-localhost-mongo.");
}

const remote = await listAllEnvVars(serviceId);
const merged = { ...remote, ...fileMap };

const changes = [];
for (const k of Object.keys(fileMap)) {
  if (!(k in remote)) changes.push(`+ ${k}`);
  else if (remote[k] !== fileMap[k]) changes.push(`~ ${k}`);
}

if (changes.length === 0) {
  console.log(`No changes: Render already matches ${path.relative(REPO_ROOT, args.envFile)}.`);
  process.exit(0);
}

console.log(`Planned updates (${changes.length} keys):`);
for (const c of changes.sort()) console.log(`  ${c}`);

if (args.dryRun) {
  console.log("Dry run: no PUT.");
  process.exit(0);
}

const payload = Object.keys(merged)
  .sort()
  .map((k) => ({ key: k, value: merged[k] }));

await request("PUT", `/v1/services/${serviceId}/env-vars`, payload);
console.log(`PUT env-vars OK (${payload.length} total keys on service).`);
