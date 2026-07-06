const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const hardhatEntrypoint = path.join(
  __dirname,
  '..',
  'node_modules',
  'hardhat',
  'internal',
  'cli',
  'bootstrap.js',
);

const child = spawn(process.execPath, [hardhatEntrypoint, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
