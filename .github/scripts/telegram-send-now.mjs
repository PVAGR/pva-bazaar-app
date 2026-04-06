#!/usr/bin/env node
/* eslint-env node */
/* global fetch, console, process */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);
const TELEGRAM_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '').trim();
const TELEGRAM_MESSAGE = String(process.env.TELEGRAM_MESSAGE || '').trim();
const OPENCLAW_BACKEND_URL = String(process.env.OPENCLAW_BACKEND_URL || 'https://api.pvabazaar.org').replace(/\/$/, '');
const OPENCLAW_BRIDGE_SECRET = String(process.env.OPENCLAW_BRIDGE_SECRET || '').trim();

if (!TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required.');
  process.exit(1);
}

if (!TELEGRAM_MESSAGE) {
  console.error('TELEGRAM_MESSAGE is required.');
  process.exit(1);
}

async function getMemoryValue(key) {
  try {
    const response = await fetch(`${OPENCLAW_BACKEND_URL}/api/openclaw/memory?limit=40`, {
      headers: {
        'Content-Type': 'application/json',
        ...(OPENCLAW_BRIDGE_SECRET ? { 'X-OpenClaw-Secret': OPENCLAW_BRIDGE_SECRET } : {}),
      },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const memory = Array.isArray(payload.memory) ? payload.memory : [];
    const hit = memory.find((item) => item.key === key);
    return hit ? String(hit.value || '').trim() : null;
  } catch (_err) {
    return null;
  }
}

async function resolveChatTargets() {
  const chatTargets = [];
  if (TELEGRAM_CHAT_ID) chatTargets.push(TELEGRAM_CHAT_ID);

  if (!chatTargets.length) {
    const lastChatId = await getMemoryValue('telegram:lastChatId');
    if (lastChatId) chatTargets.push(lastChatId);
  }

  for (const id of TELEGRAM_ALLOWED_CHAT_IDS) {
    if (!chatTargets.includes(id)) chatTargets.push(id);
  }

  return chatTargets;
}

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) {
    throw new Error(`sendMessage failed for ${chatId}: ${JSON.stringify(payload).slice(0, 400)}`);
  }

  return payload;
}

async function main() {
  const chatTargets = await resolveChatTargets();

  if (!chatTargets.length) {
    console.error('No chat target configured and no last chat ID found in memory.');
    process.exit(1);
  }

  let sent = 0;
  for (const chatId of chatTargets) {
    try {
      await sendMessage(chatId, TELEGRAM_MESSAGE);
      sent += 1;
      console.log(`Sent Telegram message to ${chatId}`);
    } catch (err) {
      console.error(String(err?.message || err));
    }
  }

  if (!sent) {
    process.exit(1);
  }

  console.log(`Telegram send complete. delivered=${sent}`);
}

main().catch((err) => {
  console.error('Fatal telegram send error:', String(err?.message || err));
  process.exit(1);
});
