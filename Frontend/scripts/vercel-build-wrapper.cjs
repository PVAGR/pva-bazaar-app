#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findFrontendDir() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'Frontend'),
    path.join(cwd),
    path.join(cwd, '..', 'Frontend'),
    path.join(cwd, 'frontend'),
    path.join(cwd, '..', 'frontend')
  ];
  for (const d of candidates) {
    try {
      if (fs.existsSync(path.join(d, 'package.json'))) return d;
    } catch (e) {}
  }
  return null;
}

const frontendDir = findFrontendDir();
if (!frontendDir) {
  console.error('❌ Could not find frontend package.json in candidates.');
  process.exit(1);
}

console.log('ℹ️ Using frontend dir:', frontendDir);

function run(cmd, args, options={}){
  console.log('> ', cmd, args.join(' '));
  const r = spawnSync(cmd, args, Object.assign({ stdio: 'inherit', cwd: frontendDir, shell: false }, options));
  if (r.error) {
    console.error('Command failed', r.error);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status);
}

// install then build
run('npm', ['install', '--no-audit', '--no-fund']);
run('npm', ['run', 'build']);

// After build, copy frontend dist to repository root 'dist' so Vercel finds it
try {
  const builtDist = path.join(frontendDir, 'dist');
  if (fs.existsSync(builtDist)) {
    const isFrontendSubdir = path.basename(frontendDir).toLowerCase() === 'frontend';
    const repoRoot = isFrontendSubdir ? path.resolve(frontendDir, '..') : frontendDir;
    const dest = path.join(repoRoot, 'dist');
    if (builtDist !== dest) {
      console.log(`ℹ️ Copying built dist from ${builtDist} -> ${dest}`);
      if (fs.cpSync) {
        fs.rmSync(dest, { recursive: true, force: true });
        fs.cpSync(builtDist, dest, { recursive: true });
      } else {
        const { spawnSync } = require('child_process');
        spawnSync('rm', ['-rf', dest]);
        spawnSync('cp', ['-r', builtDist, dest]);
      }
    }
  }
} catch (e) {
  console.error('Warning: failed to copy built dist to repo root', e);
}
