const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dbConnect = require('../lib/dbConnect');

const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
const OPENAI_TEMPERATURE = Math.min(
  Math.max(parseFloat(process.env.OPENAI_TEMPERATURE || '0.35'), 0),
  2,
);
const OPENAI_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.OPENAI_TIMEOUT_MS || process.env.OPENCLAW_OPENAI_TIMEOUT_MS || '20000', 10), 5000),
  60000,
);
const POLLINATIONS_API_URL = String(process.env.POLLINATIONS_API_URL || 'https://text.pollinations.ai').trim().replace(/\/$/, '');
const POLLINATIONS_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.POLLINATIONS_TIMEOUT_MS || '20000', 10), 5000),
  60000,
);

const router = express.Router();

function readLastLines(filePath, maxLines = 200) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw) {
    return [];
  }

  const lines = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length <= maxLines) {
    return lines;
  }

  return lines.slice(lines.length - maxLines);
}

function extractLatestLine(lines, token) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].includes(token)) {
      return lines[index];
    }
  }
  return null;
}

function parseTimestamp(line) {
  if (!line) return null;
  const match = line.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function getRequestBaseUrl(req) {
  const configured = normalizeUrl(process.env.OPENCLAW_BACKEND_URL || process.env.PUBLIC_BACKEND_URL || '');
  if (configured) return configured;

  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

function parseChatIds(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function sendTelegramMessage(chatId, text) {
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  return axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      text: String(text || '').slice(0, 3500),
      disable_web_page_preview: true,
    },
    {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

async function loadTelegramReadyRecipients(requestedChatIds = []) {
  const envChatIds = parseChatIds(process.env.TELEGRAM_ALLOWED_CHAT_IDS || '');
  const candidates = [...new Set([...requestedChatIds, ...envChatIds])].filter(Boolean);

  if (candidates.length) {
    return candidates;
  }

  await dbConnect();
  const OpenClawMemory = require('../models/OpenClawMemory');
  const latest = await OpenClawMemory.findOne({
    key: { $in: ['telegram:lastChatId', 'ecosystem:telegram-bridge:lastChatId'] },
  }).sort({ createdAt: -1 }).lean();

  if (latest?.value) {
    return [String(latest.value).trim()].filter(Boolean);
  }

  return [];
}

function isRecentTimestamp(value, maxAgeMinutes = 10) {
  if (!value) return false;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return false;
  return (Date.now() - parsed) <= maxAgeMinutes * 60 * 1000;
}

async function probeUrl(url, timeoutMs = 6000, headers = {}) {
  if (!url) {
    return {
      configured: false,
      reachable: false,
      url: '',
      message: 'Not configured',
    };
  }

  try {
    const response = await axios.get(url, {
      headers,
      timeout: timeoutMs,
    });

    return {
      configured: true,
      reachable: response.status >= 200 && response.status < 500,
      status: response.status,
      url,
      message: 'Reachable',
      detail: response.data || null,
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      status: err?.response?.status || null,
      url,
      message: err?.response?.data?.message || err.message || 'Request failed',
      detail: err?.response?.data || null,
    };
  }
}

async function loadMemoryEntries(keys = [], limit = 60) {
  await dbConnect();
  const OpenClawMemory = require('../models/OpenClawMemory');
  const query = Array.isArray(keys) && keys.length ? { key: { $in: keys } } : {};
  return OpenClawMemory.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function buildEcosystemSnapshot({ queue, worker } = {}) {
  const websiteUrl = normalizeUrl(process.env.OPENCLAW_WEBSITE_URL || process.env.PUBLIC_WEBSITE_URL || 'https://pvabazaar.org');
  const websiteHealthUrl = normalizeUrl(process.env.OPENCLAW_WEBSITE_HEALTH_URL || `${websiteUrl}/api/health`);
  const ollamaBaseUrl = normalizeUrl(process.env.OLLAMA_BASE_URL || process.env.OPENCLAW_OLLAMA_BASE_URL || '');
  const ollamaModel = String(process.env.OLLAMA_MODEL || process.env.OPENCLAW_OLLAMA_MODEL || '').trim();

  const memoryKeys = [
    'ecosystem:openclaw-responder:lastHeartbeat',
    'ecosystem:openclaw-responder:brain',
    'ecosystem:openclaw-responder:connectionState',
    'ecosystem:openclaw-responder:consecutiveFailures',
    'ecosystem:openclaw-responder:lastError',
    'ecosystem:openclaw-worker:lastHeartbeat',
    'ecosystem:openclaw-worker:connectionState',
    'ecosystem:openclaw-worker:consecutiveFailures',
    'ecosystem:openclaw-worker:lastStatus',
    'ecosystem:telegram-bridge:lastHeartbeat',
    'ecosystem:telegram-bridge:connectionState',
    'ecosystem:telegram-bridge:consecutiveFailures',
    'ecosystem:telegram-bridge:lastError',
    'telegram:lastHeartbeat',
    'telegram:lastUpdateId',
  ];

  let memory = [];
  try {
    memory = await loadMemoryEntries(memoryKeys, 80);
  } catch (_err) {
    memory = [];
  }

  const latestByKey = new Map();
  for (const item of memory) {
    if (!latestByKey.has(item.key)) {
      latestByKey.set(item.key, item);
    }
  }

  const openclawHeartbeat = latestByKey.get('ecosystem:openclaw-responder:lastHeartbeat') || null;
  const brainState = latestByKey.get('ecosystem:openclaw-responder:brain') || null;
  const responderState = latestByKey.get('ecosystem:openclaw-responder:connectionState') || null;
  const responderFailureCount = latestByKey.get('ecosystem:openclaw-responder:consecutiveFailures') || null;
  const responderLastError = latestByKey.get('ecosystem:openclaw-responder:lastError') || null;
  const workerHeartbeat = latestByKey.get('ecosystem:openclaw-worker:lastHeartbeat') || null;
  const workerState = latestByKey.get('ecosystem:openclaw-worker:connectionState') || null;
  const workerFailureCount = latestByKey.get('ecosystem:openclaw-worker:consecutiveFailures') || null;
  const telegramHeartbeat = latestByKey.get('ecosystem:telegram-bridge:lastHeartbeat') || latestByKey.get('telegram:lastHeartbeat') || null;
  const telegramState = latestByKey.get('ecosystem:telegram-bridge:connectionState') || null;
  const telegramFailureCount = latestByKey.get('ecosystem:telegram-bridge:consecutiveFailures') || null;
  const telegramLastError = latestByKey.get('ecosystem:telegram-bridge:lastError') || null;
  const telegramUpdate = latestByKey.get('telegram:lastUpdateId') || null;

  const [websiteProbe, websiteRootProbe, ollamaProbe] = await Promise.all([
    probeUrl(websiteHealthUrl, 6000),
    websiteUrl && websiteUrl !== websiteHealthUrl
      ? probeUrl(websiteUrl, 6000)
      : Promise.resolve({ configured: true, reachable: false, url: websiteUrl, message: 'Not checked' }),
    ollamaBaseUrl
      ? probeUrl(`${ollamaBaseUrl}/api/version`, 6000)
      : Promise.resolve({ configured: false, reachable: false, url: '', message: 'Not configured' }),
  ]);

  const telegramConfigured = Boolean(telegramHeartbeat || telegramUpdate || process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_ALLOWED_CHAT_IDS);
  const telegramLive = isRecentTimestamp(telegramHeartbeat?.createdAt, 10);
  const telegramWebhookConfigured = Boolean(process.env.TELEGRAM_WEBHOOK_URL || process.env.TELEGRAM_WEBHOOK_ENABLED === 'true');
  const responderLive = isRecentTimestamp(openclawHeartbeat?.createdAt, 15);
  const workerLive = isRecentTimestamp(workerHeartbeat?.createdAt, 10)
    || isRecentTimestamp(worker?.heartbeatAt, 10)
    || worker?.active === true;
  const responderStateValue = String(responderState?.value || 'unknown');
  const workerStateValue = String(workerState?.value || worker?.state || (worker?.active ? 'online' : 'unknown'));
  const telegramStateValue = String(telegramState?.value || 'unknown');
  const responderInError = responderStateValue.startsWith('error:');
  const workerInError = workerStateValue.startsWith('error:');
  const telegramInError = telegramStateValue.startsWith('error:');
  const telegramFailureValue = Number.parseInt(String(telegramFailureCount?.value || '0'), 10) || 0;
  const telegramOperational = telegramLive || (telegramWebhookConfigured && !telegramInError && telegramFailureValue === 0);
  const queuePending = queue?.pendingOutbound ?? 0;
  const staleOutbound = queue?.staleOutbound ?? 0;
  const queuePressure = queuePending > 0 || staleOutbound > 0;
  const workerInactiveWithQueuePressure = worker?.active === false && (queuePending > 0 || staleOutbound > 0);
  const websiteReachable = Boolean(websiteProbe.reachable || websiteRootProbe.reachable);
  const websiteMessage = websiteProbe.reachable
    ? websiteProbe.message
    : (websiteRootProbe.reachable
      ? `Health endpoint not reachable; root reachable (${websiteRootProbe.status || 'ok'})`
      : websiteProbe.message);

  const services = {
    website: {
      configured: true,
      url: websiteUrl,
      healthUrl: websiteHealthUrl,
      reachable: websiteReachable,
      message: websiteMessage,
      status: websiteReachable ? 'online' : 'degraded',
    },
    openclaw: {
      configured: true,
      reachable: Boolean(queue || worker),
      queuePending,
      staleOutbound,
      workerActive: worker?.active === true || workerLive,
      workerHeartbeatAt: worker?.heartbeatAt || workerHeartbeat?.createdAt || null,
      responderLive,
      responderState: responderStateValue,
      workerState: workerStateValue,
      workerFailures: Number.parseInt(String(workerFailureCount?.value || '0'), 10) || 0,
      responderFailures: Number.parseInt(String(responderFailureCount?.value || '0'), 10) || 0,
      responderLastError: responderLastError?.value || null,
      brain: brainState?.value || null,
      message: queue && worker
        ? `${queue.pendingOutbound} pending · ${queue.staleOutbound} stale`
        : 'Queue metadata unavailable',
      status: staleOutbound > 0
        || workerInactiveWithQueuePressure
        || !responderLive
        || responderInError
        || workerInError
        || (queuePressure && !workerLive)
        ? 'degraded'
        : 'online',
    },
    ollama: {
      configured: Boolean(ollamaBaseUrl),
      baseUrl: ollamaBaseUrl || null,
      model: ollamaModel || null,
      reachable: Boolean(ollamaBaseUrl && ollamaProbe.reachable),
      version: ollamaProbe?.detail?.version || ollamaProbe?.detail?.name || null,
      message: ollamaBaseUrl
        ? (ollamaProbe.reachable ? 'Reachable' : ollamaProbe.message)
        : 'Not configured',
      status: ollamaBaseUrl ? (ollamaProbe.reachable ? 'online' : 'degraded') : 'offline',
    },
    telegram: {
      configured: telegramConfigured,
      reachable: telegramOperational,
      lastHeartbeatAt: telegramHeartbeat?.createdAt || null,
      lastUpdateId: telegramUpdate?.value || null,
      connectionState: telegramStateValue,
      consecutiveFailures: telegramFailureValue,
      lastError: telegramLastError?.value || null,
      message: telegramLive
        ? 'Bridge heartbeat is fresh'
        : (telegramWebhookConfigured
          ? 'Webhook mode active'
          : (telegramConfigured ? 'Bridge heartbeat is stale or missing' : 'Not configured')),
      status: telegramOperational ? 'online' : (telegramConfigured ? 'degraded' : 'offline'),
    },
  };

  const serviceList = Object.values(services);
  const relevantServices = serviceList.filter((service) => service.configured !== false);
  const degradedRelevantServices = relevantServices.filter((service) => service.status !== 'online');
  const anyOnline = relevantServices.some((service) => service.status === 'online');

  return {
    status: degradedRelevantServices.length === 0 ? 'healthy' : (anyOnline ? 'degraded' : 'offline'),
    services,
    snapshotAt: new Date().toISOString(),
    responderLive,
  };
}

function buildWatchdogSummary(logLines, alertLines) {
  const latestError = extractLatestLine(logLines, '[ERROR]');
  const latestWarn = extractLatestLine(logLines, '[WARN]');
  const latestRecovery = extractLatestLine(logLines, 'watchdog recovered');
  const latestStatus = extractLatestLine(logLines, 'status configured=');
  const latestDispatch = extractLatestLine(logLines, 'dispatch forwarded=');
  const latestAlert = alertLines.length ? alertLines[alertLines.length - 1] : null;

  const hasRecentError = Boolean(latestError);
  const state = hasRecentError ? 'degraded' : 'ok';

  return {
    state,
    latestStatus,
    latestDispatch,
    latestError,
    latestWarn,
    latestRecovery,
    latestAlert,
    lastEventAt:
      parseTimestamp(latestAlert) ||
      parseTimestamp(latestError) ||
      parseTimestamp(latestStatus) ||
      null,
    errorCountWindow: logLines.filter(line => line.includes('[ERROR]')).length,
    warnCountWindow: logLines.filter(line => line.includes('[WARN]')).length,
    alertCountWindow: alertLines.length,
  };
}

function resolveWatchdogPaths() {
  const defaultLog = path.join(process.cwd(), 'infra', 'openclaw', 'logs', 'watchdog.log');
  const defaultAlert = path.join(process.cwd(), 'infra', 'openclaw', 'logs', 'watchdog.alert.log');

  return {
    logPath: process.env.OPENCLAW_WATCHDOG_LOG_PATH || defaultLog,
    alertPath: process.env.OPENCLAW_WATCHDOG_ALERT_PATH || defaultAlert,
  };
}

function getConfig() {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || '';
  const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL || '';
  const healthUrl = process.env.OPENCLAW_HEALTH_URL ||
    (gatewayUrl ? `${gatewayUrl.replace(/\/$/, '')}/health` : '');
  const apiKey = process.env.OPENCLAW_API_KEY || '';
  const publicMode = process.env.OPENCLAW_PUBLIC_MODE === 'true';
  const bridgeSecret = publicMode ? '' : (process.env.OPENCLAW_BRIDGE_SECRET || '');

  // Queue is always enabled — MongoDB is always connected in production.
  // Webhook/gateway are optional enhancements on top of the persistent queue.
  const queueEnabled = true;
  const webhookConfigured = Boolean(webhookUrl || gatewayUrl);

  return {
    gatewayUrl,
    webhookUrl,
    healthUrl,
    apiKey,
    bridgeSecret,
    publicMode,
    queueEnabled,
    webhookConfigured,
    configured: true, // queue is always active
  };
}

function isAuthorized(req, bridgeSecret) {
  if (!bridgeSecret) return true;
  const candidate = req.headers['x-openclaw-secret'];
  return typeof candidate === 'string' && candidate === bridgeSecret;
}

function isAdminAuthenticated(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token || !process.env.JWT_SECRET) return false;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded && decoded.role === 'admin';
  } catch (_err) {
    return false;
  }
}

function isBridgeOrAdminAuthorized(req, bridgeSecret) {
  return isAuthorized(req, bridgeSecret) || isAdminAuthenticated(req);
}

function requireBridgeOrAdmin(req, res, config, unauthorizedMessage) {
  if (isBridgeOrAdminAuthorized(req, config.bridgeSecret)) {
    return true;
  }

  res.status(401).json({
    ok: false,
    message: unauthorizedMessage,
  });
  return false;
}

async function getQueueStats() {
  await dbConnect();
  const OpenClawMessage = require('../models/OpenClawMessage');

  const staleMinutes = Math.max(parseInt(process.env.OPENCLAW_STALE_MINUTES || '30', 10), 1);
  const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

  const [
    pendingOutbound,
    processedOutbound,
    inboundCount,
    staleOutbound,
    oldestPending,
    latestInbound,
    latestOutbound,
  ] = await Promise.all([
    OpenClawMessage.countDocuments({ direction: 'outbound', processed: false }),
    OpenClawMessage.countDocuments({ direction: 'outbound', processed: true }),
    OpenClawMessage.countDocuments({ direction: 'inbound' }),
    OpenClawMessage.countDocuments({
      direction: 'outbound',
      processed: false,
      createdAt: { $lt: staleCutoff },
    }),
    OpenClawMessage.findOne({ direction: 'outbound', processed: false })
      .sort({ createdAt: 1 })
      .select({ _id: 1, createdAt: 1, event: 1 })
      .lean(),
    OpenClawMessage.findOne({ direction: 'inbound' })
      .sort({ createdAt: -1 })
      .select({ _id: 1, createdAt: 1, event: 1 })
      .lean(),
    OpenClawMessage.findOne({ direction: 'outbound' })
      .sort({ createdAt: -1 })
      .select({ _id: 1, createdAt: 1, event: 1 })
      .lean(),
  ]);

  return {
    pendingOutbound,
    processedOutbound,
    inboundCount,
    staleOutbound,
    staleMinutes,
    oldestPendingAt: oldestPending?.createdAt || null,
    oldestPendingEvent: oldestPending?.event || null,
    latestInboundAt: latestInbound?.createdAt || null,
    latestInboundEvent: latestInbound?.event || null,
    latestOutboundAt: latestOutbound?.createdAt || null,
    latestOutboundEvent: latestOutbound?.event || null,
  };
}

async function getWorkerStatus() {
  try {
    await dbConnect();
    const OpenClawWorkerLease = require('../models/OpenClawWorkerLease');
    const workerName = process.env.OPENCLAW_WORKER_NAME || 'openclaw-queue-dispatcher';
    const lease = await OpenClawWorkerLease.findOne({ name: workerName }).lean();
    const memory = await loadMemoryEntries([
      'ecosystem:openclaw-worker:lastHeartbeat',
      'ecosystem:openclaw-worker:connectionState',
      'ecosystem:openclaw-worker:consecutiveFailures',
      'ecosystem:openclaw-worker:lastStatus',
    ], 10);
    const workerHeartbeat = memory.find((item) => item.key === 'ecosystem:openclaw-worker:lastHeartbeat') || null;
    const workerState = memory.find((item) => item.key === 'ecosystem:openclaw-worker:connectionState') || null;
    const workerFailures = memory.find((item) => item.key === 'ecosystem:openclaw-worker:consecutiveFailures') || null;

    const heartbeatAt = workerHeartbeat?.createdAt || null;
    const heartbeatFresh = isRecentTimestamp(heartbeatAt, 10);

    if (!lease) {
      return {
        configured: true,
        name: workerState?.value ? `openclaw-queue-dispatcher-${String(workerState.value).toLowerCase()}` : workerName,
        active: heartbeatFresh,
        holderId: null,
        leaseUntil: null,
        heartbeatAt,
        state: workerState?.value || 'unknown',
        failures: Number.parseInt(String(workerFailures?.value || '0'), 10) || 0,
      };
    }

    const now = Date.now();
    const leaseUntilMs = lease.leaseUntil ? new Date(lease.leaseUntil).getTime() : 0;

    return {
      configured: true,
      name: lease.name,
      active: leaseUntilMs > now,
      holderId: lease.holderId || null,
      leaseUntil: lease.leaseUntil || null,
      heartbeatAt: lease.heartbeatAt || null,
      state: leaseUntilMs > now ? 'online' : 'idle',
      failures: Number.parseInt(String(workerFailures?.value || '0'), 10) || 0,
    };
  } catch (_err) {
    return {
      configured: true,
      active: false,
      error: 'worker status unavailable',
    };
  }
}

async function saveMessage(payload) {
  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const doc = await OpenClawMessage.create(payload);
    return doc;
  } catch (_err) {
    // Persistence is best-effort. OpenClaw bridge should still function if DB is unavailable.
    return null;
  }
}

function normalizeSessionId(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  return raw.replace(/[^a-z0-9:_-]/g, '-').slice(0, 120);
}

function coerceMemoryText(value, max = 10000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

async function writeWebsiteSessionMemory({ sessionId, key, value, type = 'reflection', source = 'website-openclaw' }) {
  if (!sessionId || !key || value === undefined || value === null) return null;

  await dbConnect();
  const OpenClawMemory = require('../models/OpenClawMemory');
  return OpenClawMemory.create({
    key: String(key).slice(0, 500),
    value: coerceMemoryText(value, 10000),
    type: ['fact', 'goal', 'reflection', 'preference'].includes(type) ? type : 'reflection',
    source: String(source || 'website-openclaw').trim().slice(0, 120),
    channel: 'website-openclaw',
    profileId: sessionId,
    pinned: false,
    score: 1,
    tags: ['website', 'session-memory'],
  });
}

async function persistWebsiteConversationMemory({ sessionId, message, reply, pathName = '', source = 'website-openclaw-chat' }) {
  if (!sessionId) return;

  const trimmedPath = String(pathName || '').trim().slice(0, 180);
  const nowIso = new Date().toISOString();
  const writes = [];

  if (message) {
    writes.push(
      writeWebsiteSessionMemory({
        sessionId,
        key: `website:session:${sessionId}:user-message`,
        value: JSON.stringify({ text: String(message).slice(0, 3000), path: trimmedPath || null, timestamp: nowIso }),
        type: 'reflection',
        source,
      }),
    );
  }

  if (reply) {
    writes.push(
      writeWebsiteSessionMemory({
        sessionId,
        key: `website:session:${sessionId}:assistant-reply`,
        value: JSON.stringify({ text: String(reply).slice(0, 3000), path: trimmedPath || null, timestamp: nowIso }),
        type: 'reflection',
        source,
      }),
    );
  }

  if (writes.length) {
    await Promise.allSettled(writes);
  }
}

async function markOutboundForwardSuccess(messageId, statusCode) {
  await dbConnect();
  const OpenClawMessage = require('../models/OpenClawMessage');
  await OpenClawMessage.updateOne(
    { _id: messageId },
    {
      $set: {
        'metadata.webhookForwardedAt': new Date().toISOString(),
        'metadata.webhookForwardStatus': 'ok',
        'metadata.lastWebhookHttpStatus': statusCode,
        'metadata.lastWebhookAttemptAt': new Date().toISOString(),
        'metadata.webhookAttemptCount': 1,
      },
    },
  );
}

async function markOutboundForwardFailure(messageId, detail) {
  await dbConnect();
  const OpenClawMessage = require('../models/OpenClawMessage');
  const safeDetail = typeof detail === 'string' ? detail.slice(0, 300) : JSON.stringify(detail).slice(0, 300);
  await OpenClawMessage.updateOne(
    { _id: messageId },
    {
      $set: {
        'metadata.webhookForwardStatus': 'failed',
        'metadata.lastWebhookAttemptAt': new Date().toISOString(),
        'metadata.webhookAttemptCount': 1,
        'metadata.lastWebhookError': safeDetail,
        'metadata.nextWebhookAttemptAt': new Date().toISOString(),
      },
    },
  );
}

function buildForwardHeaders(config) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  return headers;
}

function buildOpenAIPrompt(messageText) {
  return [
    'You are PVA Magnum Opus, the OpenClaw assistant for PVA Bazaar.',
    'Answer clearly, directly, and operationally.',
    `User message: ${String(messageText || '').slice(0, 4000)}`,
  ].join('\n\n');
}

async function requestOpenAIReply(messageText) {
  if (!OPENAI_API_KEY) return null;

  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are PVA Magnum Opus. Keep answers concise and operational.',
        },
        {
          role: 'user',
          content: buildOpenAIPrompt(messageText),
        },
      ],
      temperature: OPENAI_TEMPERATURE,
    },
    {
      timeout: OPENAI_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );

  const text = response.data?.choices?.[0]?.message?.content || null;
  return text ? String(text).trim().slice(0, 3500) : null;
}

