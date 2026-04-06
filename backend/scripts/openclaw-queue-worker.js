const axios = require('axios');
const crypto = require('crypto');
const os = require('os');
const dotenv = require('dotenv');
const dbConnect = require('../lib/dbConnect');
const OpenClawMessage = require('../models/OpenClawMessage');
const OpenClawWorkerLease = require('../models/OpenClawWorkerLease');
const AdminRuntimeConfig = require('../models/AdminRuntimeConfig');

dotenv.config();

const WORKER_NAME = process.env.OPENCLAW_WORKER_NAME || 'openclaw-queue-dispatcher';
const POLL_MS = Math.max(parseInt(process.env.OPENCLAW_WORKER_POLL_MS || '10000', 10), 2000);
const LEASE_MS = Math.max(parseInt(process.env.OPENCLAW_WORKER_LEASE_MS || '45000', 10), 10000);
const BATCH_SIZE = Math.min(
  Math.max(parseInt(process.env.OPENCLAW_WORKER_BATCH_SIZE || '15', 10), 1),
  100,
);
const REQUEST_TIMEOUT_MS = Math.max(
  parseInt(process.env.OPENCLAW_WORKER_REQUEST_TIMEOUT_MS || '12000', 10),
  1000,
);
const RETRY_BASE_MS = Math.max(parseInt(process.env.OPENCLAW_WORKER_RETRY_BASE_MS || '15000', 10), 1000);
const RETRY_MAX_MS = Math.max(parseInt(process.env.OPENCLAW_WORKER_RETRY_MAX_MS || '300000', 10), RETRY_BASE_MS);
const MAX_RETRIES = Math.max(parseInt(process.env.OPENCLAW_WORKER_MAX_RETRIES || '12', 10), 1);
const RUN_ONCE = process.env.OPENCLAW_WORKER_RUN_ONCE === 'true';

const WORKER_ID = `${os.hostname()}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;

let shuttingDown = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clipError(err, maxLength = 320) {
  const detail = err?.response?.data || err?.message || 'Unknown webhook error';
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail);
  return text.slice(0, maxLength);
}

function nextBackoffMs(currentAttempt) {
  const exponential = RETRY_BASE_MS * Math.pow(2, Math.max(currentAttempt - 1, 0));
  return Math.min(exponential, RETRY_MAX_MS);
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.OPENCLAW_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENCLAW_API_KEY}`;
  }
  return headers;
}

async function getEffectiveWorkerConfig() {
  const fallback = {
    webhookUrl: process.env.OPENCLAW_WEBHOOK_URL || '',
    apiKey: process.env.OPENCLAW_API_KEY || '',
  };

  try {
    const runtime = await AdminRuntimeConfig.findOne({ key: 'default' }).lean();
    const openclaw = runtime?.openclaw;
    if (!openclaw) {
      return fallback;
    }

    return {
      webhookUrl: String(openclaw.webhookUrl || fallback.webhookUrl || '').trim(),
      apiKey: String(openclaw.apiKey || fallback.apiKey || '').trim(),
    };
  } catch (_err) {
    return fallback;
  }
}

async function acquireLease() {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_MS);

  const lease = await OpenClawWorkerLease.findOneAndUpdate(
    {
      name: WORKER_NAME,
      $or: [
        { leaseUntil: { $lt: now } },
        { holderId: WORKER_ID },
      ],
    },
    {
      $set: {
        name: WORKER_NAME,
        holderId: WORKER_ID,
        leaseUntil,
        heartbeatAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
      new: true,
    },
  ).lean();

  return Boolean(lease && lease.holderId === WORKER_ID);
}

async function releaseLease() {
  const now = new Date();
  await OpenClawWorkerLease.updateOne(
    { name: WORKER_NAME, holderId: WORKER_ID },
    {
      $set: {
        leaseUntil: now,
        heartbeatAt: now,
      },
    },
  );
}

