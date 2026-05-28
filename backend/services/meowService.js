const crypto = require('crypto');

function getMeowConfig() {
  const mode = String(process.env.MEOW_ENV || 'sandbox').toLowerCase();
  const isProd = mode === 'production';
  const baseUrl = process.env.MEOW_BASE_URL
    || (isProd ? 'https://api.meow.com/v1' : 'https://api.sandbox.meow.com/v1');

  return {
    enabled: process.env.MEOW_ENABLED === 'true',
    env: isProd ? 'production' : 'sandbox',
    baseUrl: String(baseUrl).replace(/\/+$/, ''),
    apiKey: process.env.MEOW_API_KEY || '',
    entityId: process.env.MEOW_ENTITY_ID || '',
    accountId: process.env.MEOW_ACCOUNT_ID || '',
    webhookSecret: process.env.MEOW_WEBHOOK_SECRET || '',
  };
}

function authHeaders(config) {
  const headers = {
    'x-api-key': config.apiKey,
    'content-type': 'application/json',
  };
  if (config.entityId) {
    headers['x-entity-id'] = config.entityId;
  }
  return headers;
}

function assertConfigured(config) {
  if (!config.enabled) {
    const err = new Error('MEOW integration is disabled');
    err.status = 503;
    throw err;
  }
  if (!config.apiKey) {
    const err = new Error('MEOW_API_KEY is missing');
    err.status = 500;
    throw err;
  }
}

function safeError(error) {
  const status = error?.response?.status || error?.status || 500;
  const payload = error?.response?.data || null;
  return {
    status,
    message: error?.message || 'Meow request failed',
    payload,
  };
}

async function requestMeow(config, method, path, body = undefined, params = undefined) {
  assertConfigured(config);
  const url = new URL(`${config.baseUrl}${path}`);
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  try {
    const response = await fetch(url, {
      method,
      headers: authHeaders(config),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const err = new Error(`Meow API ${response.status}`);
      err.status = response.status;
      err.payload = data;
      throw err;
    }
    return data;
  } catch (error) {
    const details = safeError(error);
    const err = new Error(details.message);
    err.status = details.status;
    err.payload = details.payload;
    throw err;
  }
}

async function listAccounts(config) {
  return requestMeow(config, 'get', '/accounts');
}

async function getBalances(config, accountId) {
  const id = accountId || config.accountId;
  if (!id) {
    const err = new Error('MEOW_ACCOUNT_ID or accountId is required');
    err.status = 400;
    throw err;
  }
  return requestMeow(config, 'get', `/accounts/${id}/balances`);
}

async function listTransactions(config, accountId, query = {}) {
  const id = accountId || config.accountId;
  if (!id) {
    const err = new Error('MEOW_ACCOUNT_ID or accountId is required');
    err.status = 400;
    throw err;
  }
  return requestMeow(config, 'get', `/accounts/${id}/transactions`, undefined, query);
}

async function createUsdcTransfer(config, accountId, payload) {
  const id = accountId || config.accountId;
  if (!id) {
    const err = new Error('MEOW_ACCOUNT_ID or accountId is required');
    err.status = 400;
    throw err;
  }
  return requestMeow(config, 'post', `/accounts/${id}/usdc`, payload);
}

function verifyWebhookSignature({ config, rawBody, signatureHeader }) {
  if (!config.webhookSecret) return { ok: false, reason: 'missing_secret' };
  if (!rawBody || !signatureHeader) return { ok: false, reason: 'missing_payload_or_signature' };

  const expected = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(rawBody)
    .digest('hex');

  const incomingRaw = String(signatureHeader).trim();
  const candidates = [incomingRaw];
  if (incomingRaw.startsWith('sha256=')) {
    candidates.push(incomingRaw.slice('sha256='.length));
  }
  for (const part of incomingRaw.split(',')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('v1=')) candidates.push(trimmed.slice(3));
  }

  const normalized = candidates.map((v) => String(v || '').toLowerCase());
  const ok = normalized.some((v) => v === expected.toLowerCase());
  return { ok, expectedPrefix: expected.slice(0, 8) };
}

module.exports = {
  getMeowConfig,
  listAccounts,
  getBalances,
  listTransactions,
  createUsdcTransfer,
  verifyWebhookSignature,
};
