#!/usr/bin/env node
/* eslint-env node */
/* global fetch, console, process */

const BACKEND_URL = (process.env.OPENCLAW_BACKEND_URL || '').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.OPENCLAW_BRIDGE_SECRET || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);
const TELEGRAM_STATE_KEY = process.env.TELEGRAM_STATE_KEY || 'telegram:lastUpdateId';
const TELEGRAM_POLL_LIMIT = Math.min(Math.max(parseInt(process.env.TELEGRAM_POLL_LIMIT || '15', 10), 1), 100);
const OPENCLAW_CHAT_TIMEOUT_MS = Math.min(Math.max(parseInt(process.env.OPENCLAW_CHAT_TIMEOUT_MS || '14000', 10), 2000), 25000);
const OPENCLAW_CHAT_SOURCE = process.env.OPENCLAW_TELEGRAM_SOURCE || 'telegram-openclaw-bridge';
const TELEGRAM_CONSECUTIVE_FAILURES_KEY = 'ecosystem:telegram-bridge:consecutiveFailures';

if (!BACKEND_URL) {
  console.warn('OPENCLAW_BACKEND_URL is not set - skipping Telegram bridge run.');
  process.exit(0);
}

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is not set - skipping Telegram bridge run.');
  process.exit(0);
}

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

function backendHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (BRIDGE_SECRET) {
    headers['X-OpenClaw-Secret'] = BRIDGE_SECRET;
  }

  return headers;
}

function isAllowedChat(chatId) {
  if (!TELEGRAM_ALLOWED_CHAT_IDS.length) return true;
  return TELEGRAM_ALLOWED_CHAT_IDS.includes(String(chatId));
}

async function telegramRequest(path, method = 'GET', body) {
  const response = await fetch(`${TELEGRAM_API}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_err) {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram API ${path} failed (${response.status}): ${text.slice(0, 500)}`);
  }

  return payload.result;
}

