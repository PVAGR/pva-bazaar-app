const axios = require('axios');

function trim(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

async function main() {
  const ollamaBaseUrl = trim(process.env.OLLAMA_BASE_URL || process.env.OPENCLAW_OLLAMA_BASE_URL || '');
  const ollamaModel = String(process.env.OLLAMA_MODEL || process.env.OPENCLAW_OLLAMA_MODEL || 'llama3.1').trim();
  const backendBaseUrl = trim(process.env.OPENCLAW_BACKEND_URL || process.env.BACKEND_BASE_URL || 'https://api.pvabazaar.org');
  const bridgeSecret = String(process.env.OPENCLAW_BRIDGE_SECRET || '').trim();

  console.log(`backendBaseUrl=${backendBaseUrl}`);
  console.log(`ollamaBaseUrl=${ollamaBaseUrl || 'not-set'}`);
  console.log(`ollamaModel=${ollamaModel}`);

  if (!ollamaBaseUrl) {
    console.log('OLLAMA_BASE_URL is not set; skipping direct model check.');
  } else {
    try {
      const version = await axios.get(`${ollamaBaseUrl}/api/version`, { timeout: 15000 });
      console.log(`ollamaVersionCheck=ok status=${version.status} version=${version.data?.version || 'unknown'}`);
    } catch (err) {
      console.log(`ollamaVersionCheck=failed status=${err?.response?.status || 'n/a'} detail=${(err?.response?.data?.error || err.message || 'unknown').toString().slice(0, 240)}`);
    }

    try {
      const chat = await axios.post(
        `${ollamaBaseUrl}/api/chat`,
        {
          model: ollamaModel,
          stream: false,
          messages: [
            { role: 'system', content: 'You are a concise assistant.' },
            { role: 'user', content: 'Reply with one sentence confirming connectivity.' },
          ],
          options: { temperature: 0.2 },
        },
        { timeout: 60000, headers: { 'Content-Type': 'application/json' } },
      );

      const text = String(chat.data?.message?.content || chat.data?.response || '').trim();
      console.log(`ollamaChatCheck=ok status=${chat.status}`);
      console.log(`ollamaReply=${text.slice(0, 300) || 'empty'}`);
    } catch (err) {
      const detail = err?.response?.data || err.message || 'unknown';
      console.log(`ollamaChatCheck=failed status=${err?.response?.status || 'n/a'} detail=${(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300)}`);
    }
  }

  try {
    const headers = {};
    if (bridgeSecret) {
      headers['x-openclaw-secret'] = bridgeSecret;
    }

    const status = await axios.get(`${backendBaseUrl}/api/openclaw/status`, {
      timeout: 15000,
      headers,
    });

    const payload = status.data || {};
    console.log(`openclawStatus=ok mode=${payload.mode || 'unknown'} webhookConfigured=${Boolean(payload.webhookConfigured)} message=${String(payload.message || '').slice(0, 180)}`);
  } catch (err) {
    console.log(`openclawStatus=failed status=${err?.response?.status || 'n/a'} detail=${(err?.response?.data?.message || err.message || 'unknown').toString().slice(0, 240)}`);
  }
}

main().catch((err) => {
  console.error(`fatal=${(err?.message || err).toString().slice(0, 300)}`);
  process.exit(1);
});
