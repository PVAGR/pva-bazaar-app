#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipContracts = args.has('--skip-contracts');
const skipBackend = args.has('--skip-backend');
const skipFrontend = args.has('--skip-frontend');
const skipHealth = args.has('--skip-health');

function run(command, commandArgs, options = {}) {
  const pretty = `${command} ${commandArgs.join(' ')}`;
  console.log(`\n> ${pretty}`);
  if (dryRun) return { status: 0 };
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${pretty}`);
  }
  return result;
}

function warnMissingEnv() {
  const required = [
    'PUBLIC_SITE_URL',
    'REGISTRAR_BASE_URL',
    'BACKEND_BASE_URL',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`\n[deploy] Missing recommended env vars: ${missing.join(', ')}`);
    console.warn('[deploy] Deployment can continue, but health checks may be skipped/fail.');
  }
}

async function healthCheck() {
  const backendUrl = process.env.BACKEND_BASE_URL;
  const registrarUrl = process.env.REGISTRAR_BASE_URL;

  if (!backendUrl || !registrarUrl) {
    console.warn('[deploy] Skipping health checks: set BACKEND_BASE_URL and REGISTRAR_BASE_URL');
    return;
  }

  const checks = [
    `${backendUrl.replace(/\/$/, '')}/api/health`,
    `${registrarUrl.replace(/\/$/, '')}/api/health`,
  ];

  for (const url of checks) {
    console.log(`\n[health] GET ${url}`);
    if (dryRun) continue;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Health check failed (${res.status}) for ${url}`);
    }
  }
}

async function main() {
  console.log('=== PVA Bazaar Production Deploy Orchestrator ===');
  warnMissingEnv();

  if (!skipContracts) {
    run('npm', ['--prefix', 'contracts', 'run', 'compile']);
    // Uses polygonAmoy as public testnet gate before mainnet.
    run('npm', ['--prefix', 'contracts', 'run', 'deploy:amoy']);
  }

  if (!skipBackend) {
    run('npm', ['--prefix', 'backend', 'install']);
    run('npm', ['--prefix', 'backend', 'run', 'build']);
  }

  if (!skipFrontend) {
    run('npm', ['--prefix', 'Frontend', 'install']);
    run('npm', ['--prefix', 'Frontend', 'run', 'build']);
  }

  if (!skipHealth) {
    await healthCheck();
  }

  console.log('\n[deploy] Completed successfully.');
}

main().catch((err) => {
  console.error('\n[deploy] Failed:', err.message);
  process.exit(1);
});
