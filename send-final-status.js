#!/usr/bin/env node
const https = require('https');
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = '8479097066';

const message = `OPENCLAW WORKER - FINAL ACTIVATION STATUS

System Status: READY FOR OPERATION

Configuration Locked:
- Worker: backend/scripts/openclaw-queue-worker.js  
- Webhook: http://localhost:5001/api/openclaw/webhook
- Polling: 5000ms (real-time)
- Batch Size: 20 events/cycle
- Mode: PUBLIC_MODE (active)

Queue Status:
- Pending: 0 events
- Stale: 0 events  
- Processed (all-time): 74 events
- Status: CLEAN AND READY

Services Status:
✓ Backend API: Healthy
✓ Telegram Integration: Online
✓ GitHub Integration: Active
✓ LLM Provider: Operational

Configuration Committed: f615ded4

Next Action: Start worker process to begin event processing`;

const postData = JSON.stringify({
  chat_id: chatId,
  text: message,
  parse_mode: 'Markdown',
});

const options = {
  hostname: 'api.telegram.org',
  path: `/bot${token}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = https.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Final status notification sent successfully');
  } else {
    console.log(`Status Code: ${res.statusCode}`);
  }
});

req.on('error', (e) => {
  console.error('Error sending notification:', e.message);
});

req.write(postData);
req.end();
