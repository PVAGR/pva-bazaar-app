const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const dbConnect = require('../lib/dbConnect');
const OpenClawMessage = require('../models/OpenClawMessage');
const OpenClawMemory = require('../models/OpenClawMemory');

const router = express.Router();

const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_WEBHOOK_SECRET = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
const TELEGRAM_PUBLIC_MODE = process.env.TELEGRAM_PUBLIC_MODE === 'true';
const TELEGRAM_ALLOWED_CHAT_IDS = String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const OPENCLAW_CHAT_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.OPENCLAW_CHAT_TIMEOUT_MS || '12000', 10), 2000),
  25000,
);
const OPENCLAW_TELEGRAM_SOURCE = String(process.env.OPENCLAW_TELEGRAM_SOURCE || 'telegram-openclaw-webhook').trim();
const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || process.env.OPENCLAW_OLLAMA_BASE_URL || '').trim().replace(/\/$/, '');
const OLLAMA_MODEL = String(process.env.OLLAMA_MODEL || process.env.OPENCLAW_OLLAMA_MODEL || 'llama3.1').trim();
const OLLAMA_TEMPERATURE = Math.min(Math.max(parseFloat(process.env.OLLAMA_TEMPERATURE || '0.35'), 0), 2);

function backendHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const bridgeSecret = String(process.env.OPENCLAW_BRIDGE_SECRET || '').trim();
  if (bridgeSecret) {
    headers['X-OpenClaw-Secret'] = bridgeSecret;
  }
  return headers;
}

