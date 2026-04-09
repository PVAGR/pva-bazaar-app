const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const dbConnect = require('../lib/dbConnect');
const OpenClawMessage = require('../models/OpenClawMessage');
const OpenClawMemory = require('../models/OpenClawMemory');
const OpenClawAgentConfig = require('../models/OpenClawAgentConfig');
const { sendCustomEmail } = require('../service/emailService');

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
const OLLAMA_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.OLLAMA_TIMEOUT_MS || process.env.OPENCLAW_OLLAMA_TIMEOUT_MS || '20000', 10), 3000),
  45000,
);
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
const OPENAI_TEMPERATURE = Math.min(
  Math.max(parseFloat(process.env.OPENAI_TEMPERATURE || process.env.OLLAMA_TEMPERATURE || '0.35'), 0),
  2,
);
const OPENAI_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.OPENAI_TIMEOUT_MS || process.env.OPENCLAW_OPENAI_TIMEOUT_MS || String(OLLAMA_TIMEOUT_MS), 10), 5000),
  60000,
);
const POLLINATIONS_API_URL = String(process.env.POLLINATIONS_API_URL || 'https://text.pollinations.ai').trim().replace(/\/$/, '');
const POLLINATIONS_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.POLLINATIONS_TIMEOUT_MS || '20000', 10), 5000),
  60000,
);
const PERSONA_AUTO_LEARN = process.env.OPENCLAW_PERSONA_AUTO_LEARN !== 'false';
const PERSONA_CONTEXT_LIMIT = Math.min(
  Math.max(parseInt(process.env.OPENCLAW_PERSONA_CONTEXT_LIMIT || '10', 10), 4),
  24,
);
const DEFAULT_PERSONA_PROFILE_ID = String(process.env.OPENCLAW_PERSONA_PROFILE_ID || 'default').trim().toLowerCase() || 'default';
const DEFAULT_EMAIL_TO = String(process.env.OPENCLAW_TELEGRAM_DEFAULT_EMAIL_TO || process.env.ADMIN_EMAIL || process.env.SMTP_USER || '').trim();

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

function validateOpsAccess(req) {
  const bridgeSecret = String(process.env.OPENCLAW_BRIDGE_SECRET || '').trim();
  const providedBridgeSecret = String(req.get('x-openclaw-secret') || '');
  if (bridgeSecret && timingSafeEqualString(providedBridgeSecret, bridgeSecret)) {
    return true;
  }

  if (TELEGRAM_WEBHOOK_SECRET) {
    return validateWebhookSecret(req);
  }

  return false;
}

function sanitizeIncomingText(text) {
  return String(text || '').trim().slice(0, 4000);
}

function normalizeLabel(value, fallback = 'default', maxLen = 80) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '-');
  return normalized.slice(0, maxLen) || fallback;
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

