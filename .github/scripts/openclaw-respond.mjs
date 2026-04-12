#!/usr/bin/env node
/* eslint-env node */
/* global fetch, console, process, AbortController, setTimeout, clearTimeout */

const BACKEND_URL = (process.env.OPENCLAW_BACKEND_URL || '').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.OPENCLAW_BRIDGE_SECRET || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || process.env.OPENCLAW_OLLAMA_BASE_URL || '').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || process.env.OPENCLAW_OLLAMA_MODEL || 'llama3.1';
const OLLAMA_TEMPERATURE = Math.min(Math.max(parseFloat(process.env.OLLAMA_TEMPERATURE || '0.35'), 0), 2);
const OLLAMA_TIMEOUT_MS = Math.min(Math.max(parseInt(process.env.OPENCLAW_OLLAMA_TIMEOUT_MS || '30000', 10), 5000), 120000);
const GITHUB_MODELS_TIMEOUT_MS = Math.min(Math.max(parseInt(process.env.OPENCLAW_GITHUB_MODELS_TIMEOUT_MS || '35000', 10), 5000), 120000);
const QUEUE_FETCH_TIMEOUT_MS = Math.min(Math.max(parseInt(process.env.OPENCLAW_QUEUE_FETCH_TIMEOUT_MS || '12000', 10), 3000), 60000);
const QUEUE_FETCH_MAX_RETRIES = Math.min(Math.max(parseInt(process.env.OPENCLAW_QUEUE_FETCH_MAX_RETRIES || '5', 10), 0), 10);
const QUEUE_FETCH_BASE_DELAY_MS = Math.min(Math.max(parseInt(process.env.OPENCLAW_QUEUE_FETCH_BASE_DELAY_MS || '1000', 10), 250), 10000);
const QUEUE_FETCH_MAX_DELAY_MS = Math.min(Math.max(parseInt(process.env.OPENCLAW_QUEUE_FETCH_MAX_DELAY_MS || '60000', 10), 1000), 120000);
const REPO = process.env.GITHUB_REPOSITORY || 'PVAGR/pva-bazaar-app';
const LOGIC_MODE_ALIASES = new Set(['logic', 'logic-mode', 'logical', 'analysis']);

const LOGIC_KNOWLEDGE_PACK = [
  'Logic knowledge pack (public, non-personal):',
  '- Atbash cipher: map A<->Z, B<->Y ... and preserve non-letters.',
  '- Gematria (Hebrew standard): common letter values include א=1, ב=2, ג=3 ... י=10, כ=20 ... ק=100, ר=200, ש=300, ת=400.',
  '- Gematria (Latin adaptation): if user requests Latin, default A1Z26 unless they specify another table.',
  '- Cipher workflow: normalize text, state alphabet/table assumptions, show steps, then provide final interpretation.',
  '- Keep objective transforms (cipher/math) separate from speculative interpretation.',
].join('\n');

if (!BACKEND_URL) {
  console.warn('OPENCLAW_BACKEND_URL is not set — skipping agent run.');
  process.exit(0);
}

const BASE_SYSTEM_PROMPT = `You are PVA Magnum Opus, the autonomous OpenClaw assistant for PVAGR/pva-bazaar-app and pvabazaar.org.
You operate as a broad, global operations assistant for website, Telegram, GitHub workflows, and OpenClaw automation.

Behavior:
- Give concrete, immediate action-oriented responses with specifics.
- If asked to "start" or "improve" or "go wild", propose practical actions and immediate next steps.
- Follow configured global directives and goals from agent config.
- Support broad chat usage: troubleshooting, planning, execution guidance, and operations automation.
- Never claim to have performed actions you did not perform.
- Be proactive: suggest improvements and next steps.

Style:
- Be concise, direct, and useful.
- Avoid repetitive disclaimers.`;

function getHeaders(includeSecret = false) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (includeSecret && BRIDGE_SECRET) {
    headers['X-OpenClaw-Secret'] = BRIDGE_SECRET;
  }
  return headers;
}

