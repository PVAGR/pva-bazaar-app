const axios = require('axios');
const crypto = require('crypto');
const os = require('os');
const dotenv = require('dotenv');
const dbConnect = require('../lib/dbConnect');
const Deal = require('../models/Deal');

dotenv.config();

const WORKER_NAME = process.env.DEAL_OUTBOUND_WORKER_NAME || 'deal-outbound-dispatch-worker';
const POLL_MS = Math.max(parseInt(process.env.DEAL_OUTBOUND_WORKER_POLL_MS || '12000', 10), 2000);
const BATCH_SIZE = Math.min(
  Math.max(parseInt(process.env.DEAL_OUTBOUND_WORKER_BATCH_SIZE || '12', 10), 1),
  50,
);
const REQUEST_TIMEOUT_MS = Math.max(
  parseInt(process.env.DEAL_OUTBOUND_WORKER_REQUEST_TIMEOUT_MS || '12000', 10),
  1000,
);
const RETRY_BASE_MS = Math.max(
  parseInt(process.env.DEAL_OUTBOUND_RETRY_BASE_MS || '15000', 10),
  1000,
);
const RETRY_MAX_MS = Math.max(
  parseInt(process.env.DEAL_OUTBOUND_RETRY_MAX_MS || '300000', 10),
  RETRY_BASE_MS,
);
const MAX_RETRIES = Math.max(parseInt(process.env.DEAL_OUTBOUND_WORKER_MAX_RETRIES || '10', 10), 1);

