/* eslint-env node */
import { getLiveTargets } from "./live-map.mjs";

const { backend } = getLiveTargets();
const BASE = (globalThis.process?.env?.BACKEND_URL || backend).replace(/\/+$/, "");

const checks = [
  {
    name: "api health",
    path: "/api/health",
    expectStatus: 200,
    validate: (json) => json?.ok === true && typeof json?.shortSha === "string",
  },
  {
    name: "decentralized status",
    path: "/api/decentralized/status",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.cloudOnlyMode === "boolean" &&
      typeof json?.decentralized?.rpcConfigured === "boolean" &&
      typeof json?.decentralized?.rpcReachable === "boolean",
  },
  {
    name: "blockchain health",
    path: "/api/blockchain/health",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.rpc === "boolean" &&
      typeof json?.rpcReachable === "boolean",
  },
  {
    name: "decentralized ready",
    path: "/api/decentralized/ready",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.passed === "boolean" &&
      json?.checks &&
      typeof json?.checks?.rpcConfigured === "boolean" &&
      typeof json?.checks?.rpcReachable === "boolean",
  },
  {
    name: "decentralized report",
    path: "/api/decentralized/report",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.passed === "boolean" &&
      typeof json?.build?.shortSha === "string" &&
      typeof json?.checks?.rpcConfigured === "boolean" &&
      typeof json?.checks?.rpcReachable === "boolean" &&
      typeof json?.quickLinks?.health === "string",
  },
  {
    name: "admin panel report",
    path: "/api/admin/panel-report",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.build?.shortSha === "string" &&
      typeof json?.decentralized?.rpcConfigured === "boolean" &&
      typeof json?.decentralized?.rpcReachable === "boolean" &&
      typeof json?.links?.adminUi === "string",
  },
  {
    name: "admin bootstrap status",
    path: "/api/admin/bootstrap-status",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.adminCount === "number" &&
      typeof json?.signupAllowed === "boolean" &&
      typeof json?.selfSignupEnabled === "boolean" &&
      typeof json?.bootstrapCodeRequired === "boolean",
  },
  {
    name: "dpp route mounted",
    path: "/api/dpp/non-existent-passport",
    expectStatus: 404,
    validate: (json) => json?.ok === false && /passport not found/i.test(String(json?.error || "")),
  },
];

async function getJson(url) {
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { response, json, text };
}

let failed = false;
globalThis.console.log(`Verifying decentralized live endpoints at ${BASE}`);

for (const check of checks) {
  const url = `${BASE}${check.path}`;
  try {
    const { response, json, text } = await getJson(url);
    const statusOk = response.status === check.expectStatus;
    const bodyOk = check.validate(json);

    if (!statusOk || !bodyOk) {
      failed = true;
      globalThis.console.error(`FAIL ${check.name}: status=${response.status} expected=${check.expectStatus}`);
      globalThis.console.error(`URL: ${url}`);
      globalThis.console.error(`BODY: ${text.slice(0, 500)}`);
    } else {
      globalThis.console.log(`OK   ${check.name}: status=${response.status}`);
    }
  } catch (error) {
    failed = true;
    globalThis.console.error(`FAIL ${check.name}: ${error.message}`);
    globalThis.console.error(`URL: ${url}`);
  }
}

if (failed) {
  globalThis.process.exit(1);
}

globalThis.console.log("All decentralized live checks passed.");