async function postInbound(content, respondingTo) {
  const response = await fetch(`${BACKEND_URL}/api/openclaw/inbound`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({
      content,
      event: 'pvabazaar.agent.response',
      respondingTo,
      metadata: {
        source: 'github-actions-openclaw-agent',
        repository: REPO,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Inbound post failed (${response.status}): ${detail}`);
  }
}

async function markProcessed(id) {
  const response = await fetch(`${BACKEND_URL}/api/openclaw/messages/${id}/processed`, {
    method: 'POST',
    headers: getHeaders(true),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`markProcessed failed (${response.status}): ${detail}`);
  }
}

async function writeMemory(key, value, type = 'fact') {
  try {
    const response = await fetch(`${BACKEND_URL}/api/openclaw/memory`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ key, value: value.slice(0, 4000), type, source: 'openclaw-agent' }),
    });
    if (!response.ok) return;
  } catch (_err) {
    // non-fatal
  }
}

async function readMemoryValue(key) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/openclaw/memory?limit=80`, {
      headers: getHeaders(true),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const items = Array.isArray(payload.memory) ? payload.memory : [];
    const hit = items.find((item) => item.key === key);
    return hit ? String(hit.value || '') : null;
  } catch (_err) {
    return null;
  }
}

async function writeResponderState(state, details = {}) {
  const timestamp = new Date().toISOString();
  await Promise.allSettled([
    writeMemory('ecosystem:openclaw-responder:connectionState', state, 'fact'),
    writeMemory('ecosystem:openclaw-responder:lastStatus', JSON.stringify({ state, timestamp, ...details }), 'reflection'),
  ]);
}

async function recordResponderFailure(errorMessage, details = {}) {
  const previous = parseInt((await readMemoryValue('ecosystem:openclaw-responder:consecutiveFailures')) || '0', 10);
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  const timestamp = new Date().toISOString();
  await Promise.allSettled([
    writeMemory('ecosystem:openclaw-responder:consecutiveFailures', String(next), 'fact'),
    writeMemory('ecosystem:openclaw-responder:lastError', String(errorMessage || 'unknown error').slice(0, 1200), 'reflection'),
    writeResponderState(`error:${String(errorMessage || 'unknown').slice(0, 160)}`, {
      consecutiveFailures: next,
      timestamp,
      ...details,
    }),
  ]);
}

async function recordResponderSuccess(details = {}) {
  await Promise.allSettled([
    writeMemory('ecosystem:openclaw-responder:consecutiveFailures', '0', 'fact'),
    writeResponderState('online', details),
  ]);
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfterHeader) {
  if (!retryAfterHeader) return null;
  const trimmed = String(retryAfterHeader).trim();
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds)) {
    return Math.max(seconds * 1000, 0);
  }

  const retryDate = new Date(trimmed).getTime();
  if (Number.isFinite(retryDate)) {
    return Math.max(retryDate - Date.now(), 0);
  }

  return null;
}

function computeBackoffMs(attempt) {
  const exponential = QUEUE_FETCH_BASE_DELAY_MS * Math.pow(2, Math.max(attempt - 1, 0));
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(exponential + jitter, QUEUE_FETCH_MAX_DELAY_MS);
}

async function fetchOutboundQueueWithRetry() {
  const queueUrl = `${BACKEND_URL}/api/openclaw/messages?unprocessed=true&direction=outbound&limit=25`;

  for (let attempt = 1; attempt <= QUEUE_FETCH_MAX_RETRIES + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUEUE_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(queueUrl, {
        headers: getHeaders(true),
        signal: controller.signal,
      });

      if (response.ok) {
        const payload = await response.json();
        return {
          payload,
          attempts: attempt,
        };
      }

      const detail = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt > QUEUE_FETCH_MAX_RETRIES) {
        throw new Error(`Failed to fetch outbound queue (${response.status}): ${detail}`);
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
      const delayMs = Number.isFinite(retryAfterMs) ? retryAfterMs : computeBackoffMs(attempt);
      await writeMemory(
        'ecosystem:openclaw-responder:lastRateLimit',
        JSON.stringify({ status: response.status, delayMs, attempt, at: new Date().toISOString() }).slice(0, 4000),
        'reflection',
      );
      await sleep(delayMs);
    } catch (err) {
      const retryable = err?.name === 'AbortError' || /network|timeout|fetch/i.test(String(err?.message || ''));
      if (!retryable || attempt > QUEUE_FETCH_MAX_RETRIES) {
        throw err;
      }

      const delayMs = computeBackoffMs(attempt);
      await sleep(delayMs);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('Failed to fetch outbound queue after retries');
}

async function writeHeartbeat(source, details = {}) {
  const timestamp = new Date().toISOString();
  await Promise.allSettled([
    writeMemory('ecosystem:openclaw-responder:lastHeartbeat', timestamp, 'fact'),
    writeMemory('ecosystem:openclaw-responder:brain', source, 'fact'),
    writeMemory('ecosystem:openclaw-responder:details', JSON.stringify({ source, timestamp, ...details }), 'reflection'),
  ]);
}

async function getAgentConfig() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/openclaw/agent-config`, { headers: getHeaders(true) });
    if (!response.ok) {
      return {
        globalDirectives: [],
        goals: [],
        activeMode: 'default',
        personaProfileId: 'default',
        modeProfiles: [],
      };
    }
    const data = await response.json();
    return {
      globalDirectives: Array.isArray(data.globalDirectives)
        ? data.globalDirectives
        : (Array.isArray(data.creatorCommands) ? data.creatorCommands : []),
      goals: Array.isArray(data.goals) ? data.goals : [],
      activeMode: String(data.activeMode || 'default').trim().toLowerCase(),
      personaProfileId: String(data.personaProfileId || 'default').trim().toLowerCase() || 'default',
      modeProfiles: Array.isArray(data.modeProfiles) ? data.modeProfiles : [],
    };
  } catch (_err) {
    return {
      globalDirectives: [],
      goals: [],
      activeMode: 'default',
      personaProfileId: 'default',
      modeProfiles: [],
    };
  }
}

function normalizeModeName(value) {
  return String(value || 'default').trim().toLowerCase();
}

function resolveModeRuntime(agentConfig) {
  const activeMode = normalizeModeName(agentConfig?.activeMode);
  const profileId = String(agentConfig?.personaProfileId || 'default').trim().toLowerCase() || 'default';
  const modeProfiles = Array.isArray(agentConfig?.modeProfiles) ? agentConfig.modeProfiles : [];
  const profile = modeProfiles.find((item) => normalizeModeName(item?.name) === activeMode) || null;

  const modeDirectives = Array.isArray(profile?.directives)
    ? profile.directives.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const modeGoals = Array.isArray(profile?.goals)
    ? profile.goals.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return {
    activeMode,
    profileId,
    isLogicMode: LOGIC_MODE_ALIASES.has(activeMode),
    modeStyle: String(profile?.style || '').trim(),
    modeDirectives,
    modeGoals,
  };
}

function filterMemoryForMode(memory, modeRuntime) {
  const items = Array.isArray(memory) ? memory : [];
  const profileId = String(modeRuntime?.profileId || 'default').toLowerCase();

  return items
    .filter((item) => {
      const key = String(item?.key || '').toLowerCase();
      const itemProfileId = String(item?.profileId || '').toLowerCase();

      if (key.startsWith('conversation_') || key.startsWith('conversation_error_')) return false;

      if (modeRuntime?.isLogicMode) {
        if (key.startsWith('persona:')) return false;
        if (itemProfileId) return false;
      }

      if (key.startsWith('persona:') && itemProfileId && itemProfileId !== profileId) return false;

      return true;
    })
    .slice(0, 25);
}

async function getMemorySnapshot(limit = 30) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/openclaw/memory?limit=${limit}`, { headers: getHeaders(true) });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.memory) ? data.memory : [];
  } catch (_err) {
    return [];
  }
}