function buildPollinationsPrompt(messageText) {
  return [
    'You are PVA Magnum Opus, the assistant for PVA Bazaar.',
    'Reply clearly and directly. Keep responses practical and concise.',
    `User message: ${String(messageText || '').slice(0, 2000)}`,
  ].join('\n\n');
}

async function requestPollinationsReply(messageText) {
  if (!POLLINATIONS_API_URL) return null;

  const prompt = buildPollinationsPrompt(messageText);
  const response = await axios.get(
    `${POLLINATIONS_API_URL}/${encodeURIComponent(prompt)}`,
    {
      timeout: POLLINATIONS_TIMEOUT_MS,
      headers: {
        Accept: 'text/plain, application/json;q=0.9, */*;q=0.8',
      },
    },
  );

  const data = response.data;
  const text = typeof data === 'string'
    ? data
    : (data?.text || data?.output || data?.response || null);
  return text ? String(text).trim().slice(0, 3500) : null;
}

async function requestOnlineFallbackReply(messageText) {
  if (OPENAI_API_KEY) {
    const openaiText = await requestOpenAIReply(messageText).catch(() => null);
    if (openaiText) {
      return {
        content: openaiText,
        source: 'openai',
        model: OPENAI_MODEL,
      };
    }
  }

  const pollinationsText = await requestPollinationsReply(messageText).catch(() => null);
  if (pollinationsText) {
    return {
      content: pollinationsText,
      source: 'pollinations',
      model: 'pollinations-text',
    };
  }

  return null;
}

