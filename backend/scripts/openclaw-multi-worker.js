const { spawn } = require('child_process');
const path = require('path');

const count = Math.min(Math.max(parseInt(process.env.OPENCLAW_WORKER_COUNT || '1', 10), 1), 20);
const baseName =
  String(process.env.OPENCLAW_WORKER_NAME || 'openclaw-queue-dispatcher').trim() ||
  'openclaw-queue-dispatcher';
const workerScript = path.join(__dirname, 'openclaw-queue-worker.js');

const children = [];
let stopping = false;

function startWorker(index) {
  const suffix = index + 1;
  const workerName = `${baseName}-${suffix}`;
  const env = {
    ...process.env,
    OPENCLAW_WORKER_NAME: workerName,
  };

  const child = spawn(process.execPath, [workerScript], {
    env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(
        `[OpenClawMultiWorker] worker=${workerName} exited code=${code} signal=${signal}`,
      );
    }
  });

  children.push(child);
  console.log(`[OpenClawMultiWorker] started worker=${workerName} pid=${child.pid}`);
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[OpenClawMultiWorker] received ${signal}; stopping ${children.length} workers`);
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch (_err) {
      // ignore
    }
  }

  global
    .setTimeout(() => {
      process.exit(0);
    }, 2000)
    .unref();
}

for (let index = 0; index < count; index += 1) {
  startWorker(index);
}

console.log(`[OpenClawMultiWorker] running count=${count} baseName=${baseName}`);

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