const WORKER_ID = `${os.hostname()}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;

let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => global.setTimeout(resolve, ms));
}

function clipError(err, maxLength = 320) {
  const detail = err?.response?.data || err?.message || 'Unknown dispatch error';
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail);
  return text.slice(0, maxLength);
}

function nextBackoffMs(currentAttempt) {
  const exponential = RETRY_BASE_MS * Math.pow(2, Math.max(Number(currentAttempt || 1) - 1, 0));
  return Math.min(exponential, RETRY_MAX_MS);
}

function queueWebhookUrl() {
  return String(
    process.env.DEAL_OUTBOUND_WEBHOOK_URL || process.env.OPENCLAW_WEBHOOK_URL || '',
  ).trim();
}

function buildOutboundPayload(deal, queueItem) {
  const disputeStatus = deal.dispute?.status || 'none';
  return {
    source: 'pva-bazaar-deal-dispatch-worker',
    worker: WORKER_NAME,
    event: 'pvabazaar.deal.outbound.dispatch',
    timestamp: new Date().toISOString(),
    deal: {
      id: String(deal._id),
      title: deal.title || '',
      status: deal.status || 'draft',
      escrowStatus: deal.escrow?.status || 'draft',
      disputeStatus,
      resolutionCode: deal.dispute?.resolutionCode || '',
      resolutionHash: deal.dispute?.resolutionHash || '',
    },
    packet: {
      packetId: queueItem.packetId,
      packetHash: queueItem.packetHash || '',
      targets: Array.isArray(queueItem.targets) ? queueItem.targets : [],
      attempts: Number(queueItem.attempts || 0),
      createdAt: queueItem.createdAt || null,
      nextAttemptAt: queueItem.nextAttemptAt || null,
    },
  };
}

async function fetchQueueBatch() {
  const now = new Date();
  const deals = await Deal.find({
    outboundDispatchQueue: { $elemMatch: { status: { $in: ['queued', 'failed'] } } },
  })
    .limit(100)
    .lean();

  const items = [];
  for (const deal of deals) {
    for (const queueItem of Array.isArray(deal.outboundDispatchQueue)
      ? deal.outboundDispatchQueue
      : []) {
      if (!['queued', 'failed'].includes(String(queueItem.status || 'queued'))) continue;
      const nextAttempt = queueItem.nextAttemptAt ? new Date(queueItem.nextAttemptAt) : null;
      if (nextAttempt && nextAttempt.getTime() > now.getTime()) continue;
      if (Number(queueItem.attempts || 0) >= MAX_RETRIES && String(queueItem.status) !== 'queued')
        continue;
      items.push({ dealId: String(deal._id), deal, queueItem });
      if (items.length >= BATCH_SIZE) return items;
    }
  }

  return items;
}

async function persistSuccess(dealId, packetId, statusCode) {
  await Deal.updateOne(
    { _id: dealId, 'outboundDispatchQueue.packetId': packetId },
    {
      $set: {
        'outboundDispatchQueue.$.status': 'sent',
        'outboundDispatchQueue.$.sentAt': new Date(),
        'outboundDispatchQueue.$.lastAttemptAt': new Date(),
        'outboundDispatchQueue.$.updatedAt': new Date(),
        'outboundDispatchQueue.$.lastError': '',
        'outboundDispatchQueue.$.nextAttemptAt': null,
        'outboundDispatchQueue.$.lastStatusCode': statusCode || 200,
      },
      $inc: { 'outboundDispatchQueue.$.attempts': 1 },
    },
  );
}

async function persistFailure(dealId, packetId, currentAttempt, err) {
  const delay = nextBackoffMs(currentAttempt);
  const nextAttemptAt = new Date(Date.now() + delay);
  const deadLettered = currentAttempt >= MAX_RETRIES;

  await Deal.updateOne(
    { _id: dealId, 'outboundDispatchQueue.packetId': packetId },
    {
      $set: {
        'outboundDispatchQueue.$.status': deadLettered ? 'failed' : 'queued',
        'outboundDispatchQueue.$.lastAttemptAt': new Date(),
        'outboundDispatchQueue.$.updatedAt': new Date(),
        'outboundDispatchQueue.$.lastError': clipError(err),
        'outboundDispatchQueue.$.nextAttemptAt': deadLettered ? null : nextAttemptAt,
      },
      $inc: { 'outboundDispatchQueue.$.attempts': 1 },
    },
  );
}

async function processOne(item, webhookUrl) {
  const { dealId, deal, queueItem } = item;
  const attemptCount = Number(queueItem.attempts || 0) + 1;
  const payload = buildOutboundPayload(deal, queueItem);

  try {
    const response = await axios.post(webhookUrl, payload, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.DEAL_OUTBOUND_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.DEAL_OUTBOUND_WEBHOOK_TOKEN}` }
          : {}),
      },
    });
    await persistSuccess(dealId, queueItem.packetId, response.status);
    return { ok: true };
  } catch (err) {
    await persistFailure(dealId, queueItem.packetId, attemptCount, err);
    return { ok: false, error: clipError(err) };
  }
}

async function processLoop() {
  const webhookUrl = queueWebhookUrl();
  if (!webhookUrl) {
    console.log(
      `[DealOutboundWorker] ${WORKER_NAME} idle (no DEAL_OUTBOUND_WEBHOOK_URL or OPENCLAW_WEBHOOK_URL configured)`,
    );
    return;
  }

  const batch = await fetchQueueBatch();
  if (!batch.length) return;

  let success = 0;
  let failed = 0;
  for (const item of batch) {
    const result = await processOne(item, webhookUrl);
    if (result.ok) success += 1;
    else failed += 1;
  }

  console.log(
    `[DealOutboundWorker] cycle processed=${batch.length} sent=${success} failed=${failed}`,
  );
}

async function main() {
  console.log(`[DealOutboundWorker] starting worker=${WORKER_NAME} workerId=${WORKER_ID}`);
  await dbConnect();

  while (!shuttingDown) {
    try {
      await processLoop();
    } catch (err) {
      console.error('[DealOutboundWorker] cycle error:', err?.message || err);
    }
    if (!shuttingDown) {
      await sleep(POLL_MS);
    }
  }

  console.log('[DealOutboundWorker] stopping');
}

process.on('SIGINT', async () => {
  shuttingDown = true;
});
process.on('SIGTERM', async () => {
  shuttingDown = true;
});

main().catch((err) => {
  console.error('[DealOutboundWorker] fatal error:', err);
  process.exit(1);
});
