const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { runPollingSync } = require('../service/omnichannelPollingService');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

dotenv.config();

const CLOUD_ONLY_MODE = process.env.CLOUD_ONLY_MODE !== 'false';
const POLL_INTERVAL_MS = Math.max(10000, Number(process.env.OMNICHANNEL_POLL_INTERVAL_MS || 300000));
const POLL_LIMIT = Math.max(1, Math.min(Number(process.env.OMNICHANNEL_POLL_LIMIT || 50), 500));

let timer = null;
let running = false;
let shuttingDown = false;

async function connectDb() {
  const uri = process.env.MONGODB_URI || '';
  if (!uri) {
    throw new Error(`MONGODB_URI is required${CLOUD_ONLY_MODE ? ' when CLOUD_ONLY_MODE is enabled' : ''}`);
  }
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'pvabazaar',
    serverSelectionTimeoutMS: 10000,
  });
}

async function executePollCycle() {
  if (running || shuttingDown) return;
  running = true;

  try {
    const startedAt = new Date();
    const result = await runPollingSync({ limit: POLL_LIMIT });
    const summary = result?.summary || {};
    console.log(
      '[omnichannel-poll-worker]',
      startedAt.toISOString(),
      'scanned=',
      summary.scannedItems || 0,
      'checked=',
      summary.checkedListings || 0,
      'soldDetected=',
      summary.soldDetected || 0,
      'syncFailures=',
      summary.syncFailures || 0,
    );
  } catch (error) {
    console.error('[omnichannel-poll-worker] Poll cycle failed:', error?.message || error);
  } finally {
    running = false;
  }
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('[omnichannel-poll-worker] Disconnect failed:', error?.message || error);
  }

  process.exit(code);
}

async function main() {
  await connectDb();
  console.log(
    `[omnichannel-poll-worker] Connected. intervalMs=${POLL_INTERVAL_MS} limit=${POLL_LIMIT}`,
  );

  await executePollCycle();

  timer = setInterval(executePollCycle, POLL_INTERVAL_MS);

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[omnichannel-poll-worker] Fatal startup error:', error?.message || error);
    shutdown(1);
  });
}

module.exports = {
  main,
  executePollCycle,
};
