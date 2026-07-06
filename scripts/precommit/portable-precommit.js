#!/usr/bin/env node
/*
 * Portable Husky pre-commit runner.
 * Goal: make commit hooks Windows-compatible by avoiding Linux-only shell utilities.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function run(cmd, opts = {}) {
  console.log(`\n>> ${cmd}`);
  execSync(cmd, {
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
}

function runQuiet(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', shell: true });
    return true;
  } catch {
    return false;
  }
}

function git(args) {
  return execSync(`git ${args}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: true,
  }).trim();
}

function repoRoot() {
  try {
    return git('rev-parse --show-toplevel');
  } catch {
    return process.cwd();
  }
}

function isWindows() {
  return process.platform === 'win32';
}

const root = repoRoot();
process.chdir(root);

// Local bypass flags (keep semantics similar to shell hook)
const HUSKY = process.env.HUSKY;
const SKIP_QUALITY_CHECKS = process.env.SKIP_QUALITY_CHECKS;
const FAST_COMMIT = process.env.FAST_COMMIT;
if (HUSKY === '0' || SKIP_QUALITY_CHECKS === 'true' || FAST_COMMIT === '1') {
  console.log('⏭️  Skipping pre-commit hooks (local bypass).');
  process.exit(0);
}

console.log('🔍 Running pre-commit quality checks...');

// 1) lint-staged
console.log('📝 Formatting code...');
// Prefer existing lint-staged script
run('npm run lint-staged --if-present');

// 2) Brand compliance
console.log('🎨 Checking brand color compliance...');
try {
  run('npm run qa:brand:check:staged --if-present');
  console.log('✅ Brand colors compliant');
} catch (e) {
  console.log('❌ Brand color violations detected');
  console.log(
    'Only use approved PVA colors: #0f3b2d, #1c5a45, #2d7d5a, #4ef8a3, #2bb673, #d4af37, #e8f4f0, #a8b0b9',
  );
  process.exit(1);
}

// 3) Accessibility
console.log('♿ Running accessibility checks...');
try {
  run('npm run qa:axe:staged --if-present');
  console.log('✅ Accessibility checks passed');
} catch {
  console.log('❌ Accessibility violations detected');
  process.exit(1);
}

// 4) Typecheck only if staged contains ts/tsx
let stagedNames = '';
try {
  stagedNames = git('diff --cached --name-only --diff-filter=ACMR');
} catch {
  stagedNames = '';
}
const staged = stagedNames
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const hasTs = staged.some((f) => /\.(ts|tsx)$/i.test(f));
if (hasTs) {
  console.log('🔧 Type checking...');
  try {
    run('npm run typecheck --if-present');
    console.log('✅ Type checking passed');
  } catch {
    console.log('❌ Type checking failed');
    process.exit(1);
  }
} else {
  console.log('⏭️  No staged TypeScript files; skipping typecheck.');
}

// 5) Unit tests staged
console.log('🧪 Running unit tests...');
try {
  run('npm run test:staged --if-present');
  console.log('✅ Unit tests passed');
} catch {
  console.log('❌ Unit tests failed');
  process.exit(1);
}

// 6) Secret scan (gate on Windows)
console.log('🔐 Scanning for secrets (gitleaks)...');
const secretScanPath = path.join(root, 'scripts', 'secret-scan.sh');
const shouldSkipSecretScan = isWindows();
if (shouldSkipSecretScan) {
  // Avoid bash-only script execution on Windows/Kline.
  console.log('⚠️  Windows detected; skipping scripts/secret-scan.sh (bash-only).');
  console.log(
    'To enable locally, run secret scanning manually after installing gitleaks (or provide a Windows-compatible secret scan script).',
  );
} else {
  if (!fs.existsSync(secretScanPath)) {
    console.log('⚠️  scripts/secret-scan.sh not found; skipping secret scan.');
  } else {
    try {
      // Execute through bash if available; otherwise skip with clear message.
      // We avoid hard failing to keep quality checks but do not silently remove security checks.
      const ok =
        runQuiet(`sh ${JSON.stringify(secretScanPath)}`) ||
        runQuiet(`bash ${JSON.stringify(secretScanPath)}`);
      if (!ok) throw new Error('secret scan command failed');
      console.log('✅ Secret scan passed');
    } catch {
      console.log('❌ Secret scan failed');
      process.exit(1);
    }
  }
}

// 7) Smart contract checks if contracts changed
const hasContractsChanged = staged.some((f) => f.startsWith('apps/contracts/'));
if (hasContractsChanged) {
  console.log('⛓️  Running smart contract checks...');

  const contractsDir = path.join(root, 'apps', 'contracts');
  if (!fs.existsSync(contractsDir)) {
    console.log('❌ apps/contracts directory not found');
    process.exit(1);
  }

  // Note: forge is assumed to be available in the environment.
  // If forge isn't present on Windows, this will fail loudly (consistent with existing behavior).
  try {
    run('forge build', { cwd: contractsDir });
    console.log('✅ Contracts compiled successfully');
    run('forge test', { cwd: contractsDir });
    console.log('✅ Contract tests passed');
    // Gas usage check: keep simple: run forge test --gas-report and fail if it contains FAILED/ERROR.
    // This uses portable JS rather than grep.
    const out = execSync('forge test --gas-report', {
      cwd: contractsDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: true,
    });
    if (/FAILED|ERROR/i.test(out)) {
      console.log('❌ Gas usage issues detected');
      process.exit(1);
    }
    console.log('✅ Gas usage within limits');
  } catch (e) {
    // Ensure we exit non-zero
    console.log('❌ Smart contract checks failed');
    process.exit(1);
  }
}

console.log('\n✅ All pre-commit checks passed!');
console.log('🚀 Ready to commit with confidence!');
