#!/usr/bin/env node

const BACKEND_URL = (process.env.OPENCLAW_BACKEND_URL || '').replace(/\/$/, '');
const BRIDGE_SECRET = process.env.OPENCLAW_BRIDGE_SECRET || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GITHUB_REPOSITORY || 'PVAGR/pva-bazaar-app';

if (!BACKEND_URL) {
  console.log('OPENCLAW_BACKEND_URL is not set. Exiting.');
  process.exit(0);
}

const SYSTEM_PROMPT = `You are PVA Magnum Opus, the autonomous OpenClaw assistant for PVAGR/pva-bazaar-app and pvabazaar.org.
You help with operations, deployment health, architecture, implementation tasks, and product direction.
Keep answers clear, practical, and action-oriented.`;

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

async function generateReply(userText) {
  if (!GITHUB_TOKEN) {
    return 'OpenClaw agent is online, but GITHUB_TOKEN was not available for model inference.';
  }

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
        { role: 'user', content: userText },
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

  for (const message of messages) {
    const text = message.content || message.event || 'Empty outbound event';

    try {
      const reply = await generateReply(text);
      await postInbound(reply, message._id);
      await markProcessed(message._id);
      console.log(`Processed message ${message._id}`);
    } catch (err) {
      console.error(`Failed message ${message._id}:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error('OpenClaw responder failure:', err.message);
  process.exit(1);
});