async function fetchQueueBatch() {
  const now = new Date();

  return OpenClawMessage.find({
    direction: 'outbound',
    processed: false,
    'metadata.webhookForwardedAt': { $exists: false },
    $and: [
      {
        $or: [
          { 'metadata.nextWebhookAttemptAt': { $exists: false } },
          { 'metadata.nextWebhookAttemptAt': { $lte: now } },
        ],
      },
      {
        $or: [
          { 'metadata.webhookAttemptCount': { $exists: false } },
          { 'metadata.webhookAttemptCount': { $lt: MAX_RETRIES } },
        ],
      },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE)
    .lean();
}

function buildOutboundPayload(message) {
  return {
    source: 'pvabazaar-openclaw-worker',
    event: message.event || 'pvabazaar.dispatch',
    message: message.content || null,
    metadata: {
      ...(message.metadata || {}),
      queuedMessageId: message._id.toString(),
      queuedAt: message.createdAt,
      dispatchedBy: 'openclaw-queue-worker',
      dispatchedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };
}

async function markSuccess(messageId, attemptCount, statusCode) {
  await OpenClawMessage.updateOne(
    { _id: messageId },
    {
      $set: {
        'metadata.webhookForwardedAt': new Date().toISOString(),
        'metadata.webhookForwardStatus': 'ok',
        'metadata.webhookForwardedBy': WORKER_ID,
        'metadata.lastWebhookHttpStatus': statusCode || 200,
        'metadata.lastWebhookAttemptAt': new Date().toISOString(),
        'metadata.webhookAttemptCount': attemptCount,
      },
      $unset: {
        'metadata.nextWebhookAttemptAt': '',
        'metadata.lastWebhookError': '',
      },
    },
  );
}

async function markFailure(messageId, attemptCount, err) {
  const now = Date.now();
  const delay = nextBackoffMs(attemptCount);
  const nextAttempt = new Date(now + delay).toISOString();
  const deadLettered = attemptCount >= MAX_RETRIES;

  await OpenClawMessage.updateOne(
    { _id: messageId },
    {
      $set: {
        'metadata.webhookForwardStatus': deadLettered ? 'dead-lettered' : 'failed',
        'metadata.lastWebhookAttemptAt': new Date(now).toISOString(),
        'metadata.webhookAttemptCount': attemptCount,
        'metadata.lastWebhookError': clipError(err),
        ...(deadLettered
          ? { 'metadata.webhookDeadLetteredAt': new Date(now).toISOString() }
          : { 'metadata.nextWebhookAttemptAt': nextAttempt }),
      },
    },
  );
}

async function processMessage(message, webhookUrl, headers) {
  const attemptCount = Number(message?.metadata?.webhookAttemptCount || 0) + 1;
  const payload = buildOutboundPayload(message);

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: REQUEST_TIMEOUT_MS,
    });
    await markSuccess(message._id, attemptCount, response.status);
    return { ok: true };
  } catch (err) {
    await markFailure(message._id, attemptCount, err);
    return { ok: false, error: clipError(err) };
  }
}

async function processLoop() {
  const effective = await getEffectiveWorkerConfig();
  const webhookUrl = effective.webhookUrl;
  if (!webhookUrl) {
    console.log('[OpenClawWorker] OPENCLAW_WEBHOOK_URL not set; worker idling in queue-only mode');
    return;
  }

  const headers = buildHeaders();
  if (effective.apiKey) {
    headers.Authorization = `Bearer ${effective.apiKey}`;
  }
  const batch = await fetchQueueBatch();

  if (!batch.length) {
    return;
  }

  let okCount = 0;
  let failedCount = 0;

  for (const message of batch) {
    const result = await processMessage(message, webhookUrl, headers);
    if (result.ok) {
      okCount += 1;
    } else {
      failedCount += 1;
    }
  }

  console.log(`[OpenClawWorker] cycle processed=${batch.length} forwarded=${okCount} failed=${failedCount}`);
}

async function main() {
  console.log(`[OpenClawWorker] starting worker=${WORKER_NAME} workerId=${WORKER_ID} runOnce=${RUN_ONCE}`);

  await dbConnect();

  if (RUN_ONCE) {
    try {
      const hasLease = await acquireLease();
      if (!hasLease) {
        console.log('[OpenClawWorker] lease unavailable; run-once invocation exiting');
        return;
      }

      await processLoop();
    } catch (err) {
      console.error('[OpenClawWorker] run-once error:', err?.message || err);
      throw err;
    } finally {
      try {
        await releaseLease();
      } catch (_err) {
        // best-effort lease release for one-shot mode
      }
    }

    console.log('[OpenClawWorker] run-once completed');
    return;
  }

  while (!shuttingDown) {
    try {
      const hasLease = await acquireLease();
      if (!hasLease) {
        await sleep(POLL_MS);
        continue;
      }

      await processLoop();
    } catch (err) {
      console.error('[OpenClawWorker] cycle error:', err?.message || err);
    }

    await sleep(POLL_MS);
  }

  try {
    await releaseLease();
  } catch (_err) {
    // no-op during shutdown
  }

  console.log('[OpenClawWorker] stopped cleanly');
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[OpenClawWorker] received ${signal}; shutting down`);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  console.error('[OpenClawWorker] fatal error:', err?.message || err);
  process.exit(1);
});