function isEchoLikeReplyContent(replyContent, userText) {
  const replyText = String(replyContent || '').trim();
  const promptText = String(userText || '').trim();

  if (!replyText) return false;
  if (promptText && replyText.toLowerCase() === promptText.toLowerCase()) return true;
  if (replyText.toLowerCase().startsWith('echo:')) return true;
  if (promptText && replyText.toLowerCase().includes(promptText.toLowerCase())) return true;
  return false;
}

async function forwardOutboundMessage(config, storedOutbound, payload) {
  if (!config.webhookUrl) {
    return {
      ok: true,
      forwarded: false,
      queued: true,
      message: 'Message queued in OpenClaw store; webhook not configured',
      queuedMessageId: storedOutbound ? storedOutbound._id.toString() : null,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const forward = await axios.post(config.webhookUrl, payload, {
      headers: buildForwardHeaders(config),
      timeout: 12000,
    });

    if (storedOutbound) {
      await markOutboundForwardSuccess(storedOutbound._id, forward.status);
    }

    return {
      ok: true,
      forwarded: true,
      queued: true,
      status: forward.status,
      queuedMessageId: storedOutbound ? storedOutbound._id.toString() : null,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    if (storedOutbound) {
      try {
        await markOutboundForwardFailure(storedOutbound._id, err?.response?.data || err.message || 'Unknown dispatch error');
      } catch (_persistErr) {
        // best-effort metadata update
      }
    }

    const status = err?.response?.status || 502;
    return {
      ok: false,
      status,
      forwarded: false,
      message: 'Failed to forward to OpenClaw webhook',
      detail: err?.response?.data || err.message,
    };
  }
}

async function waitForInboundReply(outboundId, requestId, waitMs) {
  await dbConnect();
  const OpenClawMessage = require('../models/OpenClawMessage');

  const startedAt = Date.now();
  const timeoutMs = Math.min(Math.max(parseInt(waitMs, 10) || 15000, 2000), 25000);
  const pollIntervalMs = 1000;

  while ((Date.now() - startedAt) < timeoutMs) {
    const inbound = await OpenClawMessage.findOne({
      direction: 'inbound',
      $or: [
        { respondingTo: outboundId },
        { 'metadata.respondingToMessageId': String(outboundId) },
        { 'metadata.replyToRequestId': requestId },
        { 'metadata.chatRequestId': requestId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (inbound) {
      return {
        ok: true,
        messageId: inbound._id.toString(),
        content: inbound.content,
        event: inbound.event,
        source: inbound.source,
        createdAt: inbound.createdAt,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return { ok: false };
}

router.get('/status', async (_req, res) => {
  const config = getConfig();

  // Probe external gateway if configured
  let reachable = false;
  let detail = null;

  if (config.healthUrl) {
    try {
      const headers = {};
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
      const result = await axios.get(config.healthUrl, {
        headers,
        timeout: 6000,
      });
      reachable = result.status >= 200 && result.status < 500;
    } catch (err) {
      detail = err?.response?.data || err.message;
    }
  }

  // Get a quick queue snapshot so the admin UI has real numbers
  let queue = null;
  try {
    queue = await getQueueStats();
  } catch (_err) {
    // best-effort
  }

  let worker = null;
  try {
    worker = await getWorkerStatus();
  } catch (_err) {
    // best-effort
  }

  let ecosystem = null;
  try {
    ecosystem = await buildEcosystemSnapshot({ queue, worker });
  } catch (_err) {
    ecosystem = null;
  }

  const mode = config.webhookConfigured ? 'webhook+queue' : 'queue-only';
  const statusMsg = config.webhookConfigured
    ? (reachable ? `Gateway reachable (${mode})` : `Gateway unreachable — events queued`)
    : `Queue-only mode — ${queue ? queue.pendingOutbound : '?'} pending`;

  res.json({
    ok: true,
    configured: true,
    queueEnabled: true,
    webhookConfigured: config.webhookConfigured,
    reachable,
    mode,
    message: statusMsg,
    gatewayUrl: config.gatewayUrl || null,
    queue: queue ? {
      pending: queue.pendingOutbound,
      stale: queue.staleOutbound,
      processed: queue.processedOutbound,
      inbound: queue.inboundCount,
      latestAt: queue.latestOutboundAt,
    } : null,
    worker,
    ecosystem,
    timestamp: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  });
});

router.post('/telegram/register-webhook', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized Telegram webhook registration request')) return;

  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const configuredUrl = String(process.env.TELEGRAM_WEBHOOK_URL || '').trim();
  const webhookUrl = String(req.body?.url || configuredUrl).trim();
  const secretToken = String(req.body?.secretToken || process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  const maxConnections = Math.min(
    Math.max(parseInt(String(req.body?.maxConnections || process.env.TELEGRAM_WEBHOOK_MAX_CONNECTIONS || '15'), 10), 1),
    100,
  );
  const allowedUpdatesInput = req.body?.allowedUpdates || process.env.TELEGRAM_WEBHOOK_ALLOWED_UPDATES || 'message,edited_message';
  const allowedUpdates = Array.isArray(allowedUpdatesInput)
    ? allowedUpdatesInput.map((item) => String(item || '').trim()).filter(Boolean)
    : String(allowedUpdatesInput)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  if (!botToken) {
    return res.status(400).json({
      ok: false,
      message: 'TELEGRAM_BOT_TOKEN is not configured',
    });
  }

  if (!webhookUrl) {
    return res.status(400).json({
      ok: false,
      message: 'webhook URL is required (set TELEGRAM_WEBHOOK_URL or pass body.url)',
    });
  }

  try {
    const setWebhookResult = await axios.post(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        url: webhookUrl,
        ...(secretToken ? { secret_token: secretToken } : {}),
        max_connections: maxConnections,
        allowed_updates: allowedUpdates,
      },
      { timeout: 12000 },
    );

    const webhookInfoResult = await axios.get(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
      { timeout: 12000 },
    );

    return res.json({
      ok: true,
      message: 'Telegram webhook registration complete',
      setWebhook: setWebhookResult.data || null,
      webhookInfo: webhookInfoResult.data || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      message: 'Failed to register Telegram webhook',
      detail: err?.response?.data || err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post('/telegram/notify-ready', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized Telegram readiness notification request')) return;

  const requestedChatIds = Array.isArray(req.body?.chatIds)
    ? req.body.chatIds.map((item) => String(item || '').trim()).filter(Boolean)
    : req.body?.chatId
      ? [String(req.body.chatId).trim()].filter(Boolean)
      : [];

  const recipients = await loadTelegramReadyRecipients(requestedChatIds);
  if (!recipients.length) {
    return res.status(404).json({
      ok: false,
      message: 'No Telegram recipient chat IDs found. Send a Telegram message once, or pass chatId/chatIds in the request body.',
      timestamp: new Date().toISOString(),
    });
  }

  const apiBaseUrl = getRequestBaseUrl(req);
  const status = await axios.get(`${apiBaseUrl}/api/openclaw/status`, { timeout: 12000 }).then((response) => response.data).catch(() => null);
  const build = await axios.get(`${apiBaseUrl}/api/version`, { timeout: 12000 }).then((response) => response.data).catch(() => null);

  if (!status?.ecosystem?.services?.telegram || status.ecosystem.services.telegram.status !== 'online') {
    return res.status(409).json({
      ok: false,
      message: 'Telegram service is not online yet. Not sending readiness text.',
      status: status?.ecosystem?.services?.telegram || null,
      timestamp: new Date().toISOString(),
    });
  }

  const message = [
    'PVA Bazaar assistant is ready.',
    `Build: ${build?.shortSha || build?.sha || 'unknown'}`,
    `OpenClaw: ${status?.mode || 'unknown'} · ${status?.ecosystem?.services?.openclaw?.status || 'unknown'}`,
    `Ollama: ${status?.ecosystem?.services?.ollama?.status || 'unknown'}`,
    'You can message me now with identity, memory, email, or task instructions and I will recall them when available.',
  ].join('\n');

  const results = [];
  for (const chatId of recipients) {
    try {
      const response = await sendTelegramMessage(chatId, message);
      const payload = response.data || {};
      results.push({ chatId, ok: Boolean(payload.ok), messageId: payload?.result?.message_id || null });
    } catch (err) {
      results.push({
        chatId,
        ok: false,
        error: err?.response?.data || err.message || 'send failed',
      });
    }
  }

  const sentCount = results.filter((item) => item.ok).length;
  const failedCount = results.length - sentCount;

  return res.json({
    ok: failedCount === 0,
    message: failedCount === 0 ? 'Ready notification sent.' : 'Ready notification partially sent.',
    recipients,
    results,
    sentCount,
    failedCount,
    timestamp: new Date().toISOString(),
  });
});

router.get('/watchdog-status', async (_req, res) => {
  const { logPath, alertPath } = resolveWatchdogPaths();

  const logLines = readLastLines(logPath, 400);
  const alertLines = readLastLines(alertPath, 120);

  if (!logLines.length && !alertLines.length) {
    // In serverless deployments watchdog file logs may not exist.
    // Fall back to queue-backed health signals so the admin UI remains useful.
    try {
      const queue = await getQueueStats();
      const degraded = queue.staleOutbound > 0 || queue.pendingOutbound > 20;
      return res.json({
        ok: true,
        available: true,
        source: 'queue-store',
        summary: {
          state: degraded ? 'degraded' : 'ok',
          latestStatus: null,
          latestDispatch: queue.latestOutboundEvent || null,
          latestError: null,
          latestWarn: queue.staleOutbound > 0 ? `staleOutbound=${queue.staleOutbound}` : null,
          latestRecovery: null,
          latestAlert: null,
          lastEventAt: queue.latestInboundAt || queue.latestOutboundAt || null,
          errorCountWindow: 0,
          warnCountWindow: queue.staleOutbound > 0 ? 1 : 0,
          alertCountWindow: 0,
          queue,
        },
        message: 'Watchdog file logs not found; using queue-store fallback',
        paths: {
          logPath,
          alertPath,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (_err) {
      return res.json({
        ok: true,
        available: false,
        source: 'none',
        message: 'No watchdog logs found yet',
        paths: {
          logPath,
          alertPath,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  const summary = buildWatchdogSummary(logLines, alertLines);

  return res.json({
    ok: true,
    available: true,
    summary,
    paths: {
      logPath,
      alertPath,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/recent-events', async (req, res) => {
  const config = getConfig();
  const requesterAuthorized = isBridgeOrAdminAuthorized(req, config.bridgeSecret);

  const limit = requesterAuthorized
    ? Math.min(parseInt(req.query.limit) || 50, 200)
    : Math.min(parseInt(req.query.limit) || 20, 25);
  const { logPath, alertPath } = resolveWatchdogPaths();

  const logLines = readLastLines(logPath, limit);
  const alertLines = readLastLines(alertPath, Math.floor(limit / 2));

  if (!logLines.length && !alertLines.length) {
    // No file logs (expected on Vercel serverless) – serve from MongoDB queue
    try {
      await dbConnect();
      const OpenClawMessage = require('../models/OpenClawMessage');
      const messages = await OpenClawMessage.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      if (!messages.length) {
        return res.json({
          ok: true,
          available: false,
          source: 'queue-store',
          events: [],
          message: 'No OpenClaw events recorded yet',
          timestamp: new Date().toISOString(),
        });
      }

      const events = messages.map((msg) => ({
        id: msg._id.toString(),
        timestamp: msg.createdAt ? msg.createdAt.toISOString() : null,
        level: msg.direction === 'inbound' ? 'INFO' : 'SUCCESS',
        type: msg.direction === 'inbound' ? 'inbound' : 'dispatch',
        message: requesterAuthorized
          ? `[${msg.direction.toUpperCase()}] ${msg.event} — ${msg.content || ''}`.trim()
          : `[${msg.direction.toUpperCase()}] ${msg.event}`,
        source: msg.source || 'queue-store',
        event: msg.event,
        direction: msg.direction,
        processed: msg.processed,
      }));

      return res.json({
        ok: true,
        available: true,
        source: 'queue-store',
        events,
        count: events.length,
        timestamp: new Date().toISOString(),
      });
    } catch (_err) {
      return res.json({
        ok: true,
        available: false,
        source: 'none',
        events: [],
        message: 'No watchdog activity logs found',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Parse log lines into structured events
  const events = logLines.map((line, idx) => {
    const timestampMatch = line.match(/^\[([^\]]+)\]/);
    const timestamp = timestampMatch ? timestampMatch[1] : null;
    
    let level = 'INFO';
    if (line.includes('[ERROR]')) level = 'ERROR';
    else if (line.includes('[WARN]')) level = 'WARN';
    else if (line.includes('[SUCCESS]')) level = 'SUCCESS';
    
    let type = 'general';
    if (line.includes('status configured=')) type = 'status-check';
    else if (line.includes('dispatch forwarded=')) type = 'dispatch';
    else if (line.includes('watchdog recovered')) type = 'recovery';
    else if (line.includes('health check failed')) type = 'health-failure';
    
    return {
      id: `log-${idx}`,
      timestamp,
      level,
      type,
      message: requesterAuthorized ? line : `[${level}] ${type}`,
      source: 'watchdog-log'
    };
  });

  // Add alert events
  alertLines.forEach((line, idx) => {
    const timestampMatch = line.match(/^\[([^\]]+)\]/);
    events.push({
      id: `alert-${idx}`,
      timestamp: timestampMatch ? timestampMatch[1] : null,
      level: 'ALERT',
      type: 'alert',
      message: requesterAuthorized ? line : '[ALERT] watchdog alert',
      source: 'alert-log'
    });
  });

  // Sort by timestamp (most recent first)
  events.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return res.json({
    ok: true,
    available: true,
    events: events.slice(0, limit),
    count: events.length,
    timestamp: new Date().toISOString(),
  });
});

router.post('/dispatch', async (req, res) => {
  const config = getConfig();

  if (!isBridgeOrAdminAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized OpenClaw dispatch request',
    });
  }

  const { message, event, metadata } = req.body || {};

  if (!message && !event) {
    return res.status(400).json({
      ok: false,
      message: 'Provide at least one of: message, event',
    });
  }

  let storedOutbound = null;

  try {
    storedOutbound = await saveMessage({
      direction: 'outbound',
      content: message || event,
      event: event || 'pvabazaar.dispatch',
      source: metadata?.source || 'openclaw-dispatch',
      processed: false,
      metadata: metadata || {},
    });

    const payload = {
      source: 'pvabazaar-backend',
      message: message || null,
      event: event || 'pvabazaar.dispatch',
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };
    const result = await forwardOutboundMessage(config, storedOutbound, payload);
    if (!result.ok) {
      return res.status(result.status || 502).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to dispatch OpenClaw message',
      detail: err.message,
    });
  }
});

router.post('/chat', async (req, res) => {
  const config = getConfig();

  if (!isBridgeOrAdminAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized OpenClaw chat request',
    });
  }

  const text = String(req.body?.message || '').trim();
  const waitForReplyMs = req.body?.waitForReplyMs;
  const source = String(req.body?.source || 'admin-openclaw-chat').trim() || 'admin-openclaw-chat';

  if (!text) {
    return res.status(400).json({
      ok: false,
      message: 'message is required',
    });
  }

  const chatRequestId = crypto.randomUUID();
  const outboundEvent = 'pvabazaar.admin.chat';
  const rawMetadata = (req.body && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata))
    ? req.body.metadata
    : {};
  const metadata = {
    ...rawMetadata,
    source,
    chatRequestId,
    timestamp: new Date().toISOString(),
  };

  try {
    const outbound = await saveMessage({
      direction: 'outbound',
      content: text,
      event: outboundEvent,
      source,
      processed: false,
      metadata,
    });

    const payload = {
      source: 'pvabazaar-backend',
      message: text,
      event: outboundEvent,
      metadata: {
        ...metadata,
        outboundMessageId: outbound ? outbound._id.toString() : null,
      },
      timestamp: new Date().toISOString(),
    };

    const forward = await forwardOutboundMessage(config, outbound, payload);
    if (!forward.ok) {
      const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
      if (onlineReply) {
        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: false,
          reply: {
            ok: true,
            content: onlineReply.content,
            source: onlineReply.source,
            model: onlineReply.model,
          },
          chatRequestId,
          message: 'Online fallback reply generated.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(forward.status || 502).json(forward);
    }

    if (!forward.forwarded) {
      const outboundId = outbound ? outbound._id : null;
      if (!outboundId) {
        const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
        if (onlineReply) {
          return res.json({
            ok: true,
            queued: true,
            forwarded: false,
            waiting: false,
            chatRequestId,
            reply: {
              ok: true,
              content: onlineReply.content,
              source: onlineReply.source,
              model: onlineReply.model,
            },
            message: 'Online fallback reply generated.',
            timestamp: new Date().toISOString(),
          });
        }

        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: true,
          chatRequestId,
          message: 'Message queued. Waiting for remote responder output.',
          timestamp: new Date().toISOString(),
        });
      }

      const queuedReply = await waitForInboundReply(outboundId, chatRequestId, waitForReplyMs);
      if (queuedReply.ok && !isEchoLikeReplyContent(queuedReply.content, text)) {
        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: false,
          chatRequestId,
          reply: queuedReply,
          timestamp: new Date().toISOString(),
        });
      }

      const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
      if (onlineReply) {
        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: false,
          chatRequestId,
          reply: {
            ok: true,
            content: onlineReply.content,
            source: onlineReply.source,
            model: onlineReply.model,
          },
          message: 'Online fallback reply generated.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({
        ok: true,
        queued: true,
        forwarded: false,
        waiting: true,
        chatRequestId,
        message: 'Message queued. Waiting for remote responder output.',
        timestamp: new Date().toISOString(),
      });
    }

    const outboundId = outbound ? outbound._id : null;
    if (!outboundId) {
      const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
      if (onlineReply) {
        return res.json({
          ok: true,
          queued: true,
          forwarded: forward.forwarded,
          waiting: false,
          chatRequestId,
          reply: {
            ok: true,
            content: onlineReply.content,
            source: onlineReply.source,
            model: onlineReply.model,
          },
          message: 'Online fallback reply generated.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({
        ok: true,
        queued: true,
        forwarded: forward.forwarded,
        waiting: false,
        message: 'Chat message accepted, but response matching is unavailable without message persistence.',
        chatRequestId,
        timestamp: new Date().toISOString(),
      });
    }

    const reply = await waitForInboundReply(outboundId, chatRequestId, waitForReplyMs);
    if (reply.ok && isEchoLikeReplyContent(reply.content, text)) {
      const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
      if (onlineReply) {
        return res.json({
          ok: true,
          queued: true,
          forwarded: forward.forwarded,
          waiting: false,
          chatRequestId,
          reply: {
            ok: true,
            content: onlineReply.content,
            source: onlineReply.source,
            model: onlineReply.model,
          },
          message: 'Online fallback reply generated.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({
        ok: true,
        queued: true,
        forwarded: forward.forwarded,
        waiting: true,
        chatRequestId,
        message: 'Responder returned placeholder output; waiting for final response.',
        timestamp: new Date().toISOString(),
      });
    }

    if (reply.ok) {
      return res.json({
        ok: true,
        queued: true,
        forwarded: forward.forwarded,
        waiting: false,
        chatRequestId,
        reply,
        timestamp: new Date().toISOString(),
      });
    }

    const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
    if (onlineReply) {
      return res.json({
        ok: true,
        queued: true,
        forwarded: forward.forwarded,
        waiting: false,
        chatRequestId,
        reply: {
          ok: true,
          content: onlineReply.content,
          source: onlineReply.source,
          model: onlineReply.model,
        },
        message: 'Online fallback reply generated.',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      ok: true,
      queued: true,
      forwarded: forward.forwarded,
      waiting: true,
      chatRequestId,
      message: 'Message sent. Waiting timed out; poll messages for agent reply.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to process OpenClaw chat request',
      detail: err.message,
    });
  }
});

router.post('/public/pulse', async (req, res) => {
  const sessionId = normalizeSessionId(req.body?.sessionId);
  if (!sessionId) {
    return res.status(400).json({
      ok: false,
      message: 'sessionId is required',
    });
  }

  const pathName = String(req.body?.path || '').trim().slice(0, 180);
  const pageTitle = String(req.body?.title || '').trim().slice(0, 180);
  const referrer = String(req.body?.referrer || '').trim().slice(0, 220);

  try {
    await writeWebsiteSessionMemory({
      sessionId,
      key: `website:session:${sessionId}:presence`,
      value: JSON.stringify({
        path: pathName || null,
        title: pageTitle || null,
        referrer: referrer || null,
        timestamp: new Date().toISOString(),
      }),
      type: 'fact',
      source: 'website-openclaw-pulse',
    });

    return res.json({
      ok: true,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to record website pulse',
      error: err.message,
    });
  }
});

router.get('/public/memory', async (req, res) => {
  const sessionId = normalizeSessionId(req.query.sessionId);
  if (!sessionId) {
    return res.status(400).json({
      ok: false,
      message: 'sessionId is required',
    });
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 60);
  try {
    await dbConnect();
    const OpenClawMemory = require('../models/OpenClawMemory');

    const docs = await OpenClawMemory.find({
      profileId: sessionId,
      channel: 'website-openclaw',
      key: { $regex: '^website:session:' },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      sessionId,
      memory: docs.map((item) => ({
        id: item._id.toString(),
        key: item.key,
        value: String(item.value || '').slice(0, 1200),
        type: item.type,
        source: item.source,
        createdAt: item.createdAt,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to load website memory',
      error: err.message,
    });
  }
});

router.post('/public-chat', async (req, res) => {
  const config = getConfig();
  const sessionId = normalizeSessionId(req.body?.sessionId);
  const text = String(req.body?.message || '').trim().slice(0, 1200);
  const waitForReplyMs = req.body?.waitForReplyMs;
  const pathName = String(req.body?.path || '').trim().slice(0, 180);
  const source = String(req.body?.source || 'website-openclaw-widget').trim().slice(0, 120) || 'website-openclaw-widget';

  if (!sessionId) {
    return res.status(400).json({ ok: false, message: 'sessionId is required' });
  }
  if (!text) {
    return res.status(400).json({ ok: false, message: 'message is required' });
  }

  const chatRequestId = crypto.randomUUID();
  const outboundEvent = 'pvabazaar.website.chat';
  const rawMetadata = (req.body && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata))
    ? req.body.metadata
    : {};
  const metadata = {
    ...rawMetadata,
    source,
    sessionId,
    path: pathName || null,
    chatRequestId,
    timestamp: new Date().toISOString(),
  };

  try {
    const outbound = await saveMessage({
      direction: 'outbound',
      content: text,
      event: outboundEvent,
      source,
      processed: false,
      metadata,
    });

    const payload = {
      source: 'pvabazaar-backend',
      message: text,
      event: outboundEvent,
      metadata: {
        ...metadata,
        outboundMessageId: outbound ? outbound._id.toString() : null,
      },
      timestamp: new Date().toISOString(),
    };

    const forward = await forwardOutboundMessage(config, outbound, payload);
    if (!forward.ok) {
      const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
      if (onlineReply) {
        await persistWebsiteConversationMemory({
          sessionId,
          message: text,
          reply: onlineReply.content,
          pathName,
          source,
        });

        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: false,
          reply: {
            ok: true,
            content: onlineReply.content,
            source: onlineReply.source,
            model: onlineReply.model,
          },
          chatRequestId,
          sessionId,
          message: 'Online fallback reply generated.',
          timestamp: new Date().toISOString(),
        });
      }

      await persistWebsiteConversationMemory({ sessionId, message: text, pathName, source });
      return res.status(forward.status || 502).json(forward);
    }

    if (!forward.forwarded) {
      const outboundId = outbound ? outbound._id : null;
      if (!outboundId) {
        const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
        if (onlineReply) {
          await persistWebsiteConversationMemory({
            sessionId,
            message: text,
            reply: onlineReply.content,
            pathName,
            source,
          });

          return res.json({
            ok: true,
            queued: true,
            forwarded: false,
            waiting: false,
            sessionId,
            chatRequestId,
            reply: {
              ok: true,
              content: onlineReply.content,
              source: onlineReply.source,
              model: onlineReply.model,
            },
            message: 'Online fallback reply generated.',
            timestamp: new Date().toISOString(),
          });
        }

        await persistWebsiteConversationMemory({ sessionId, message: text, pathName, source });
        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: true,
          sessionId,
          chatRequestId,
          message: 'Message queued. Waiting for remote responder output.',
          timestamp: new Date().toISOString(),
        });
      }

      const queuedReply = await waitForInboundReply(outboundId, chatRequestId, waitForReplyMs);
      if (queuedReply.ok && !isEchoLikeReplyContent(queuedReply.content, text)) {
        await persistWebsiteConversationMemory({
          sessionId,
          message: text,
          reply: queuedReply.content,
          pathName,
          source,
        });

        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: false,
          sessionId,
          chatRequestId,
          reply: queuedReply,
          timestamp: new Date().toISOString(),
        });
      }

      const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
      if (onlineReply) {
        await persistWebsiteConversationMemory({
          sessionId,
          message: text,
          reply: onlineReply.content,
          pathName,
          source,
        });

        return res.json({
          ok: true,
          queued: true,
          forwarded: false,
          waiting: false,
          sessionId,
          chatRequestId,
          reply: {
            ok: true,
            content: onlineReply.content,
            source: onlineReply.source,
            model: onlineReply.model,
          },
          message: 'Online fallback reply generated.',
          timestamp: new Date().toISOString(),
        });
      }

      await persistWebsiteConversationMemory({ sessionId, message: text, pathName, source });
      return res.json({
        ok: true,
        queued: true,
        forwarded: false,
        waiting: true,
        sessionId,
        chatRequestId,
        message: 'Message queued. Waiting for remote responder output.',
        timestamp: new Date().toISOString(),
      });
    }

    const outboundId = outbound ? outbound._id : null;
    if (outboundId) {
      const reply = await waitForInboundReply(outboundId, chatRequestId, waitForReplyMs);
      if (reply.ok && !isEchoLikeReplyContent(reply.content, text)) {
        await persistWebsiteConversationMemory({
          sessionId,
          message: text,
          reply: reply.content,
          pathName,
          source,
        });

        return res.json({
          ok: true,
          queued: true,
          forwarded: true,
          waiting: false,
          sessionId,
          chatRequestId,
          reply,
          timestamp: new Date().toISOString(),
        });
      }

      const onlineReply = await requestOnlineFallbackReply(text).catch(() => null);
      if (onlineReply) {
        await persistWebsiteConversationMemory({
          sessionId,
          message: text,
          reply: onlineReply.content,
          pathName,
          source,
        });

        return res.json({
          ok: true,
          queued: true,
          forwarded: true,
          waiting: false,
          sessionId,
          chatRequestId,
          reply: {
            ok: true,
            content: onlineReply.content,
            source: onlineReply.source,
            model: onlineReply.model,
          },
          message: 'Online fallback reply generated.',
          timestamp: new Date().toISOString(),
        });
      }
    }

    await persistWebsiteConversationMemory({ sessionId, message: text, pathName, source });
    return res.json({
      ok: true,
      queued: true,
      forwarded: forward.forwarded,
      waiting: true,
      sessionId,
      chatRequestId,
      message: 'Message sent. Waiting timed out; try again in a few seconds.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to process public OpenClaw chat request',
      detail: err.message,
    });
  }
});

router.get('/messages', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw messages request')) return;

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');

    const limit = Math.min(parseInt(req.query.limit, 10) || 120, 300);
    const query = {};

    if (req.query.direction) {
      query.direction = req.query.direction;
    }

    if (req.query.unprocessed === 'true') {
      query.processed = false;
    }

    const messages = await OpenClawMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      message: 'Message store unavailable',
      error: err.message,
    });
  }
});

router.get('/queue-stats', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw queue stats request')) return;

  try {
    const stats = await getQueueStats();

    return res.json({
      ok: true,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      message: 'Failed to load OpenClaw queue stats',
      error: err.message,
    });
  }
});

router.post('/replay-webhook', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw replay request')) return;

  if (!config.webhookUrl) {
    return res.status(400).json({
      ok: false,
      message: 'OpenClaw webhook is not configured',
    });
  }

  const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 15, 1), 100);
  const dryRun = req.body?.dryRun === true;

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const pending = await OpenClawMessage.find({ direction: 'outbound', processed: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    if (!pending.length) {
      return res.json({
        ok: true,
        dryRun,
        attempted: 0,
        forwarded: 0,
        failed: 0,
        message: 'No pending outbound OpenClaw messages to replay',
        timestamp: new Date().toISOString(),
      });
    }

    if (dryRun) {
      return res.json({
        ok: true,
        dryRun: true,
        attempted: pending.length,
        forwarded: 0,
        failed: 0,
        candidateIds: pending.map(item => item._id.toString()),
        timestamp: new Date().toISOString(),
      });
    }

    let forwarded = 0;
    let failed = 0;
    const failures = [];

    for (const entry of pending) {
      const payload = {
        source: 'pvabazaar-openclaw-replay',
        message: entry.content || null,
        event: entry.event || 'pvabazaar.dispatch.replay',
        metadata: {
          ...(entry.metadata || {}),
          replayed: true,
          replayedAt: new Date().toISOString(),
          replayedMessageId: entry._id.toString(),
        },
        timestamp: new Date().toISOString(),
      };

      try {
        await axios.post(config.webhookUrl, payload, { headers, timeout: 12000 });
        forwarded += 1;
        await OpenClawMessage.updateOne(
          { _id: entry._id },
          {
            $set: {
              'metadata.lastWebhookReplayAt': new Date().toISOString(),
              'metadata.lastWebhookReplayStatus': 'ok',
            },
          },
        );
      } catch (err) {
        failed += 1;
        const detail = err?.response?.data || err.message || 'Unknown replay error';
        failures.push({
          id: entry._id.toString(),
          status: err?.response?.status || null,
          detail,
        });
        await OpenClawMessage.updateOne(
          { _id: entry._id },
          {
            $set: {
              'metadata.lastWebhookReplayAt': new Date().toISOString(),
              'metadata.lastWebhookReplayStatus': 'failed',
              'metadata.lastWebhookReplayError': typeof detail === 'string' ? detail.slice(0, 300) : JSON.stringify(detail).slice(0, 300),
            },
          },
        );
      }
    }

    return res.json({
      ok: true,
      dryRun: false,
      attempted: pending.length,
      forwarded,
      failed,
      failures: failures.slice(0, 20),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to replay queued OpenClaw messages',
      error: err.message,
    });
  }
});

// POST /api/openclaw/recover
// Attempts light-weight self-heal actions for stale queue conditions.
router.post('/recover', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw recover request')) return;

  try {
    const statsBefore = await getQueueStats();
    const worker = await getWorkerStatus();
    const staleThreshold = Math.max(parseInt(process.env.OPENCLAW_RECOVER_STALE_MIN || '2', 10), 1);
    const heartbeatAt = worker?.heartbeatAt ? new Date(worker.heartbeatAt).getTime() : null;
    const heartbeatAgeMin = heartbeatAt ? Math.max(Math.round((Date.now() - heartbeatAt) / 60000), 0) : null;
    const workerStale = heartbeatAgeMin !== null && heartbeatAgeMin > staleThreshold;

    const actions = [];
    let replay = null;

    // If stale outbound items exist and webhook is configured, replay a small batch.
    if (config.webhookUrl && statsBefore.staleOutbound > 0) {
      actions.push('replay-webhook');

      await dbConnect();
      const OpenClawMessage = require('../models/OpenClawMessage');
      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

      const pending = await OpenClawMessage.find({ direction: 'outbound', processed: false })
        .sort({ createdAt: 1 })
        .limit(10)
        .lean();

      let forwarded = 0;
      let failed = 0;
      for (const entry of pending) {
        const payload = {
          source: 'pvabazaar-openclaw-recover',
          message: entry.content || null,
          event: entry.event || 'pvabazaar.dispatch.recover',
          metadata: {
            ...(entry.metadata || {}),
            recovered: true,
            recoveredAt: new Date().toISOString(),
            recoveredMessageId: entry._id.toString(),
          },
          timestamp: new Date().toISOString(),
        };

        try {
          await axios.post(config.webhookUrl, payload, { headers, timeout: 12000 });
          forwarded += 1;
        } catch (_err) {
          failed += 1;
        }
      }

      replay = {
        attempted: pending.length,
        forwarded,
        failed,
      };
    }

    const statsAfter = await getQueueStats();
    return res.json({
      ok: true,
      worker: {
        active: Boolean(worker?.active),
        heartbeatAgeMin,
        stale: workerStale,
      },
      queue: {
        before: statsBefore,
        after: statsAfter,
      },
      actions,
      replay,
      message: actions.length
        ? 'Recovery actions executed'
        : 'No recovery actions required',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to run OpenClaw recovery',
      error: err.message,
    });
  }
});

router.post('/maintenance/cleanup', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw cleanup request')) return;

  const retainDays = Math.min(Math.max(parseInt(req.body?.retainDays, 10) || 30, 1), 365);
  const deleteProcessedOnly = req.body?.deleteProcessedOnly !== false;
  const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');

    const query = {
      createdAt: { $lt: cutoff },
    };

    if (deleteProcessedOnly) {
      query.processed = true;
    }

    const result = await OpenClawMessage.deleteMany(query);

    return res.json({
      ok: true,
      retainDays,
      deleteProcessedOnly,
      cutoff,
      deletedCount: result.deletedCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to cleanup OpenClaw messages',
      error: err.message,
    });
  }
});

router.post('/inbound', async (req, res) => {
  const config = getConfig();
  if (!isAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized inbound OpenClaw message',
    });
  }

  const { content, message, event, metadata, respondingTo } = req.body || {};
  const inboundContent = String(content || message || '').trim();

  if (!inboundContent) {
    return res.status(400).json({
      ok: false,
      message: 'content (or message) is required',
    });
  }

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const doc = await OpenClawMessage.create({
      direction: 'inbound',
      content: inboundContent,
      event: event || 'pvabazaar.agent.response',
      source: metadata?.source || 'openclaw-inbound',
      processed: true,
      respondingTo: respondingTo || null,
      metadata: metadata || {},
    });

    return res.json({
      ok: true,
      messageId: doc._id.toString(),
      timestamp: doc.createdAt,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to store inbound message',
      error: err.message,
    });
  }
});

router.post('/messages/:id/processed', async (req, res) => {
  const config = getConfig();
  if (!isAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized mark-processed request',
    });
  }

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const updated = await OpenClawMessage.findByIdAndUpdate(
      req.params.id,
      { processed: true },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({
        ok: false,
        message: 'Message not found',
      });
    }

    return res.json({
      ok: true,
      id: updated._id.toString(),
      processed: updated.processed,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to update message state',
      error: err.message,
    });
  }
});

