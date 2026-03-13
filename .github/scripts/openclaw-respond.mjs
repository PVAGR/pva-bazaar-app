#!/usr/bin/env node

const BACKEND_URL = (process.env.OPENCLAW_BACKEND_URL || '').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.OPENCLAW_BRIDGE_SECRET || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GITHUB_REPOSITORY || 'PVAGR/pva-bazaar-app';

if (!BACKEND_URL) {
  console.warn('OPENCLAW_BACKEND_URL is not set — skipping agent run.');
  process.exit(0);
}

if (!BRIDGE_SECRET) {
  console.warn('OPENCLAW_BRIDGE_SECRET is not set — skipping agent run (queue auth required).');
  process.exit(0);
}

const SYSTEM_PROMPT = `You are PVA Magnum Opus, the autonomous OpenClaw assistant for PVAGR/pva-bazaar-app and pvabazaar.org.
You are an operations and implementation copilot, not a generic chatbot.

Behavior rules:
- Give concrete, immediate action-oriented responses with specifics.
- If asked to "start" or "improve", propose exactly 3 next actions and begin with action #1 immediately.
- Include brief progress-style updates when possible (what is done, what is next).
- Prefer practical implementation, reliability, deployment health, and product execution guidance.
- Never claim to have performed actions you did not perform.
- You cannot manage private keys, wallets, or execute financial transactions.

Style:
- Be concise, direct, and useful.
- Avoid repetitive disclaimers or boilerplate phrasing.`;

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

function isFinancialControlRequest(text) {
  const lower = String(text || '').toLowerCase();
  return (
    lower.includes('send to wallet') ||
    lower.includes('manage my wallet') ||
    lower.includes('move funds') ||
    lower.includes('transfer crypto') ||
    lower.includes('private key') ||
    lower.includes('seed phrase') ||
    lower.includes('engage in financial transactions')
  );
}

async function getOperationalSnapshot() {
  const snapshot = {
    at: new Date().toISOString(),
    backend: null,
    openclaw: null,
    queue: null,
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

  return snapshot;
}

function buildUserPrompt(userText, snapshot) {
  return [
    'User message:',
    userText,
    '',
    'Current operational snapshot (JSON):',
    JSON.stringify(snapshot),
    '',
    'Use this snapshot when answering so your guidance is concrete and current.',
  ].join('\n');
}

async function generateReply(userText) {
  if (isFinancialControlRequest(userText)) {
    return 'I cannot manage wallets or execute financial transactions. I can help with automation architecture, monitoring, bounty research pipelines, and deployment reliability.';
  }

  if (!GITHUB_TOKEN) {
    return 'OpenClaw agent is online, but GITHUB_TOKEN was not available for model inference.';
  }

  const snapshot = await getOperationalSnapshot();
  const prompt = buildUserPrompt(userText, snapshot);

  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return `OpenClaw agent failed to call GitHub Models (${response.status}). ${detail}`;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || 'No response text returned by model.';
}

async function main() {
  console.log(`OpenClaw responder starting for ${REPO}`);
  const response = await fetch(`${BACKEND_URL}/api/openclaw/messages?unprocessed=true&direction=outbound&limit=25`, {
    headers: getHeaders(true),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch outbound queue (${response.status}): ${detail}`);
  }

  const payload = await response.json();
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (!messages.length) {
    console.log('No unprocessed outbound messages.');
    return;
  }

  console.log(`Processing ${messages.length} queued message(s)...`);

  let processedCount = 0;
  let failedCount = 0;

  for (const message of messages) {
    const text = message.content || message.event || 'Empty outbound event';

    try {
      const reply = await generateReply(text);
      await postInbound(reply, message._id);
      await markProcessed(message._id);
      processedCount += 1;
      console.log(`Processed message ${message._id}`);
    } catch (err) {
      failedCount += 1;
      console.error(`Failed message ${message._id}:`, err.message);
    }
  }

  console.log(`Responder finished. processed=${processedCount} failed=${failedCount}`);

  if (processedCount === 0 && failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('OpenClaw responder failure:', err.message);
  process.exit(1);
});