async function telegramApiGet(method, params = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`,
      {
        params,
        timeout: 15000,
      },
    );
    return response.data || { ok: false, error: 'Empty Telegram response' };
  } catch (err) {
    return {
      ok: false,
      error: err?.response?.data || err.message || 'Telegram API error',
    };
  }
}

async function fetchTelegramDiagnostics() {
  const [me, webhookInfo] = await Promise.all([
    telegramApiGet('getMe'),
    telegramApiGet('getWebhookInfo'),
  ]);

  const meResult = me?.result || null;
  const webhookResult = webhookInfo?.result || null;

  return {
    configured: Boolean(TELEGRAM_BOT_TOKEN),
    publicMode: TELEGRAM_PUBLIC_MODE,
    allowedChatIdsCount: TELEGRAM_ALLOWED_CHAT_IDS.length,
    source: OPENCLAW_TELEGRAM_SOURCE,
    apiReachable: Boolean(me?.ok || webhookInfo?.ok),
    bot: meResult
      ? {
        id: meResult.id,
        username: meResult.username,
        firstName: meResult.first_name,
      }
      : null,
    webhook: webhookResult
      ? {
        url: webhookResult.url || null,
        hasCustomCertificate: Boolean(webhookResult.has_custom_certificate),
        pendingUpdateCount: webhookResult.pending_update_count ?? null,
        lastErrorDate: webhookResult.last_error_date || null,
        lastErrorMessage: webhookResult.last_error_message || null,
        maxConnections: webhookResult.max_connections ?? null,
      }
      : null,
  };
}

function helpText() {
  return [
    'Commands:',
    '/start - confirm bridge status',
    '/help - show this message',
    '/chatid - show this chat ID (for notify-ready routing)',
    '/diag - show Telegram bot + webhook diagnostics',
    '/identity <text> - set your core identity signal for this chat',
    '/voice <text> - set speaking style and tone for this chat',
    '/imprint <text> - store a high-priority memory for the AI self',
    '/remember <text> - alias for /imprint',
    '/profile <name> - switch active identity profile for this chat',
    '/mode <name> - switch active behavior mode for this chat',
    '/self - view current identity + recent imprints',
    '/plan <title> | <step 1>; <step 2>; ... - store a structured workflow',
    '/continue - advance one workflow step',
    '/workflow - show the active workflow',
    '/email <to | subject | body> - send an email through the assistant',
    '/task <text> - store a task in assistant memory',
    '/tasks - list recent tasks from assistant memory',
    '/status - show OpenClaw bridge status',
    '/queue - show queue and worker health',
    '/recover - trigger OpenClaw recovery/replay',
    '/ecosystem - show website, OpenClaw, Ollama, and Telegram status',
    '',
    'Any other text is sent to OpenClaw chat and also journaled for persona learning.',
  ].join('\n');
}

function startText() {
  return [
    'OpenClaw Telegram webhook online.',
    'Send your instruction and I will route it into the live PVA agent loop.',
    'Use /help to see commands.',
    'Use /identity and /voice to shape your living AI profile.',
  ].join('\n');
}

function personaKey(kind, chatId) {
  return `persona:${kind}:chat:${String(chatId)}`;
}

function chatProfileKey(chatId) {
  return `persona:profile:chat:${String(chatId)}`;
}

function chatModeKey(chatId) {
  return `persona:mode:chat:${String(chatId)}`;
}

function assistantTaskKey(chatId) {
  return `assistant:task:chat:${String(chatId)}`;
}

function assistantWorkflowKey(chatId) {
  return `assistant:workflow:chat:${String(chatId)}`;
}

function parseEmailCommand(text) {
  const payload = String(text || '').replace(/^\/email\s*/i, '').trim();
  if (!payload) return null;

  const parts = payload.split('|').map((item) => item.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      to: parts[0],
      subject: parts[1],
      body: parts.slice(2).join(' | '),
    };
  }

  if (parts.length === 2) {
    return {
      to: DEFAULT_EMAIL_TO,
      subject: parts[0],
      body: parts[1],
    };
  }

  return null;
}

async function storeTask(chatId, value, type = 'task') {
  const safeValue = String(value || '').trim().slice(0, 3500);
  if (!safeValue) return null;

  await writeMemory(assistantTaskKey(chatId), safeValue, type);
  return safeValue;
}

async function fetchRecentTasks(chatId, limit = 8) {
  await dbConnect();
  const docs = await OpenClawMemory.find({
    key: assistantTaskKey(chatId),
    source: OPENCLAW_TELEGRAM_SOURCE,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return docs.map((doc, index) => {
    const timestamp = doc?.createdAt ? new Date(doc.createdAt).toISOString() : 'unknown time';
    return `${index + 1}. ${String(doc?.value || '').slice(0, 220)} (${timestamp})`;
  });
}

function splitPlanSteps(rawSteps) {
  return String(rawSteps || '')
    .split(/\n|;/)
    .map((step) => step.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

async function readLatestWorkflowState(chatId) {
  await dbConnect();
  const doc = await OpenClawMemory.findOne({
    key: assistantWorkflowKey(chatId),
    source: OPENCLAW_TELEGRAM_SOURCE,
  }).sort({ createdAt: -1 }).lean();

  if (!doc?.value) return null;

  try {
    const state = JSON.parse(String(doc.value));
    return state && typeof state === 'object' ? state : null;
  } catch (_err) {
    return null;
  }
}

async function writeWorkflowState(chatId, state) {
  const payload = JSON.stringify({
    ...state,
    chatId: String(chatId),
    updatedAt: new Date().toISOString(),
  });

  await writeMemory(assistantWorkflowKey(chatId), payload, 'goal');
  return state;
}

async function createWorkflowState(chatId, title, rawSteps) {
  const steps = splitPlanSteps(rawSteps);
  if (!steps.length) return null;

  return writeWorkflowState(chatId, {
    title: String(title || 'Untitled plan').trim().slice(0, 120) || 'Untitled plan',
    steps,
    currentStepIndex: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    history: [],
  });
}

async function advanceWorkflowState(chatId) {
  const state = await readLatestWorkflowState(chatId);
  if (!state || !Array.isArray(state.steps) || !state.steps.length) {
    return { state: null, message: 'No active workflow found.' };
  }

  const currentStepIndex = Math.max(parseInt(String(state.currentStepIndex || 0), 10), 0);
  if (currentStepIndex >= state.steps.length) {
    return {
      state,
      message: `Workflow already complete: ${state.title || 'Untitled plan'}`,
    };
  }

  const history = Array.isArray(state.history) ? state.history.slice(0, 20) : [];
  const completedStep = state.steps[currentStepIndex] || null;
  if (completedStep) {
    history.unshift({
      step: completedStep,
      completedAt: new Date().toISOString(),
    });
  }

  const nextIndex = currentStepIndex + 1;
  const nextState = {
    ...state,
    currentStepIndex: nextIndex,
    history,
    status: nextIndex >= state.steps.length ? 'complete' : 'active',
  };
  await writeWorkflowState(chatId, nextState);

  if (nextIndex >= state.steps.length) {
    return {
      state: nextState,
      message: `Workflow complete: ${state.title || 'Untitled plan'}`,
    };
  }

  return {
    state: nextState,
    message: `Next step: ${state.steps[nextIndex]}`,
  };
}

function formatWorkflowState(state) {
  if (!state || !Array.isArray(state.steps) || !state.steps.length) {
    return 'No active workflow.';
  }

  const currentStepIndex = Math.max(parseInt(String(state.currentStepIndex || 0), 10), 0);
  const currentStep = currentStepIndex < state.steps.length ? state.steps[currentStepIndex] : null;
  const remaining = Math.max(state.steps.length - currentStepIndex, 0);

  return [
    `Workflow: ${state.title || 'Untitled plan'}`,
    `Status: ${state.status || 'active'}`,
    `Current step: ${currentStep ? `${currentStepIndex + 1}/${state.steps.length} - ${currentStep}` : 'complete'}`,
    `Remaining steps: ${remaining}`,
  ].join('\n');
}

async function readLatestAgentPersonaRuntime() {
  await dbConnect();
  const doc = await OpenClawAgentConfig.findOne().sort({ updatedAt: -1 }).lean();
  return {
    activeMode: normalizeLabel(doc?.activeMode || 'default', 'default', 80),
    profileId: normalizeLabel(doc?.personaProfileId || DEFAULT_PERSONA_PROFILE_ID, 'default', 120),
  };
}

async function resolvePersonaRuntime(chatId) {
  const defaults = await readLatestAgentPersonaRuntime().catch(() => ({
    activeMode: 'default',
    profileId: DEFAULT_PERSONA_PROFILE_ID,
  }));

  const [chatProfile, chatMode] = await Promise.all([
    readLatestMemoryValue(chatProfileKey(chatId)).catch(() => null),
    readLatestMemoryValue(chatModeKey(chatId)).catch(() => null),
  ]);

  return {
    profileId: normalizeLabel(chatProfile || defaults.profileId || DEFAULT_PERSONA_PROFILE_ID, 'default', 120),
    activeMode: normalizeLabel(chatMode || defaults.activeMode || 'default', 'default', 80),
  };
}

function commandPayload(rawText, commandName) {
  const normalized = String(rawText || '').trim();
  const lower = normalized.toLowerCase();
  const prefix = `/${commandName.toLowerCase()}`;
  if (!lower.startsWith(prefix)) return null;
  return normalized.slice(prefix.length).trim();
}

async function storePersonaEntry(kind, chatId, value, type = 'reflection') {
  const safeValue = String(value || '').trim().slice(0, 3500);
  if (!safeValue) return null;

  await writeMemory(personaKey(kind, chatId), safeValue, type);
  return safeValue;
}

async function fetchPersonaContext(chatId, limit = PERSONA_CONTEXT_LIMIT) {
  await dbConnect();
  const keyPrefix = `persona:`;
  const chatSuffix = `:chat:${String(chatId)}`;

  const docs = await OpenClawMemory.find({
    key: { $regex: `^${keyPrefix}` },
    source: OPENCLAW_TELEGRAM_SOURCE,
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const filtered = docs.filter((doc) => String(doc?.key || '').endsWith(chatSuffix));
  if (!filtered.length) {
    return {
      lines: [],
      summary: 'No persona context stored yet.',
      identity: null,
      voice: null,
      imprintCount: 0,
      journalCount: 0,
    };
  }

  const latestIdentity = filtered.find((item) => String(item.key).startsWith('persona:identity:')) || null;
  const latestVoice = filtered.find((item) => String(item.key).startsWith('persona:voice:')) || null;
  const imprints = filtered.filter((item) => String(item.key).startsWith('persona:imprint:'));
  const journals = filtered.filter((item) => String(item.key).startsWith('persona:journal:'));

  const selected = [];
  if (latestIdentity?.value) selected.push(`Identity: ${String(latestIdentity.value).slice(0, 700)}`);
  if (latestVoice?.value) selected.push(`Voice: ${String(latestVoice.value).slice(0, 700)}`);

  const recentDynamic = filtered
    .filter((item) => String(item.key).startsWith('persona:imprint:') || String(item.key).startsWith('persona:journal:'))
    .slice(0, Math.max(limit - selected.length, 0))
    .map((item) => {
      const kind = String(item.key).startsWith('persona:imprint:') ? 'Imprint' : 'Journal';
      return `${kind}: ${String(item.value || '').slice(0, 500)}`;
    });

  const lines = [...selected, ...recentDynamic].slice(0, limit);
  const summary = [
    latestIdentity?.value ? `Identity set` : 'Identity not set',
    latestVoice?.value ? `voice set` : 'voice not set',
    `imprints=${imprints.length}`,
    `journals=${journals.length}`,
  ].join(' · ');

  return {
    lines,
    summary,
    identity: latestIdentity?.value || null,
    voice: latestVoice?.value || null,
    imprintCount: imprints.length,
    journalCount: journals.length,
  };
}

function personaBlock(context) {
  if (!context?.lines?.length) return 'Persona context: none';
  return ['Persona context:', ...context.lines].join('\n');
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

function needsDirectFallback(payload, userText = '') {
  const replyText = String(payload?.reply?.content || '').trim();
  const normalizedUser = String(userText || '').trim();

  // Self-gateway mode can echo the original prompt as a synthetic inbound reply.
  // Treat that as non-final and force direct model fallback.
  if (replyText && normalizedUser && replyText.toLowerCase() === normalizedUser.toLowerCase()) {
    return true;
  }

  if (replyText.toLowerCase().startsWith('echo:')) {
    return true;
  }

  if (replyText) return false;
  const msg = String(payload?.message || '').toLowerCase();
  if (normalizedUser && msg.includes(normalizedUser.toLowerCase())) {
    return true;
  }
  if (msg.startsWith('echo:')) {
    return true;
  }
  return msg.includes('queued') || msg.includes('waiting') || !msg;
}

async function requestOpenAIChat(userPrompt) {
  if (!OPENAI_API_KEY) return null;

  return axios.post(
    OPENAI_API_URL,
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are PVA Magnum Opus. Keep answers concise, operational, and actionable.',
        },
        {
          role: 'user',
          content: userPrompt,
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
}

function buildPollinationsPrompt(userText, personaContext = null, personaRuntime = null) {
  return [
    'You are PVA Magnum Opus, the Telegram assistant for PVA Bazaar.',
    `Active profile: ${personaRuntime?.profileId || 'default'}`,
    `Active mode: ${personaRuntime?.activeMode || 'default'}`,
    'Respond clearly and practically.',
    personaBlock(personaContext),
    `User message: ${String(userText || '').slice(0, 2000)}`,
  ].join('\n\n');
}

async function requestPollinationsReply(userText, personaContext = null, personaRuntime = null) {
  if (!POLLINATIONS_API_URL) return null;

  const prompt = buildPollinationsPrompt(userText, personaContext, personaRuntime);
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

async function requestOllamaChat(userPrompt) {
  return axios.post(
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
          content: userPrompt,
        },
      ],
    },
    {
      timeout: OLLAMA_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

async function requestOllamaGenerate(userPrompt) {
  return axios.post(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: OLLAMA_TEMPERATURE },
      prompt: userPrompt,
      system: 'You are PVA Magnum Opus. Keep answers concise and operational.',
    },
    {
      timeout: OLLAMA_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

async function generateOllamaFallbackReply(userText, apiBaseUrl, personaContext = null, personaRuntime = null) {
  const openclawStatus = await fetchOpenClawStatus(apiBaseUrl).catch(() => null);
  const prompt = [
    'You are PVA Magnum Opus, the Telegram assistant for PVA Bazaar.',
    'You are a continuity agent that should feel like the same evolving identity over time.',
    'Use persona context as the highest-priority style and identity guidance.',
    `Active profile: ${personaRuntime?.profileId || 'default'}`,
    `Active mode: ${personaRuntime?.activeMode || 'default'}`,
    'Respond clearly and actionably.',
    personaBlock(personaContext),
    `User message: ${String(userText || '').slice(0, 3000)}`,
    `Live status: ${openclawStatus ? JSON.stringify(openclawStatus).slice(0, 5000) : 'unavailable'}`,
  ].join('\n\n');

  if (OPENAI_API_KEY) {
    try {
      const response = await requestOpenAIChat(prompt);
      const text = response?.data?.choices?.[0]?.message?.content || null;
      if (text) {
        return String(text).trim().slice(0, 3500);
      }
    } catch (_err) {
      // fall back to Ollama if available
    }
  }

  if (!OLLAMA_BASE_URL) return null;

  const ollamaStatus = await fetchOpenClawStatus(apiBaseUrl).catch(() => null);
  const ollamaPrompt = [
    'You are PVA Magnum Opus, the Telegram assistant for PVA Bazaar.',
    'You are a continuity agent that should feel like the same evolving identity over time.',
    'Use persona context as the highest-priority style and identity guidance.',
    `Active profile: ${personaRuntime?.profileId || 'default'}`,
    `Active mode: ${personaRuntime?.activeMode || 'default'}`,
    'Respond clearly and actionably.',
    personaBlock(personaContext),
    `User message: ${String(userText || '').slice(0, 3000)}`,
    `Live status: ${ollamaStatus ? JSON.stringify(ollamaStatus).slice(0, 5000) : 'unavailable'}`,
  ].join('\n\n');

  try {
    const response = await requestOllamaChat(ollamaPrompt);
    const text = response.data?.message?.content || response.data?.response || null;
    return text ? String(text).trim().slice(0, 3500) : null;
  } catch (err) {
    const status = err?.response?.status || 0;
    if (status && status < 500) {
      return null;
    }
  }

  try {
    const response = await requestOllamaGenerate(ollamaPrompt);
    const text = response.data?.response || response.data?.message?.content || null;
    return text ? String(text).trim().slice(0, 3500) : null;
  } catch (_err) {
    const onlineFallback = await requestPollinationsReply(userText, personaContext, personaRuntime).catch(() => null);
    return onlineFallback ? String(onlineFallback).slice(0, 3500) : null;
  }
}

async function hasProcessedUpdate(updateId) {
  await dbConnect();
  const existing = await OpenClawMessage.findOne({ 'metadata.telegramUpdateId': String(updateId) })
    .select({ _id: 1 })
    .lean();
  return Boolean(existing);
}

async function safeHasProcessedUpdate(updateId) {
  try {
    return await hasProcessedUpdate(updateId);
  } catch (_err) {
    // Duplicate protection should not block Telegram processing if persistence has a transient issue.
    return false;
  }
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

router.get('/telegram/diagnostics', async (req, res) => {
  if (!validateOpsAccess(req)) {
    return res.status(401).json({ ok: false, message: 'Unauthorized Telegram diagnostics request' });
  }

  const diagnostics = await fetchTelegramDiagnostics();
  return res.json({
    ok: true,
    diagnostics,
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

  if (await safeHasProcessedUpdate(updateId)) {
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

    if (lower === '/diag') {
      const diagnostics = await fetchTelegramDiagnostics();
      const lines = [
        `Bot configured: ${diagnostics.configured ? 'yes' : 'no'}`,
        `Telegram API reachable: ${diagnostics.apiReachable ? 'yes' : 'no'}`,
        `Bot username: ${diagnostics.bot?.username || 'n/a'}`,
        `Webhook URL: ${diagnostics.webhook?.url || 'n/a'}`,
        `Webhook pending updates: ${diagnostics.webhook?.pendingUpdateCount ?? 'n/a'}`,
        `Webhook last error: ${diagnostics.webhook?.lastErrorMessage || 'none'}`,
        `Default email target: ${DEFAULT_EMAIL_TO || 'n/a'}`,
        `This chatId: ${String(chatId)}`,
      ];
      await sendTelegramMessage(chatId, lines.join('\n'));
      await recordBridgeSuccess({ phase: 'command:diag', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/chatid' || lower === '/id') {
      const payload = [
        `chatId: ${String(chatId)}`,
        `userId: ${String(message?.from?.id || '')}`,
        'Use this chatId with POST /api/openclaw/telegram/notify-ready',
      ].join('\n');
      await sendTelegramMessage(chatId, payload);
      await recordBridgeSuccess({ phase: 'command:chatid', updateId, chatId: String(chatId) }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/identity')) {
      const payload = commandPayload(userText, 'identity');
      if (!payload) {
        await sendTelegramMessage(chatId, 'Usage: /identity <who you are, your mission, your values>');
        await recordBridgeSuccess({ phase: 'command:identity:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      await storePersonaEntry('identity', chatId, payload, 'fact').catch(() => {});
      await sendTelegramMessage(chatId, 'Identity imprint stored. I will align future responses to this core self.');
      await recordBridgeSuccess({ phase: 'command:identity', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/voice')) {
      const payload = commandPayload(userText, 'voice');
      if (!payload) {
        await sendTelegramMessage(chatId, 'Usage: /voice <tone, cadence, style, personality cues>');
        await recordBridgeSuccess({ phase: 'command:voice:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      await storePersonaEntry('voice', chatId, payload, 'preference').catch(() => {});
      await sendTelegramMessage(chatId, 'Voice profile stored. I will speak in this style moving forward.');
      await recordBridgeSuccess({ phase: 'command:voice', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/imprint') || lower.startsWith('/remember')) {
      const payload = lower.startsWith('/imprint')
        ? commandPayload(userText, 'imprint')
        : commandPayload(userText, 'remember');

      if (!payload) {
        await sendTelegramMessage(chatId, 'Usage: /imprint <memory to preserve as part of your AI self>');
        await recordBridgeSuccess({ phase: 'command:imprint:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      await storePersonaEntry('imprint', chatId, payload, 'reflection').catch(() => {});
      await sendTelegramMessage(chatId, 'Imprint stored. This is now part of your long-form AI memory stream.');
      await recordBridgeSuccess({ phase: 'command:imprint', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/profile')) {
      const payload = commandPayload(userText, 'profile');
      if (!payload) {
        await sendTelegramMessage(chatId, 'Usage: /profile <name>');
        await recordBridgeSuccess({ phase: 'command:profile:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      const profileId = normalizeLabel(payload, 'default', 120);
      await writeMemory(chatProfileKey(chatId), profileId, 'preference').catch(() => {});
      await sendTelegramMessage(chatId, `Profile switched to ${profileId}. Future replies will align with this identity stream.`);
      await recordBridgeSuccess({ phase: 'command:profile', updateId, profileId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/mode')) {
      const payload = commandPayload(userText, 'mode');
      if (!payload) {
        await sendTelegramMessage(chatId, 'Usage: /mode <name>');
        await recordBridgeSuccess({ phase: 'command:mode:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      const mode = normalizeLabel(payload, 'default', 80);
      await writeMemory(chatModeKey(chatId), mode, 'preference').catch(() => {});
      await sendTelegramMessage(chatId, `Mode switched to ${mode}.`);
      await recordBridgeSuccess({ phase: 'command:mode', updateId, mode }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/self') {
      const personaRuntime = await resolvePersonaRuntime(chatId).catch(() => ({
        profileId: DEFAULT_PERSONA_PROFILE_ID,
        activeMode: 'default',
      }));
      const context = await fetchPersonaContext(chatId).catch(() => null);
      const summary = context
        ? [
          `Runtime: profile=${personaRuntime.profileId} mode=${personaRuntime.activeMode}`,
          `Self profile: ${context.summary}`,
          '',
          ...(context.lines.slice(0, 8).map((line) => `- ${line}`)),
        ].join('\n')
        : 'Self profile unavailable right now.';

      await sendTelegramMessage(chatId, summary);
      await recordBridgeSuccess({ phase: 'command:self', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/workflow') {
      const state = await readLatestWorkflowState(chatId).catch(() => null);
      await sendTelegramMessage(chatId, formatWorkflowState(state));
      await recordBridgeSuccess({ phase: 'command:workflow', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/plan')) {
      const payload = commandPayload(userText, 'plan');
      if (!payload || !payload.includes('|')) {
        await sendTelegramMessage(chatId, 'Usage: /plan <title> | <step 1>; <step 2>; <step 3>');
        await recordBridgeSuccess({ phase: 'command:plan:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      const [title, ...stepParts] = payload.split('|');
      const stepsRaw = stepParts.join('|');
      const workflow = await createWorkflowState(chatId, title, stepsRaw).catch(() => null);
      if (!workflow) {
        await sendTelegramMessage(chatId, 'No valid steps found. Use semicolons or new lines to separate actions.');
        await recordBridgeSuccess({ phase: 'command:plan:invalid', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      await sendTelegramMessage(chatId, [
        `Workflow stored: ${workflow.title}`,
        `First step: ${workflow.steps[0]}`,
        `Use /continue to advance after each step completes.`,
      ].join('\n'));
      await recordBridgeSuccess({ phase: 'command:plan', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/continue') {
      const result = await advanceWorkflowState(chatId).catch(() => ({ state: null, message: 'No active workflow found.' }));
      await sendTelegramMessage(chatId, result.message);
      await recordBridgeSuccess({ phase: 'command:continue', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower === '/tasks') {
      const tasks = await fetchRecentTasks(chatId).catch(() => []);
      const output = tasks.length ? ['Recent tasks:', ...tasks.map((line) => `- ${line}`)].join('\n') : 'No tasks stored yet.';
      await sendTelegramMessage(chatId, output);
      await recordBridgeSuccess({ phase: 'command:tasks', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/task')) {
      const payload = commandPayload(userText, 'task');
      if (!payload) {
        await sendTelegramMessage(chatId, 'Usage: /task <task description>');
        await recordBridgeSuccess({ phase: 'command:task:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      const stored = await storeTask(chatId, payload, 'task').catch(() => null);
      await sendTelegramMessage(chatId, stored ? 'Task stored in assistant memory.' : 'Task could not be stored right now.');
      await recordBridgeSuccess({ phase: 'command:task', updateId }).catch(() => {});
      return res.json({ ok: true, handled: true });
    }

    if (lower.startsWith('/email')) {
      const payload = parseEmailCommand(userText);
      if (!payload || !payload.subject || !payload.body) {
        const defaultHint = DEFAULT_EMAIL_TO ? ` Default recipient is ${DEFAULT_EMAIL_TO}.` : '';
        await sendTelegramMessage(chatId, `Usage: /email to | subject | body${defaultHint}`);
        await recordBridgeSuccess({ phase: 'command:email:missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      if (!payload.to) {
        await sendTelegramMessage(chatId, 'No recipient configured. Set OPENCLAW_TELEGRAM_DEFAULT_EMAIL_TO or include the recipient in the command.');
        await recordBridgeSuccess({ phase: 'command:email:recipient-missing', updateId }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      let emailResult = null;
      try {
        emailResult = await sendCustomEmail({
          to: payload.to,
          subject: payload.subject,
          text: [
            payload.body,
            '',
            `Sent from Telegram chat ${String(chatId)}`,
            `User ID: ${String(message?.from?.id || '')}`,
          ].join('\n'),
          html: `<p>${String(payload.body).replace(/\n/g, '<br>')}</p><p><small>Sent from Telegram chat ${String(chatId)}</small></p>`,
          fromName: 'PVA Bazaar Assistant',
        });
      } catch (emailError) {
        await sendTelegramMessage(chatId, `Email failed for ${payload.to}: ${String(emailError?.message || 'unknown error').slice(0, 180)}`);
        await recordBridgeSuccess({ phase: 'command:email:error', updateId, to: payload.to }).catch(() => {});
        return res.json({ ok: true, handled: true });
      }

      await sendTelegramMessage(chatId, emailResult?.success
        ? `Email sent to ${payload.to}.`
        : `Email request skipped for ${payload.to}.`);
      await recordBridgeSuccess({ phase: 'command:email', updateId, to: payload.to }).catch(() => {});
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

    if (PERSONA_AUTO_LEARN && !lower.startsWith('/')) {
      await storePersonaEntry('journal', chatId, userText, 'reflection').catch(() => {});
    }

    const personaRuntime = await resolvePersonaRuntime(chatId).catch(() => ({
      profileId: DEFAULT_PERSONA_PROFILE_ID,
      activeMode: 'default',
    }));
    const personaContext = await fetchPersonaContext(chatId).catch(() => null);
    const reply = await openclawChat(apiBaseUrl, userText, {
      telegramChatId: String(chatId),
      telegramUserId: String(message?.from?.id || ''),
      telegramUpdateId: String(updateId),
      personaContext: personaContext?.lines || [],
      personaSummary: personaContext?.summary || null,
      personaProfileId: personaRuntime.profileId,
      personaMode: personaRuntime.activeMode,
    });

    let replyText = reply?.reply?.content
      ? String(reply.reply.content).slice(0, 3500)
      : '';

    if (needsDirectFallback(reply, userText) || !replyText) {
      const direct = await generateOllamaFallbackReply(userText, apiBaseUrl, personaContext, personaRuntime).catch(() => null);
      if (direct) replyText = direct;
    }

    if (!replyText) {
      replyText = 'AI response is temporarily unavailable. Please try again in a moment.';
    }

    await sendTelegramMessage(chatId, replyText);
    await recordBridgeSuccess({ phase: 'chat', updateId }).catch(() => {});
    return res.json({ ok: true, handled: true });
  } catch (err) {
    await recordBridgeFailure(err?.message || 'telegram webhook failure', { updateId }).catch(() => {});
    const personaRuntime = await resolvePersonaRuntime(chatId).catch(() => ({
      profileId: DEFAULT_PERSONA_PROFILE_ID,
      activeMode: 'default',
    }));
    const personaContext = await fetchPersonaContext(chatId).catch(() => null);
    const fallback = await generateOllamaFallbackReply(userText, apiBaseUrl, personaContext, personaRuntime).catch(() => null);
    if (fallback) {
      await sendTelegramMessage(chatId, fallback).catch(() => {});
      return res.json({ ok: true, handled: true, fallback: true });
    }

    await sendTelegramMessage(chatId, `Bridge error: ${String(err?.message || 'unknown error').slice(0, 400)}`).catch(() => {});
    return res.status(200).json({ ok: true, handled: true, error: true });
  }
});

module.exports = router;