router.get('/agent-config', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw agent-config request')) return;

  try {
    await dbConnect();
    const OpenClawAgentConfig = require('../models/OpenClawAgentConfig');
    const doc = await OpenClawAgentConfig.findOne().sort({ updatedAt: -1 }).lean();
    const directives = doc?.creatorCommands ?? [];
    return res.json({
      ok: true,
      creatorCommands: directives,
      globalDirectives: directives,
      goals: doc?.goals ?? [],
      activeMode: doc?.activeMode || 'default',
      personaProfileId: doc?.personaProfileId || 'default',
      modeProfiles: doc?.modeProfiles ?? [],
      updatedAt: doc?.updatedAt ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      message: 'Agent config store unavailable',
      error: err.message,
    });
  }
});

router.put('/agent-config', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw agent-config update')) return;

  const { creatorCommands, globalDirectives, goals, activeMode, personaProfileId, modeProfiles } = req.body || {};
  try {
    await dbConnect();
    const OpenClawAgentConfig = require('../models/OpenClawAgentConfig');
    const update = {
      updatedAt: new Date(),
    };
    if (Array.isArray(globalDirectives)) {
      update.creatorCommands = globalDirectives;
    } else if (Array.isArray(creatorCommands)) {
      update.creatorCommands = creatorCommands;
    }
    if (Array.isArray(goals)) update.goals = goals;
    if (typeof activeMode === 'string') update.activeMode = String(activeMode).trim().slice(0, 80) || 'default';
    if (typeof personaProfileId === 'string') update.personaProfileId = String(personaProfileId).trim().slice(0, 120) || 'default';
    if (Array.isArray(modeProfiles)) {
      update.modeProfiles = modeProfiles
        .map((profile) => ({
          name: String(profile?.name || '').trim().slice(0, 80),
          directives: Array.isArray(profile?.directives)
            ? profile.directives.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 40)
            : [],
          goals: Array.isArray(profile?.goals)
            ? profile.goals.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 30)
            : [],
          style: String(profile?.style || '').trim().slice(0, 1000),
          updatedAt: new Date(),
        }))
        .filter((profile) => profile.name)
        .slice(0, 12);
    }

    const doc = await OpenClawAgentConfig.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true },
    ).lean();

    return res.json({
      ok: true,
      creatorCommands: doc.creatorCommands ?? [],
      globalDirectives: doc.creatorCommands ?? [],
      goals: doc.goals ?? [],
      activeMode: doc.activeMode || 'default',
      personaProfileId: doc.personaProfileId || 'default',
      modeProfiles: doc.modeProfiles ?? [],
      updatedAt: doc.updatedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to update agent config',
      error: err.message,
    });
  }
});