async function getOperationalSnapshot() {
  const snapshot = {
    at: new Date().toISOString(),
    backend: null,
    openclaw: null,
    queue: null,
    marketplace: null,
  };

  try {
    const healthRes = await fetch(`${BACKEND_URL}/api/health`, { headers: getHeaders(false) });
    if (healthRes.ok) snapshot.backend = await healthRes.json();
  } catch (_err) {
    // non-fatal
  }

  try {
    const statusRes = await fetch(`${BACKEND_URL}/api/openclaw/status`, { headers: getHeaders(false) });
    if (statusRes.ok) snapshot.openclaw = await statusRes.json();
  } catch (_err) {
    // non-fatal
  }

  try {
    const queueRes = await fetch(`${BACKEND_URL}/api/openclaw/queue-stats`, { headers: getHeaders(true) });
    if (queueRes.ok) snapshot.queue = await queueRes.json();
  } catch (_err) {
    // non-fatal
  }

  try {
    const marketRes = await fetch(`${BACKEND_URL}/api/openclaw/snapshot/marketplace?limit=10`, { headers: getHeaders(true) });
    if (marketRes.ok) {
      const data = await marketRes.json();
      if (data?.marketplace) snapshot.marketplace = data.marketplace;
    }
  } catch (_err) {
    // non-fatal
  }

  return snapshot;
}

