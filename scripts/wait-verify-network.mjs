import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const max = Number(process.env.NETWORK_VERIFY_ATTEMPTS || 12);
const delaySec = Number(process.env.NETWORK_VERIFY_DELAY_SEC || 20);

for (let i = 1; i <= max; i++) {
  console.log(`\n--- verify:network attempt ${i}/${max} ---\n`);
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "verify:network"], {
    stdio: "inherit",
    shell: false,
    cwd: root,
  });
  if (r.status === 0) {
    console.log("\nAll probes passed.");
    process.exit(0);
  }
  if (i < max) {
    console.log(`\nWaiting ${delaySec}s before retry (Render deploy may be in progress)...`);
    await delay(delaySec * 1000);
  }
}
process.exit(1);
