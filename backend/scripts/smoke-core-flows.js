#!/usr/bin/env node
const dotenv = require('dotenv');
const http = require('http');
const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

dotenv.config({ path: '.env.local' });
process.env.USE_MEMORY_DB = 'true';
process.env.DEV_AUTO_SEED = 'false';
process.env.LEGACY_MODE = 'false';
process.env.USE_VECTOR_DB = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-secret';
process.env.STREAM_WEBHOOK_SECRET = process.env.STREAM_WEBHOOK_SECRET || 'smoke-webhook-secret';

const PORT = 5560;
let server;
let mongoServer;

function makeRequest(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, body: data, headers: res.headers });
          }
        });
      },
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(cond, message) {
  if (!cond) {
    throw new Error(message);
  }
}

async function run() {
  // Always use an isolated in-memory MongoDB for smoke tests.
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('pvabazaar-smoke');

  const app = require('../api/index');
  server = http.createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`✓ smoke server started on :${PORT}`);

  try {
    // 1) Health
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.body.ok, 'Health check failed');
    console.log('✅ health ok');

    // 1b) Ping/version metadata endpoints
    const ping = await makeRequest('GET', '/api/ping');
    assert(ping.status === 200 && ping.body.ok, `Ping failed: ${ping.status}`);
    assert(typeof ping.body.shortSha === 'string' && ping.body.shortSha.length > 0, 'Ping shortSha missing');
    assert(ping.headers && ping.headers['x-app-version'], 'Ping X-App-Version header missing');
    console.log('✅ ping/version header ok');

    const version = await makeRequest('GET', '/api/version');
    assert(version.status === 200 && version.body.ok, `Version failed: ${version.status}`);
    assert(typeof version.body.sha === 'string' && version.body.sha.length > 0, 'Version sha missing');
    assert(typeof version.body.shortSha === 'string' && version.body.shortSha.length > 0, 'Version shortSha missing');
    console.log('✅ version metadata ok');

    // 2) Auth register + login
    const stamp = Date.now();
    const email = `smoke-${stamp}@example.com`;
    const password = 'smoke123';
    const name = 'Smoke User';

    const reg = await makeRequest('POST', '/api/auth/register', { name, email, password });
    assert(reg.status === 201 && reg.body.ok, `Register failed: ${reg.status}`);
    assert(reg.body.token, 'Register token missing');
    console.log('✅ register ok');

    const login = await makeRequest('POST', '/api/auth/login', { email, password });
    assert(login.status === 200 && login.body.ok, `Login failed: ${login.status}`);
    const token = login.body.token;
    assert(token, 'Login token missing');
    console.log('✅ login ok');

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 3) Item registration
    const item = await makeRequest(
      'POST',
      '/api/items/register',
      {
        title: 'Smoke Item',
        description: 'Smoke item description',
        price: 12.34,
        category: 'art',
        condition: 'used',
      },
      authHeaders,
    );
    assert(item.status === 201 && item.body.ok, `Item register failed: ${item.status}`);
    assert(item.body.item && item.body.item.status === 'draft', 'Item should be draft');
    console.log('✅ item registration ok');

    // 4) Oracle assessment create
    const oracle = await makeRequest(
      'POST',
      '/api/oracle/assessment',
      {
        personalData: {
          fullName: 'Smoke User',
          birthDate: '1990-01-01',
          birthTime: '12:00',
          birthPlace: 'Smoke City',
        },
        spiritualProfile: {
          meditation: true,
          spiritualPractices: ['Yoga'],
        },
      },
      authHeaders,
    );
    assert(oracle.status === 202 && oracle.body.ok, `Oracle create failed: ${oracle.status}`);
    assert(oracle.body.assessment && oracle.body.assessment.id, 'Oracle assessment id missing');
    console.log('✅ oracle create ok');

    // 5) Stream create
    const streamCreate = await makeRequest(
      'POST',
      '/api/streams',
      { title: 'Smoke Stream', platform: 'none' },
      authHeaders,
    );
    assert(streamCreate.status === 201 && streamCreate.body.ok, `Stream create failed: ${streamCreate.status}`);
    const streamId = streamCreate.body.item._id;
    assert(streamId, 'Stream id missing');
    console.log('✅ stream create ok');

    // 6) Signed webhook on stream
    const webhookPayload = { event: 'stream.online', source: 'smoke' };
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = crypto
      .createHmac('sha256', process.env.STREAM_WEBHOOK_SECRET)
      .update(`${ts}.${JSON.stringify(webhookPayload)}`)
      .digest('hex');

    const hook = await makeRequest('POST', `/api/streams/${streamId}/webhook`, webhookPayload, {
      'x-webhook-signature': sig,
      'x-webhook-timestamp': ts,
    });
    assert(hook.status === 200 && hook.body.ok, `Webhook failed: ${hook.status}`);
    console.log('✅ stream signed webhook ok');

    // 7) Fetch stream and confirm live
    const streamRead = await makeRequest('GET', `/api/streams/${streamId}`, null, authHeaders);
    assert(streamRead.status === 200 && streamRead.body.ok, `Stream fetch failed: ${streamRead.status}`);
    assert(streamRead.body.item.status === 'live', 'Stream should be live after webhook');
    console.log('✅ stream status transition ok');

    console.log('\n🎉 smoke-core-flows passed');
  } finally {
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) await mongoServer.stop();
  }
}

run().catch(err => {
  console.error('❌ smoke-core-flows failed:', err.message);
  process.exit(1);
});

