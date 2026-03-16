const axios = require('axios');
const db = require('./db');

function toBool(v) {
  return v === true || v === 'true' || v === '1';
}

async function checkDatabase() {
  try {
    const row = db.prepare('SELECT 1 as ok').get();
    return Boolean(row && row.ok === 1);
  } catch (_) {
    return false;
  }
}

async function checkBlockchain() {
  const rpcUrl = String(process.env.RPC_URL || '').trim();
  if (!rpcUrl) return false;

  try {
    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      },
      { timeout: 8000 },
    );
    return Boolean(response?.data?.result);
  } catch (_) {
    return false;
  }
}

async function checkIpfs() {
  const pinataJwt = String(process.env.PINATA_JWT || '').trim();
  const pinataKey = String(process.env.PINATA_API_KEY || '').trim();
  const pinataSecret = String(process.env.PINATA_SECRET_KEY || '').trim();

  if (!pinataJwt && !(pinataKey && pinataSecret)) {
    return false;
  }

  try {
    const headers = pinataJwt
      ? { Authorization: `Bearer ${pinataJwt}` }
      : { pinata_api_key: pinataKey, pinata_secret_api_key: pinataSecret };

    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers,
      timeout: 8000,
    });

    return response.status >= 200 && response.status < 300;
  } catch (_) {
    return false;
  }
}

async function checkExternalApis() {
  const urls = [
    process.env.EBAY_LISTING_WEBHOOK_URL,
    process.env.AMAZON_LISTING_WEBHOOK_URL,
    process.env.ETSY_LISTING_WEBHOOK_URL,
  ].filter(Boolean);

  if (urls.length === 0) {
    // No external providers configured yet.
    return toBool(process.env.ALLOW_MISSING_EXTERNAL_APIS || true);
  }

  // External checks are non-blocking: verify URL structure only,
  // since many providers require signed payloads for health pings.
  return urls.every((url) => /^https?:\/\//i.test(String(url)));
}

async function healthCheck() {
  const checks = {
    database: await checkDatabase(),
    blockchain: await checkBlockchain(),
    ipfs: await checkIpfs(),
    externalAPIs: await checkExternalApis(),
  };

  const allHealthy = Object.values(checks).every((v) => v === true);

  if (!allHealthy) {
    console.warn('[health] System degraded', checks);
  } else {
    console.log('[health] System healthy', checks);
  }

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    checkedAt: new Date().toISOString(),
  };
}

if (require.main === module) {
  healthCheck();
  setInterval(healthCheck, 5 * 60 * 1000);
}

module.exports = healthCheck;
