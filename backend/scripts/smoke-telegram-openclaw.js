const axios = require('axios');

function trimTrailingSlash(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function buildAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const bridgeSecret = String(process.env.OPENCLAW_BRIDGE_SECRET || '').trim();
  if (bridgeSecret) {
    headers['X-OpenClaw-Secret'] = bridgeSecret;
  }
  return headers;
}

function boolLabel(value) {
  return value ? 'yes' : 'no';
}

async function firstHealthy(urls, headers) {
  for (const url of urls) {
    try {
      const response = await axios.get(url, { timeout: 10000, headers });
      return { url, data: response.data || {}, status: response.status };
    } catch (_err) {
      // try next candidate
    }
  }
  return null;
}

async function checkOpenClawStatus(baseUrl, headers) {
  const response = await axios.get(`${baseUrl}/api/openclaw/status`, {
    timeout: 10000,
    headers,
  });

  const status = response.data || {};
  const ecosystem = status?.ecosystem || {};
  const services = ecosystem?.services || {};

  console.log('OpenClaw status endpoint reachable.');
  console.log(`mode=${status.mode || 'unknown'} reachable=${boolLabel(Boolean(status.reachable))} queuePending=${status?.queue?.pending ?? 'n/a'}`);
  console.log(`ecosystem=${ecosystem.status || 'unknown'}`);
  console.log(`website=${services?.website?.status || 'unknown'} openclaw=${services?.openclaw?.status || 'unknown'} ollama=${services?.ollama?.status || 'unknown'} telegram=${services?.telegram?.status || 'unknown'}`);

  return status;
}

async function checkTelegramWebhookHealth(baseUrl) {
  const candidates = [
    `${baseUrl}/api/webhooks/telegram/health`,
    `${baseUrl}/webhooks/telegram/health`,
  ];

  const hit = await firstHealthy(candidates, {});
  if (!hit) {
    throw new Error('Telegram webhook health endpoint is not reachable at /api/webhooks/telegram/health or /webhooks/telegram/health');
  }

  const health = hit.data || {};
  console.log(`telegramHealthPath=${hit.url}`);
  console.log(`telegramConfigured=${boolLabel(Boolean(health.configured))} webhookSecretConfigured=${boolLabel(Boolean(health.webhookSecretConfigured))} publicMode=${boolLabel(Boolean(health.publicMode))}`);
  return health;
}

async function checkTelegramDiagnostics(baseUrl, headers) {
  const diagnosticsUrl = `${baseUrl}/api/webhooks/telegram/diagnostics`;
  try {
    const response = await axios.get(diagnosticsUrl, { timeout: 12000, headers });
    const diagnostics = response.data?.diagnostics || {};
    console.log(`telegramDiagnostics=ok apiReachable=${boolLabel(Boolean(diagnostics.apiReachable))} bot=${diagnostics?.bot?.username || 'n/a'} webhookPending=${diagnostics?.webhook?.pendingUpdateCount ?? 'n/a'}`);
  } catch (err) {
    const status = err?.response?.status || null;
    if (status === 401) {
      console.log('telegramDiagnostics=skipped (missing/invalid OPENCLAW_BRIDGE_SECRET for diagnostics endpoint)');
      return;
    }
    if (status === 404) {
      console.log('telegramDiagnostics=skipped (diagnostics endpoint not deployed yet)');
      return;
    }
    throw err;
  }
}

async function registerWebhookIfRequested(baseUrl, headers) {
  if (process.env.TELEGRAM_REGISTER_WEBHOOK !== 'true') {
    return;
  }

  const webhookUrl = String(process.env.TELEGRAM_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    throw new Error('TELEGRAM_REGISTER_WEBHOOK=true requires TELEGRAM_WEBHOOK_URL');
  }

  const payload = {
    url: webhookUrl,
  };

  const secretToken = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  if (secretToken) {
    payload.secretToken = secretToken;
  }

  const response = await axios.post(
    `${baseUrl}/api/openclaw/telegram/register-webhook`,
    payload,
    { timeout: 15000, headers },
  );

  console.log('Telegram webhook registration call succeeded.');
  const info = response.data?.webhookInfo?.result || response.data?.webhookInfo || null;
  if (info) {
    console.log(`telegramWebhookUrl=${info.url || 'unknown'} pendingUpdates=${info.pending_update_count ?? 'n/a'}`);
  }
}

async function checkOllamaDirect() {
  const ollamaBaseUrl = trimTrailingSlash(process.env.OLLAMA_BASE_URL || process.env.OPENCLAW_OLLAMA_BASE_URL || '');
  if (!ollamaBaseUrl) {
    console.log('ollamaDirectCheck=skipped (OLLAMA_BASE_URL not set)');
    return;
  }

  const response = await axios.get(`${ollamaBaseUrl}/api/version`, { timeout: 10000 });
  const version = response.data?.version || response.data?.name || 'unknown';
  console.log(`ollamaDirectCheck=ok base=${ollamaBaseUrl} version=${version}`);
}

async function main() {
  const baseUrl = trimTrailingSlash(process.env.BACKEND_BASE_URL || 'https://pva-backend-api.vercel.app');
  const headers = buildAuthHeaders();

  console.log(`Running Telegram/OpenClaw/Ollama smoke checks against ${baseUrl}`);

  try {
    const status = await checkOpenClawStatus(baseUrl, headers);
    await checkTelegramWebhookHealth(baseUrl);
    await checkTelegramDiagnostics(baseUrl, headers);
    await registerWebhookIfRequested(baseUrl, headers);
    await checkOllamaDirect();

    const services = status?.ecosystem?.services || {};
    const ollamaStatus = services?.ollama?.status || 'unknown';
    const telegramStatus = services?.telegram?.status || 'unknown';
    console.log(`summary: telegram=${telegramStatus} ollama=${ollamaStatus}`);
    console.log('Smoke checks completed.');
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data || err?.message || err;
    console.error(`Smoke checks failed${status ? ` (HTTP ${status})` : ''}`);
    console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
    process.exit(1);
  }
}

main();