function resolveOllamaRuntime(snapshot) {
  const snapshotOllama = snapshot?.openclaw?.ecosystem?.services?.ollama || {};
  const baseUrl = (OLLAMA_BASE_URL || snapshotOllama.baseUrl || '').replace(/\/$/, '');
  const model = OLLAMA_MODEL || snapshotOllama.model || 'llama3.1';
  return {
    baseUrl,
    model,
    temperature: OLLAMA_TEMPERATURE,
  };
}

function buildSystemPrompt(agentConfig, modeRuntime) {
  const parts = [BASE_SYSTEM_PROMPT];
  const mergedDirectives = [
    ...(Array.isArray(agentConfig?.globalDirectives) ? agentConfig.globalDirectives : []),
    ...(Array.isArray(modeRuntime?.modeDirectives) ? modeRuntime.modeDirectives : []),
  ];
  const mergedGoals = [
    ...(Array.isArray(agentConfig?.goals) ? agentConfig.goals : []),
    ...(Array.isArray(modeRuntime?.modeGoals) ? modeRuntime.modeGoals : []),
  ];

  parts.push('');
  parts.push(`Active mode: ${modeRuntime?.activeMode || 'default'}`);

  if (modeRuntime?.isLogicMode) {
    parts.push('');
    parts.push('Logic mode policy:');
    parts.push('- Never reveal or infer private creator/persona history.');
    parts.push('- Use only the current user message for personal context.');
    parts.push('- Prioritize explicit reasoning, assumptions, and step-by-step transforms.');
    parts.push('- For ciphers/symbolic systems, show method first, conclusion second.');
    parts.push(LOGIC_KNOWLEDGE_PACK);
  }

  if (modeRuntime?.modeStyle) {
    parts.push('');
    parts.push('Mode style:');
    parts.push(modeRuntime.modeStyle);
  }

  if (mergedDirectives.length) {
    parts.push('');
    parts.push('Global directives:');
    parts.push(...mergedDirectives.map((c) => `- ${c}`));
    parts.push('---');
  }
  if (mergedGoals.length) {
    parts.push('');
    parts.push('Current goals to pursue:');
    parts.push(...mergedGoals.map((g) => `- ${g}`));
  }
  return parts.join('\n');
}

function buildUserPrompt(userText, snapshot, memory, modeRuntime) {
  const lines = [
    'User message:',
    userText,
    '',
    'Operational snapshot (JSON):',
    JSON.stringify(snapshot),
  ];
  if (memory?.length) {
    lines.push('', 'Long-term memory (use for context):');
    memory.slice(0, 25).forEach((m) => {
      lines.push(`- [${m.type}] ${m.key}: ${m.value}`);
    });
  }
  if (modeRuntime?.isLogicMode) {
    lines.push('');
    lines.push('Logic mode reminder: Do not reference private persona memories.');
    lines.push('If personal details are needed, ask the user to provide them now.');
  }
  lines.push('', 'Use snapshot and memory when answering. Be concrete and current.');
  return lines.join('\n');
}

