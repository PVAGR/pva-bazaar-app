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
