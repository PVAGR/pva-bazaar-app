/* eslint-env node */
import { getLiveTargets } from "./live-map.mjs";

const { backend } = getLiveTargets();
const BASE = (globalThis.process?.env?.BACKEND_URL || backend).replace(/\/+$/, "");

// These checks validate the ACTUAL serverless bridge contract served by
// https://pva-backend-api.vercel.app (backend/api/index-serverless.js).
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
      json?.status === "ready" &&
      json?.passed === true &&
      typeof json?.database?.mode === "string" &&
      typeof json?.database?.connected === "boolean" &&
      typeof json?.routes === "object" &&
      json?.routes !== null,
  },
  {
    name: "decentralized ready",
    path: "/api/decentralized/ready",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      json?.passed === true &&
      Array.isArray(json?.checks) &&
      json.checks.length > 0 &&
      json.checks.every((c) => typeof c?.name === "string" && typeof c?.ok === "boolean"),
  },
  {
    name: "decentralized report",
    path: "/api/decentralized/report",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.build?.shortSha === "string" &&
      Array.isArray(json?.notes),
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
    name: "career quiz definition",
    path: "/api/career-quiz/definition",
    expectStatus: 200,
    validate: (json) =>
      json?.ok === true &&
      typeof json?.quiz?.version !== "undefined" &&
      Array.isArray(json?.quiz?.questions) &&
      json.quiz.questions.length > 0,
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