async function generateReply(message) {
  const userText = message.content || message.event || 'Empty outbound event';

  const [agentConfig, memory, snapshot] = await Promise.all([
    getAgentConfig(),
    getMemorySnapshot(30),
    getOperationalSnapshot(),
  ]);

  const modeRuntime = resolveModeRuntime(agentConfig);
  const filteredMemory = filterMemoryForMode(memory, modeRuntime);
  const systemPrompt = buildSystemPrompt(agentConfig, modeRuntime);
  const userPrompt = buildUserPrompt(userText, snapshot, filteredMemory, modeRuntime);
  const ollamaRuntime = resolveOllamaRuntime(snapshot);

  if (ollamaRuntime.baseUrl) {
    try {
      const { response, payload: data } = await fetchJsonWithTimeout(
        `${ollamaRuntime.baseUrl}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: ollamaRuntime.model,
            stream: false,
            options: {
              temperature: ollamaRuntime.temperature,
            },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
        OLLAMA_TIMEOUT_MS,
      );

      if (response.ok) {
        const text = data?.message?.content?.trim() || data?.response?.trim();
        if (text) {
          return {
            text,
            source: 'ollama',
            model: ollamaRuntime.model,
            baseUrl: ollamaRuntime.baseUrl,
          };
        }
      }
    } catch (_err) {
      // Fall through to GitHub Models when Ollama is unavailable.
    }
  }

  if (!GITHUB_TOKEN) {
    return {
      text: ollamaRuntime.baseUrl
        ? 'OpenClaw agent could not reach Ollama, and GITHUB_TOKEN was not available for fallback inference.'
        : 'OpenClaw agent is online, but GITHUB_TOKEN was not available for model inference.',
      source: ollamaRuntime.baseUrl ? 'error:no-fallback-token' : 'error:no-model-token',
      model: null,
      baseUrl: ollamaRuntime.baseUrl || null,
    };
  }

  const { response, payload: data } = await fetchJsonWithTimeout(
    'https://models.inference.ai.azure.com/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    },
    GITHUB_MODELS_TIMEOUT_MS,
  );

  if (!response.ok) {
    return {
      text: `OpenClaw agent failed to call GitHub Models (${response.status}). ${JSON.stringify(data).slice(0, 1000)}`,
      source: 'error:github-models',
      model: 'gpt-4o-mini',
      baseUrl: 'https://models.inference.ai.azure.com',
    };
  }

  return {
    text: data?.choices?.[0]?.message?.content?.trim() || 'No response text returned by model.',
    source: 'github-models',
    model: 'gpt-4o-mini',
    baseUrl: 'https://models.inference.ai.azure.com',
  };
}

async function main() {
  console.log(`OpenClaw responder starting for ${REPO}`);
  await writeResponderState('starting', { repo: REPO });
  await writeHeartbeat(OLLAMA_BASE_URL ? 'ollama' : 'github-models', {
    repo: REPO,
    ollamaBaseUrl: OLLAMA_BASE_URL || null,
    ollamaModel: OLLAMA_MODEL || null,
  });

  const { payload, attempts } = await fetchOutboundQueueWithRetry();
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (!messages.length) {
    console.log('No unprocessed outbound messages.');
    await recordResponderSuccess({
      processedCount: 0,
      failedCount: 0,
      sources: [],
      phase: 'idle',
      fetchAttempts: attempts,
    });
    await writeHeartbeat(OLLAMA_BASE_URL ? 'ollama' : 'github-models', {
      processedCount: 0,
      failedCount: 0,
      repo: REPO,
      phase: 'idle',
      ollamaBaseUrl: OLLAMA_BASE_URL || null,
      ollamaModel: OLLAMA_MODEL || null,
      sources: [],
      fetchAttempts: attempts,
    });
    return;
  }

  console.log(`Processing ${messages.length} queued message(s)...`);

  let processedCount = 0;
  let failedCount = 0;
  const usedSources = new Set();

  for (const message of messages) {
    try {
      const generated = await generateReply(message);
      usedSources.add(generated.source || 'unknown');
      await postInbound(generated.text, message._id);
      await markProcessed(message._id);
      const userText = (message.content || message.event || '').slice(0, 200);
      await writeMemory(
        `conversation_${message._id}`,
        `User: ${userText} -> Agent: ${generated.text.slice(0, 300)}`,
        'fact',
      );
      processedCount += 1;
      console.log(`Processed message ${message._id}`);
    } catch (err) {
      failedCount += 1;
      console.error(`Failed message ${message._id}:`, err.message);
      await writeMemory(
        `conversation_error_${message._id}`,
        String(err.message || 'unknown error').slice(0, 600),
        'reflection',
      );
    }
  }

  console.log(`Responder finished. processed=${processedCount} failed=${failedCount}`);

  const sourceSummary = Array.from(usedSources).join(',') || (OLLAMA_BASE_URL ? 'ollama' : 'github-models');
  await writeHeartbeat(sourceSummary, {
    processedCount,
    failedCount,
    fetchAttempts: attempts,
    repo: REPO,
    ollamaBaseUrl: OLLAMA_BASE_URL || null,
    ollamaModel: OLLAMA_MODEL || null,
    sources: Array.from(usedSources),
  });

  if (failedCount > 0) {
    await recordResponderFailure(`${failedCount} message(s) failed in batch`, {
      processedCount,
      failedCount,
      fetchAttempts: attempts,
      sources: Array.from(usedSources),
    });
  } else {
    await recordResponderSuccess({
      processedCount,
      failedCount,
      fetchAttempts: attempts,
      sources: Array.from(usedSources),
    });
  }

  if (processedCount === 0 && failedCount > 0) {
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('OpenClaw responder failure:', err.message);
  await recordResponderFailure(err.message || 'fatal responder failure', { fatal: true });
  process.exit(1);
});
