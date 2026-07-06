#!/usr/bin/env node
const dotenv = require('dotenv');
const http = require('http');

// Load test environment with LEGACY_MODE=false
dotenv.config({ path: '.env.local' });
process.env.LEGACY_MODE = 'false';
process.env.USE_MEMORY_DB = 'true';

const app = require('../api/index');
const server = http.createServer(app);
const PORT = 5556;

async function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing LEGACY_MODE gating (LEGACY_MODE=false)...\n');

  // Start server
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`✓ Test server listening on :${PORT}\n`);

  try {
    // Test 1: /api/health should work (always active)
    const res1 = await makeRequest('GET', '/api/health');
    if (res1.status === 200) {
      console.log('✅ /api/health → 200 (journal endpoint active)\n');
    } else {
      console.log('❌ /api/health failed:', res1.status);
      process.exit(1);
    }

    // Test 2: /api/archive should work (always active)
    const res2 = await makeRequest('GET', '/api/archive');
    if (res2.status === 200) {
      console.log('✅ /api/archive → 200 (journal endpoint active)\n');
    } else {
      console.log('❌ /api/archive failed:', res2.status);
      process.exit(1);
    }

    // Test 3: /api/artifacts should return 410 (legacy, gated)
    const res3 = await makeRequest('GET', '/api/artifacts');
    if (res3.status === 410 && res3.body.message.includes('retired')) {
      console.log('✅ /api/artifacts → 410 Gone (legacy endpoint gated)\n');
      console.log('   Message:', res3.body.message);
      console.log('   Migration:', res3.body.migration, '\n');
    } else {
      console.log('❌ /api/artifacts should return 410, got:', res3.status);
      process.exit(1);
    }

    // Test 4: /api/market should return 410 (legacy, gated)
    const res4 = await makeRequest('GET', '/api/market/stats');
    if (res4.status === 410) {
      console.log('✅ /api/market/stats → 410 Gone (legacy endpoint gated)\n');
    } else {
      console.log('❌ /api/market should return 410, got:', res4.status);
      process.exit(1);
    }

    console.log('✅ All LEGACY_MODE gating tests passed!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  server.close();
  process.exit(1);
});