router.get('/memory', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw memory request')) return;

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const type = req.query.type;

  try {
    await dbConnect();
    const OpenClawMemory = require('../models/OpenClawMemory');
    const query = type ? { type } : {};
    const items = await OpenClawMemory.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({
      ok: true,
      memory: items,
      count: items.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      message: 'Memory store unavailable',
      error: err.message,
    });
  }
});

router.post('/memory', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw memory write')) return;

  const { key, value, type } = req.body || {};
  if (!key || value === undefined) {
    return res.status(400).json({
      ok: false,
      message: 'key and value are required',
    });
  }

  try {
    await dbConnect();
    const OpenClawMemory = require('../models/OpenClawMemory');
    const doc = await OpenClawMemory.create({
      key: String(key).slice(0, 500),
      value: String(value).slice(0, 10000),
      type: ['fact', 'goal', 'reflection', 'preference'].includes(type) ? type : 'fact',
      source: req.body?.source || 'api',
      channel: String(req.body?.channel || '').trim().slice(0, 80),
      profileId: String(req.body?.profileId || 'default').trim().slice(0, 120),
      pinned: Boolean(req.body?.pinned),
      score: Number.isFinite(Number(req.body?.score)) ? Number(req.body.score) : 1,
      tags: Array.isArray(req.body?.tags)
        ? req.body.tags.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20)
        : [],
    });
    return res.json({
      ok: true,
      id: doc._id.toString(),
      key: doc.key,
      type: doc.type,
      createdAt: doc.createdAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to write memory',
      error: err.message,
    });
  }
});

