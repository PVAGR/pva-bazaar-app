const axios = require('axios');

async function main() {
  // Default to production so smoke checks work even when no local backend is running.
  const backendBaseUrl = (process.env.BACKEND_BASE_URL || 'https://api.pvabazaar.org').replace(/\/$/, '');
  const bridgeSecret = process.env.OPENCLAW_BRIDGE_SECRET || '';
  const doDispatch = process.env.OPENCLAW_TEST_DISPATCH === 'true';
  const message = process.env.OPENCLAW_TEST_MESSAGE || 'PVA Bazaar OpenClaw bridge connectivity test';

  console.log(`🔎 Checking OpenClaw bridge status via ${backendBaseUrl}/api/openclaw/status`);

  try {
    const statusResponse = await axios.get(`${backendBaseUrl}/api/openclaw/status`, {
      timeout: 10000,
    });

    console.log('✅ Status endpoint reachable');
    console.log(JSON.stringify(statusResponse.data, null, 2));

    if (!doDispatch) {
      console.log('ℹ️ Dispatch test skipped. Set OPENCLAW_TEST_DISPATCH=true to run it.');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (bridgeSecret) {
      headers['X-OpenClaw-Secret'] = bridgeSecret;
    }

    console.log(`📨 Sending dispatch test via ${backendBaseUrl}/api/openclaw/dispatch`);

    const dispatchResponse = await axios.post(
      `${backendBaseUrl}/api/openclaw/dispatch`,
      {
        event: 'pvabazaar.smoke_test',
        message,
        metadata: {
          source: 'backend/scripts/smoke-openclaw.js',
          timestamp: new Date().toISOString(),
        },
      },
      {
        headers,
        timeout: 15000,
      },
    );

    console.log('✅ Dispatch test response');
    console.log(JSON.stringify(dispatchResponse.data, null, 2));
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data || err.message;
    console.error('❌ OpenClaw smoke test failed', status ? `(HTTP ${status})` : '');
    console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
    process.exit(1);
  }
}

main();