async function sendTelegramMessage(chatId, text) {
  await telegramRequest('sendMessage', 'POST', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

async function getMemory(limit = 200) {
  const response = await fetch(`${BACKEND_URL}/api/openclaw/memory?limit=${limit}`, {
    headers: backendHeaders(),
  });

  if (!response.ok) {
    throw new Error(`OpenClaw memory read failed (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload.memory) ? payload.memory : [];
}

async function writeMemory(key, value, type = 'fact') {
  const response = await fetch(`${BACKEND_URL}/api/openclaw/memory`, {
    method: 'POST',
    headers: backendHeaders(),
    body: JSON.stringify({
      key,
      value: String(value),
      type,
      source: OPENCLAW_CHAT_SOURCE,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenClaw memory write failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

async function readMemoryValue(key) {
  try {
    const items = await getMemory(120);
    const hit = items.find((item) => item.key === key);
    return hit ? String(hit.value || '') : null;
  } catch (_err) {
    return null;
  }
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
    writeMemory(TELEGRAM_CONSECUTIVE_FAILURES_KEY, '0', 'fact'),
    writeBridgeState('online', details),
  ]);
}

async function recordBridgeFailure(errorMessage, details = {}) {
  const previous = parseInt((await readMemoryValue(TELEGRAM_CONSECUTIVE_FAILURES_KEY)) || '0', 10);
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  await Promise.allSettled([
    writeMemory(TELEGRAM_CONSECUTIVE_FAILURES_KEY, String(next), 'fact'),
    writeMemory('ecosystem:telegram-bridge:lastError', String(errorMessage || 'unknown error').slice(0, 1200), 'reflection'),
    writeBridgeState(`error:${String(errorMessage || 'unknown').slice(0, 160)}`, {
      consecutiveFailures: next,
      ...details,
    }),
  ]);
}

async function getLastUpdateId() {
  try {
    const items = await getMemory(200);
    const hit = items.find((item) => item.key === TELEGRAM_STATE_KEY);
    if (!hit) return 0;
    const parsed = parseInt(String(hit.value || ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (_err) {
    return 0;
  }
}

async function setLastUpdateId(value) {
  await writeMemory(TELEGRAM_STATE_KEY, String(value), 'fact');
}

async function writeHeartbeat(details = {}) {
  const timestamp = new Date().toISOString();
  await Promise.allSettled([
    writeMemory('ecosystem:telegram-bridge:lastHeartbeat', timestamp, 'fact'),
    writeMemory('telegram:lastHeartbeat', timestamp, 'fact'),
    writeMemory('telegram:lastStatus', JSON.stringify({ timestamp, ...details }), 'reflection'),
  ]);
}

async function openclawChat(message, sourceMeta = {}) {
  const response = await fetch(`${BACKEND_URL}/api/openclaw/chat`, {
    method: 'POST',
    headers: backendHeaders(),
    body: JSON.stringify({
      message,
      source: OPENCLAW_CHAT_SOURCE,
      waitForReplyMs: OPENCLAW_CHAT_TIMEOUT_MS,
      metadata: sourceMeta,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `OpenClaw chat failed (${response.status})`);
  }

  return payload;
}

function sanitizeIncoming(text) {
  return String(text || '').trim().slice(0, 4000);
}

function systemPromptText() {
  return [
    'OpenClaw bridge online.',
    'Send your instruction and I will route it into the live PVA agent loop.',
    'Use /help to see command options.',
  ].join('\n');
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

async function openclawStatusSummary() {
  const response = await fetch(`${BACKEND_URL}/api/openclaw/status`);
  if (!response.ok) {
    return `Status check failed (${response.status}).`;
  }

  const status = await response.json();
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

async function openclawQueueSummary() {
  const [queueRes, statusRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/openclaw/queue-stats`, { headers: backendHeaders() }),
    fetch(`${BACKEND_URL}/api/openclaw/status`),
  ]);

  if (!queueRes.ok) {
    return `Queue check failed (${queueRes.status}).`;
  }

  const queue = await queueRes.json();
  const status = statusRes.ok ? await statusRes.json().catch(() => ({})) : {};
  const worker = status?.worker || {};

  return [
    `Queue pending: ${queue?.pendingOutbound ?? 'n/a'}`,
    `Queue stale: ${queue?.staleOutbound ?? 'n/a'}`,
    `Queue processed: ${queue?.processedOutbound ?? 'n/a'}`,
    `Inbound count: ${queue?.inboundCount ?? 'n/a'}`,
    `Worker active: ${worker?.active === true ? 'yes' : 'no'}`,
    `Worker heartbeat: ${worker?.heartbeatAt || 'n/a'}`,
  ].join('\n');
}

async function openclawRecoverSummary() {
  const response = await fetch(`${BACKEND_URL}/api/openclaw/recover`, {
    method: 'POST',
    headers: backendHeaders(),
    body: JSON.stringify({ reason: 'telegram-manual-recover', source: OPENCLAW_CHAT_SOURCE }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return `Recover failed (${response.status}): ${String(payload?.message || 'unknown error').slice(0, 300)}`;
  }

  const replayed = payload?.replayed ?? payload?.result?.replayed ?? 'n/a';
  const stale = payload?.staleBefore ?? payload?.result?.staleBefore ?? 'n/a';
  return [
    'Recovery trigger sent.',
    `Replayed: ${replayed}`,
    `Stale before: ${stale}`,
  ].join('\n');
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

async function handleMessage(update) {
  const message = update?.message || update?.edited_message;
  if (!message) return false;

  const chatId = message?.chat?.id;
  const text = sanitizeIncoming(message?.text);

  if (!chatId || !text) return false;

  if (!isAllowedChat(chatId)) {
    await sendTelegramMessage(chatId, 'Unauthorized chat for this bot.');
    return true;
  }

  const lower = text.toLowerCase();
  if (lower === '/start') {
    await sendTelegramMessage(chatId, systemPromptText());
    return true;
  }

  if (lower === '/help') {
    await sendTelegramMessage(chatId, helpText());
    return true;
  }

  if (lower === '/status') {
    const summary = await openclawStatusSummary();
    await sendTelegramMessage(chatId, summary);
    return true;
  }

  if (lower === '/queue') {
    const summary = await openclawQueueSummary();
    await sendTelegramMessage(chatId, summary);
    return true;
  }

  if (lower === '/recover') {
    const summary = await openclawRecoverSummary();
    await sendTelegramMessage(chatId, summary);
    return true;
  }

  if (lower === '/ecosystem') {
    const response = await fetch(`${BACKEND_URL}/api/openclaw/status`);
    if (!response.ok) {
      await sendTelegramMessage(chatId, `Ecosystem check failed (${response.status}).`);
      return true;
    }

    const status = await response.json();
    await sendTelegramMessage(chatId, ecosystemSummary(status));
    return true;
  }

  try {
    const reply = await openclawChat(text, {
      telegramChatId: String(chatId),
      telegramUserId: String(message?.from?.id || ''),
      telegramUpdateId: String(update.update_id),
    });

    const replyText = reply?.reply?.content
      ? String(reply.reply.content).slice(0, 3500)
      : (reply?.message || 'Message queued. Reply will follow shortly.').slice(0, 3500);
    await sendTelegramMessage(chatId, replyText);
  } catch (err) {
    await sendTelegramMessage(chatId, `Bridge error: ${String(err.message || 'unknown error').slice(0, 500)}`);
  }

  return true;
}

async function main() {
  console.log('OpenClaw Telegram bridge starting...');
  await writeBridgeState('starting', { source: OPENCLAW_CHAT_SOURCE });
  await writeHeartbeat({ phase: 'starting' });
  const lastUpdateId = await getLastUpdateId();
  const offset = Math.max(lastUpdateId + 1, 0);

  const updates = await telegramRequest(
    `getUpdates?timeout=20&limit=${TELEGRAM_POLL_LIMIT}&offset=${offset}`,
    'GET',
  );

  if (!Array.isArray(updates) || updates.length === 0) {
    console.log('No Telegram updates.');
    await recordBridgeSuccess({ phase: 'idle', updates: 0, source: OPENCLAW_CHAT_SOURCE });
    return;
  }

  let maxUpdateId = lastUpdateId;
  let processed = 0;

  for (const update of updates) {
    if (typeof update?.update_id === 'number') {
      maxUpdateId = Math.max(maxUpdateId, update.update_id);
    }

    const didHandle = await handleMessage(update);
    if (didHandle) processed += 1;
  }

  if (maxUpdateId > lastUpdateId) {
    await setLastUpdateId(maxUpdateId);
  }

  await writeHeartbeat({ phase: 'finished', processed, updates: updates.length, maxUpdateId });
  await recordBridgeSuccess({
    phase: 'finished',
    processed,
    updates: updates.length,
    maxUpdateId,
    source: OPENCLAW_CHAT_SOURCE,
  });

  console.log(`OpenClaw Telegram bridge finished. updates=${updates.length} handled=${processed}`);
}

main().catch(async (err) => {
  console.error('OpenClaw Telegram bridge failed:', err.message);
  await recordBridgeFailure(err.message || 'fatal telegram bridge failure', {
    fatal: true,
    source: OPENCLAW_CHAT_SOURCE,
  });
  process.exit(1);
});