router.delete('/memory/:id', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw memory delete')) return;

  try {
    await dbConnect();
    const OpenClawMemory = require('../models/OpenClawMemory');
    const result = await OpenClawMemory.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ ok: false, message: 'Memory not found' });
    }
    return res.json({
      ok: true,
      id: req.params.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to delete memory',
      error: err.message,
    });
  }
});

function normalizeProfileId(value) {
  const normalized = String(value || 'default').trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '-');
  return normalized.slice(0, 120) || 'default';
}

function normalizeChannel(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '-');
  return normalized.slice(0, 80);
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0, Math.min(numeric, 100));
}

router.post('/persona/ingest', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized persona ingest request')) return;

  const text = String(req.body?.text || req.body?.value || '').trim();
  const kind = String(req.body?.kind || 'journal').trim().toLowerCase();
  const profileId = normalizeProfileId(req.body?.profileId || 'default');
  const channel = normalizeChannel(req.body?.channel || '');
  const source = String(req.body?.source || 'persona-ingest').trim().slice(0, 120);
  const type = ['fact', 'goal', 'reflection', 'preference'].includes(req.body?.type) ? req.body.type : 'reflection';

  if (!text) {
    return res.status(400).json({ ok: false, message: 'text is required' });
  }

  const allowedKinds = new Set(['identity', 'voice', 'imprint', 'journal', 'goal', 'principle', 'memory']);
  const safeKind = allowedKinds.has(kind) ? kind : 'journal';
  const key = `persona:${safeKind}:profile:${profileId}`;
  const now = new Date();

  try {
    await dbConnect();
    const OpenClawMemory = require('../models/OpenClawMemory');

    const pinned = Boolean(req.body?.pinned) || safeKind === 'identity' || safeKind === 'voice';
    const reinforcement = clampScore(req.body?.reinforcement || 1);
    const baseScore = safeKind === 'identity' || safeKind === 'voice' ? 6 : (safeKind === 'imprint' ? 4 : 1);
    const score = Math.max(1, Math.min(100, baseScore + reinforcement));

    const doc = await OpenClawMemory.create({
      key,
      value: text.slice(0, 10000),
      type,
      source,
      channel,
      profileId,
      pinned,
      score,
      tags: Array.isArray(req.body?.tags)
        ? req.body.tags.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 20)
        : [],
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return res.json({
      ok: true,
      id: doc._id.toString(),
      key: doc.key,
      kind: safeKind,
      profileId,
      channel,
      pinned: doc.pinned,
      score: doc.score,
      createdAt: doc.createdAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to ingest persona memory', error: err.message });
  }
});

router.get('/persona/context', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized persona context request')) return;

  const profileId = normalizeProfileId(req.query.profileId || 'default');
  const channel = normalizeChannel(req.query.channel || '');
  const includeJournal = String(req.query.includeJournal || 'true') !== 'false';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 80);

  try {
    await dbConnect();
    const OpenClawMemory = require('../models/OpenClawMemory');
    const query = {
      key: { $regex: '^persona:' },
      profileId,
      ...(channel ? { $or: [{ channel }, { channel: '' }] } : {}),
    };

    const docs = await OpenClawMemory.find(query)
      .sort({ pinned: -1, score: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const filtered = includeJournal ? docs : docs.filter((item) => !String(item.key).includes('persona:journal:'));
    const context = filtered.slice(0, limit).map((item) => {
      const key = String(item.key || '');
      const kind = key.split(':')[1] || 'memory';
      return {
        id: item._id.toString(),
        kind,
        key,
        text: String(item.value || '').slice(0, 1000),
        score: Number(item.score || 0),
        pinned: Boolean(item.pinned),
        channel: item.channel || '',
        source: item.source || '',
        createdAt: item.createdAt,
      };
    });

    const ids = context.map((item) => item.id);
    if (ids.length) {
      await OpenClawMemory.updateMany(
        { _id: { $in: ids } },
        { $set: { lastAccessedAt: new Date() } },
      ).catch(() => {});
    }

    const summary = {
      profileId,
      channel: channel || null,
      total: context.length,
      pinned: context.filter((item) => item.pinned).length,
      averageScore: context.length
        ? Math.round((context.reduce((sum, item) => sum + (item.score || 0), 0) / context.length) * 100) / 100
        : 0,
    };

    return res.json({
      ok: true,
      summary,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to load persona context', error: err.message });
  }
});

router.put('/persona/memory/:id/reinforce', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized persona reinforce request')) return;

  const delta = Math.max(-10, Math.min(20, Number(req.body?.delta ?? 1)));
  const pin = req.body?.pin;

  try {
    await dbConnect();
    const OpenClawMemory = require('../models/OpenClawMemory');
    const current = await OpenClawMemory.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ ok: false, message: 'Persona memory not found' });
    }

    const nextScore = Math.max(0, Math.min((Number(current.score || 1) + delta), 100));
    current.score = nextScore;
    current.lastAccessedAt = new Date();
    current.updatedAt = new Date();
    if (typeof pin === 'boolean') {
      current.pinned = pin;
    }
    await current.save();

    return res.json({
      ok: true,
      id: current._id.toString(),
      score: current.score,
      pinned: current.pinned,
      updatedAt: current.updatedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to reinforce persona memory', error: err.message });
  }
});

router.get('/persona/modes', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized persona modes request')) return;

  try {
    await dbConnect();
    const OpenClawAgentConfig = require('../models/OpenClawAgentConfig');
    const doc = await OpenClawAgentConfig.findOne().sort({ updatedAt: -1 }).lean();

    return res.json({
      ok: true,
      activeMode: doc?.activeMode || 'default',
      personaProfileId: doc?.personaProfileId || 'default',
      modeProfiles: doc?.modeProfiles || [],
      updatedAt: doc?.updatedAt || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to load persona modes', error: err.message });
  }
});

router.put('/persona/mode', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized persona mode update')) return;

  const activeMode = String(req.body?.activeMode || '').trim().slice(0, 80);
  const personaProfileId = normalizeProfileId(req.body?.personaProfileId || 'default');

  if (!activeMode) {
    return res.status(400).json({ ok: false, message: 'activeMode is required' });
  }

  try {
    await dbConnect();
    const OpenClawAgentConfig = require('../models/OpenClawAgentConfig');
    const doc = await OpenClawAgentConfig.findOneAndUpdate(
      {},
      {
        $set: {
          activeMode,
          personaProfileId,
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    ).lean();

    return res.json({
      ok: true,
      activeMode: doc.activeMode,
      personaProfileId: doc.personaProfileId,
      updatedAt: doc.updatedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to set persona mode', error: err.message });
  }
});

router.get('/snapshot/marketplace', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw snapshot request')) return;

  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  try {
    await dbConnect();
    const Artifact = require('../models/Artifact');
    const [count, recent] = await Promise.all([
      Artifact.countDocuments().catch(() => 0),
      Artifact.find().sort({ createdAt: -1 }).limit(limit).select('title slug category createdAt').lean().catch(() => []),
    ]);
    return res.json({
      ok: true,
      marketplace: {
        totalArtifacts: count,
        recent: (recent || []).map((a) => ({
          title: a.title || a.name,
          slug: a.slug,
          category: a.category,
          createdAt: a.createdAt,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      message: 'Marketplace snapshot unavailable',
      error: err.message,
    });
  }
});

// Lightweight health check for inclusion in main health endpoint
function getOpenClawHealth() {
  const config = getConfig();
  const paths = resolveWatchdogPaths();
  const logExists = fs.existsSync(paths.logPath);
  const alertExists = fs.existsSync(paths.alertPath);

  if (!logExists) {
    return {
      configured: true,
      status: config.webhookConfigured ? 'no-logs' : 'queue-only',
      mode: config.webhookConfigured ? 'webhook+queue' : 'queue-only',
      message: config.webhookConfigured
        ? 'Watchdog logs not found'
        : 'Queue-only mode — events stored in MongoDB'
    };
  }

  try {
    const logLines = readLastLines(paths.logPath, 50);
    const alertLines = alertExists ? readLastLines(paths.alertPath, 20) : [];
    const recentErrors = logLines.filter(l => l.includes('[ERROR]')).length;
    const recentWarns = logLines.filter(l => l.includes('[WARN]')).length;
    const status = recentErrors > 5 ? 'unhealthy' : recentErrors > 0 ? 'degraded' : 'healthy';
    return {
      configured: true,
      status,
      errors: recentErrors,
      warnings: recentWarns,
      alerts: alertLines.length,
      message: `OpenClaw ${status} (${recentErrors} errors, ${recentWarns} warnings)`
    };
  } catch (err) {
    return {
      configured: true,
      status: 'error',
      message: `Failed to read watchdog logs: ${err.message}`
    };
  }
}

// Webhook endpoint for receiving forwarded events from OpenClaw worker
router.post('/webhook', async (req, res) => {
  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');

    const { event, message, content, metadata = {}, timestamp } = req.body || {};

    if (!message && !content) {
      return res.status(400).json({
        ok: false,
        message: 'message or content is required',
      });
    }

    const doc = await OpenClawMessage.create({
      direction: 'inbound',
      content: String(content || message || '').trim(),
      event: String(event || 'pvabazaar.openclaw.webhook').trim(),
      source: metadata?.source || 'openclaw-webhook',
      processed: true,
      metadata: {
        ...metadata,
        receivedAt: new Date().toISOString(),
        webhookReceived: true,
      },
    });

    return res.json({
      ok: true,
      messageId: doc._id.toString(),
      received: true,
      timestamp: doc.createdAt,
    });
  } catch (err) {
    console.error('[OpenClaw Webhook] Error:', err.message);
    return res.status(500).json({
      ok: false,
      message: 'Failed to store webhook message',
      error: err.message,
    });
  }
});

module.exports = router;
module.exports.getOpenClawHealth = getOpenClawHealth;