function getApiBaseUrl(req) {
  const configured = String(process.env.OPENCLAW_BACKEND_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

function isAllowedChat(chatId) {
  if (TELEGRAM_PUBLIC_MODE) return true;
  if (!TELEGRAM_ALLOWED_CHAT_IDS.length) return true;
  return TELEGRAM_ALLOWED_CHAT_IDS.includes(String(chatId));
}

function timingSafeEqualString(a, b) {
  const aBuffer = Buffer.from(String(a || ''), 'utf8');
  const bBuffer = Buffer.from(String(b || ''), 'utf8');
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function validateWebhookSecret(req) {
  if (!TELEGRAM_WEBHOOK_SECRET) return true;
  const provided = String(req.get('x-telegram-bot-api-secret-token') || '');
  return timingSafeEqualString(provided, TELEGRAM_WEBHOOK_SECRET);
}

function sanitizeIncomingText(text) {
  return String(text || '').trim().slice(0, 4000);
}

async function writeMemory(key, value, type = 'fact') {
  await dbConnect();
  await OpenClawMemory.create({
    key,
    value: String(value),
    type,
    source: OPENCLAW_TELEGRAM_SOURCE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function readLatestMemoryValue(key) {
  await dbConnect();
  const hit = await OpenClawMemory.findOne({ key }).sort({ createdAt: -1 }).lean();
  return hit ? String(hit.value || '') : null;
}

async function writeBridgeState(state, details = {}) {
  const timestamp = new Date().toISOString();
  await Promise.allSettled([
    writeMemory('ecosystem:telegram-bridge:connectionState', state, 'fact'),
    writeMemory('ecosystem:telegram-bridge:lastStatus', JSON.stringify({ state, timestamp, ...details }), 'reflection'),
  ]);
}

async function recordBridgeSuccess(details = {}) {
  await Promise.allSettled([
    writeMemory('ecosystem:telegram-bridge:consecutiveFailures', '0', 'fact'),
    writeBridgeState('online', details),
  ]);
}

async function recordBridgeFailure(message, details = {}) {
  const previous = parseInt((await readLatestMemoryValue('ecosystem:telegram-bridge:consecutiveFailures')) || '0', 10);
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  await Promise.allSettled([
    writeMemory('ecosystem:telegram-bridge:consecutiveFailures', String(next), 'fact'),
    writeMemory('ecosystem:telegram-bridge:lastError', String(message || 'unknown error').slice(0, 1200), 'reflection'),
    writeBridgeState(`error:${String(message || 'unknown').slice(0, 160)}`, {
      consecutiveFailures: next,
      ...details,
    }),
  ]);
}

async function writeHeartbeat(details = {}) {
  const timestamp = new Date().toISOString();
  await Promise.allSettled([
    writeMemory('ecosystem:telegram-bridge:lastHeartbeat', timestamp, 'fact'),
    writeMemory('telegram:lastHeartbeat', timestamp, 'fact'),
    writeMemory('telegram:lastStatus', JSON.stringify({ timestamp, ...details }), 'reflection'),
  ]);
}

async function writeLastChatId(chatId) {
  if (!chatId) return;
  await Promise.allSettled([
    writeMemory('telegram:lastChatId', String(chatId), 'fact'),
    writeMemory('ecosystem:telegram-bridge:lastChatId', String(chatId), 'fact'),
  ]);
}

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
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

function helpText() {
  return [
    'Commands:',
    '/start - confirm bridge status',
    '/help - show this message',
    '/status - show OpenClaw bridge status',
    '/queue - show queue and worker health',
    '/recover - trigger OpenClaw recovery/replay',
    '/ecosystem - show website, OpenClaw, Ollama, and Telegram status',
    '',
    'Any other text is sent to OpenClaw chat and the AI reply is returned here.',
  ].join('\n');
}

function startText() {
  return [
    'OpenClaw Telegram webhook online.',
    'Send your instruction and I will route it into the live PVA agent loop.',
    'Use /help to see commands.',
  ].join('\n');
}

async function fetchOpenClawStatus(apiBaseUrl) {
  const response = await axios.get(`${apiBaseUrl}/api/openclaw/status`, {
    timeout: 12000,
    headers: backendHeaders(),
  });
  return response.data || {};
}

function ecosystemSummary(status) {
  const services = status?.ecosystem?.services || {};
  const website = services.website || {};
  const openclaw = services.openclaw || {};
  const ollama = services.ollama || {};
  const telegram = services.telegram || {};

  return [
    `Ecosystem: ${status?.ecosystem?.status || 'unknown'}`,
    `Website: ${website.status || 'unknown'}${website.url ? ` (${website.url})` : ''}`,
    `OpenClaw: ${openclaw.status || 'unknown'}${typeof openclaw.queuePending === 'number' ? ` · pending=${openclaw.queuePending}` : ''}`,
    `Ollama: ${ollama.status || 'unknown'}${ollama.model ? ` · model=${ollama.model}` : ''}`,
    `Telegram: ${telegram.status || 'unknown'}${telegram.lastHeartbeatAt ? ` · heartbeat=${telegram.lastHeartbeatAt}` : ''}`,
  ].join('\n');
}

async function openclawStatusSummary(apiBaseUrl) {
  const status = await fetchOpenClawStatus(apiBaseUrl);
  const mode = status?.mode || 'unknown';
  const reachable = status?.reachable ? 'yes' : 'no';
  const pending = status?.queue?.pending ?? 'n/a';
  const processed = status?.queue?.processed ?? 'n/a';

  return [
    `OpenClaw mode: ${mode}`,
    `Gateway reachable: ${reachable}`,
    `Queue pending: ${pending}`,
    `Queue processed: ${processed}`,
  ].join('\n');
}

async function openclawQueueSummary(apiBaseUrl) {
  const [queueRes, statusRes] = await Promise.all([
    axios.get(`${apiBaseUrl}/api/openclaw/queue-stats`, { timeout: 12000, headers: backendHeaders() }),
    axios.get(`${apiBaseUrl}/api/openclaw/status`, { timeout: 12000, headers: backendHeaders() }),
  ]);

  const queue = queueRes.data || {};
  const worker = statusRes.data?.worker || {};

  return [
    `Queue pending: ${queue?.pendingOutbound ?? 'n/a'}`,
    `Queue stale: ${queue?.staleOutbound ?? 'n/a'}`,
    `Queue processed: ${queue?.processedOutbound ?? 'n/a'}`,
    `Inbound count: ${queue?.inboundCount ?? 'n/a'}`,
    `Worker active: ${worker?.active === true ? 'yes' : 'no'}`,
    `Worker heartbeat: ${worker?.heartbeatAt || 'n/a'}`,
  ].join('\n');
}

async function openclawRecoverSummary(apiBaseUrl) {
  const response = await axios.post(
    `${apiBaseUrl}/api/openclaw/recover`,
    { reason: 'telegram-manual-recover', source: OPENCLAW_TELEGRAM_SOURCE },
    {
      timeout: 15000,
      headers: backendHeaders(),
    },
  );

  const payload = response.data || {};
  const replayed = payload?.replayed ?? payload?.result?.replayed ?? 'n/a';
  const stale = payload?.staleBefore ?? payload?.result?.staleBefore ?? 'n/a';

  return [
    'Recovery trigger sent.',
    `Replayed: ${replayed}`,
    `Stale before: ${stale}`,
  ].join('\n');
}

async function openclawChat(apiBaseUrl, message, sourceMeta = {}) {
  const response = await axios.post(
    `${apiBaseUrl}/api/openclaw/chat`,
    {
      message,
      source: OPENCLAW_TELEGRAM_SOURCE,
      waitForReplyMs: OPENCLAW_CHAT_TIMEOUT_MS,
      metadata: sourceMeta,
    },
    {
      timeout: OPENCLAW_CHAT_TIMEOUT_MS + 5000,
      headers: backendHeaders(),
    },
  );

  return response.data || {};
}

function needsDirectFallback(payload) {
  if (payload?.reply?.content) return false;
  const msg = String(payload?.message || '').toLowerCase();
  return msg.includes('queued') || msg.includes('waiting') || !msg;
}

async function generateOllamaFallbackReply(userText, apiBaseUrl) {
  if (!OLLAMA_BASE_URL) return null;

  const status = await fetchOpenClawStatus(apiBaseUrl).catch(() => null);
  const prompt = [
    'You are PVA Magnum Opus, the Telegram assistant for PVA Bazaar.',
    'Respond clearly and actionably.',
    `User message: ${String(userText || '').slice(0, 3000)}`,
    `Live status: ${status ? JSON.stringify(status).slice(0, 5000) : 'unavailable'}`,
  ].join('\n\n');

  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: OLLAMA_TEMPERATURE },
      messages: [
        {
          role: 'system',
          content: 'You are PVA Magnum Opus. Keep answers concise and operational.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
    {
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const text = response.data?.message?.content || response.data?.response || null;
  return text ? String(text).trim().slice(0, 3500) : null;
}

async function hasProcessedUpdate(updateId) {
  await dbConnect();
  const existing = await OpenClawMessage.findOne({ 'metadata.telegramUpdateId': String(updateId) })
    .select({ _id: 1 })
    .lean();
  return Boolean(existing);
}

router.get('/telegram/health', async (_req, res) => {
  return res.json({
    ok: true,
    configured: Boolean(TELEGRAM_BOT_TOKEN),
    webhookSecretConfigured: Boolean(TELEGRAM_WEBHOOK_SECRET),
    publicMode: TELEGRAM_PUBLIC_MODE,
    source: OPENCLAW_TELEGRAM_SOURCE,
    timestamp: new Date().toISOString(),
  });
});

router.post('/telegram/updates', async (req, res) => {
  if (!validateWebhookSecret(req)) {
    return res.status(401).json({ ok: false, message: 'Invalid Telegram webhook secret token' });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return res.status(503).json({ ok: false, message: 'TELEGRAM_BOT_TOKEN is not configured' });
  }

  const update = req.body || {};
  const message = update.message || update.edited_message;
  const updateId = update?.update_id;

  await writeHeartbeat({ phase: 'received', updateId: updateId ?? null }).catch(() => {});
  if (Number.isFinite(updateId)) {
    await writeMemory('telegram:lastUpdateId', String(updateId), 'fact').catch(() => {});
  }

  if (!message || !Number.isFinite(updateId)) {
    await recordBridgeSuccess({ phase: 'ignored', reason: 'non-message update' }).catch(() => {});
    return res.json({ ok: true, ignored: true });
  }

  const chatId = message?.chat?.id;
  const userText = sanitizeIncomingText(message?.text);

  if (!chatId || !userText) {
    await recordBridgeSuccess({ phase: 'ignored', reason: 'empty text message' }).catch(() => {});
    return res.json({ ok: true, ignored: true });
  }

  if (!isAllowedChat(chatId)) {
    await sendTelegramMessage(chatId, 'Unauthorized chat for this bot.').catch(() => {});
    await recordBridgeSuccess({ phase: 'blocked', chatId: String(chatId) }).catch(() => {});
    return res.json({ ok: true, blocked: true });
  }

  if (await hasProcessedUpdate(updateId)) {
    await recordBridgeSuccess({ phase: 'duplicate', updateId }).catch(() => {});
    return res.json({ ok: true, duplicate: true });
  }

  const apiBaseUrl = getApiBaseUrl(req);
  const lower = userText.toLowerCase();

  try {
    await writeLastChatId(chatId).catch(() => {});

    if (lower === '/start') {
      await sendTelegramMessage(chatId, startText());
      await recordBridgeSuccess({ phase: 'command:start', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/help') {
      await sendTelegramMessage(chatId, helpText());
      await recordBridgeSuccess({ phase: 'command:help', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/status') {
      const summary = await openclawStatusSummary(apiBaseUrl);
      await sendTelegramMessage(chatId, summary);
      await recordBridgeSuccess({ phase: 'command:status', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/queue') {
      const summary = await openclawQueueSummary(apiBaseUrl);
      await sendTelegramMessage(chatId, summary);
      await recordBridgeSuccess({ phase: 'command:queue', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/recover') {
      const summary = await openclawRecoverSummary(apiBaseUrl);
      await sendTelegramMessage(chatId, summary);
      await recordBridgeSuccess({ phase: 'command:recover', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/ecosystem') {
      const status = await fetchOpenClawStatus(apiBaseUrl);
      await sendTelegramMessage(chatId, ecosystemSummary(status));
      await recordBridgeSuccess({ phase: 'command:ecosystem', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    const reply = await openclawChat(apiBaseUrl, userText, {
      telegramChatId: String(chatId),
      telegramUserId: String(message?.from?.id || ''),
      telegramUpdateId: String(updateId),
    });

    let replyText = reply?.reply?.content
      ? String(reply.reply.content).slice(0, 3500)
      : String(reply?.message || 'Message queued. Reply will follow shortly.').slice(0, 3500);

    if (needsDirectFallback(reply)) {
      const direct = await generateOllamaFallbackReply(userText, apiBaseUrl).catch(() => null);
      if (direct) replyText = direct;
    }

    await sendTelegramMessage(chatId, replyText);
    await recordBridgeSuccess({ phase: 'chat', updateId }).catch(() => {});
    return res.json({ ok: true, handled: true });
  } catch (err) {
    await recordBridgeFailure(err?.message || 'telegram webhook failure', { updateId }).catch(() => {});
    const fallback = await generateOllamaFallbackReply(userText, apiBaseUrl).catch(() => null);
    if (fallback) {
      await sendTelegramMessage(chatId, fallback).catch(() => {});
      return res.json({ ok: true, handled: true, fallback: true });
    }

    await sendTelegramMessage(chatId, `Bridge error: ${String(err?.message || 'unknown error').slice(0, 400)}`).catch(() => {});
    return res.status(200).json({ ok: true, handled: true, error: true });
  }
});

module.exports = router;
