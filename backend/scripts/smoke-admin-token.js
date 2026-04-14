#!/usr/bin/env node
const dotenv = require('dotenv');
const http = require('http');

// Load test environment
dotenv.config({ path: '.env.local' });

// Start minimal test server
process.env.USE_MEMORY_DB = 'true';
const app = require('../api/index');

const server = http.createServer(app);
const PORT = 5555;

async function makeRequest(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting admin token smoke tests...\n');
  
  // Start server
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`✓ Test server listening on :${PORT}\n`);
  
  let token = null;
  
  try {
    // Test 1: POST /api/admin/token with correct secret
    const secret = process.env.ADMIN_SECRET_CODE || 'test-admin-secret-code';
    const res1 = await makeRequest('POST', '/api/admin/token', { secret });
    
    if (res1.status === 200 && res1.body.token) {
      token = res1.body.token;
      console.log('✅ POST /api/admin/token → 200 + token');
      console.log('   Token:', `${token.substring(0, 30)  }...\n`);
    } else {
      console.log('❌ POST /api/admin/token failed:', res1.status, res1.body);
      process.exit(1);
    }
    
    // Test 2: POST /api/admin/token with wrong secret
    const res2 = await makeRequest('POST', '/api/admin/token', { secret: 'wrong' });
    if (res2.status === 401) {
      console.log('✅ POST /api/admin/token with wrong secret → 401\n');
    } else {
      console.log('❌ Wrong secret should return 401, got:', res2.status);
    }
    
    // Test 3: POST /api/archive with token
    const entry = {
      title: 'Test Entry from Smoke Test',
      date: '2026-01-03',
      contentHtml: '<p>Test content</p>',
      excerpt: 'Test excerpt',
      tags: ['test'],
      category: 'journal',
    };
    
    const res3 = await makeRequest('POST', '/api/archive', entry, {
      Authorization: `Bearer ${token}`,
    });
    
    if (res3.status === 201) {
      console.log('✅ POST /api/archive (with token) → 201 + created entry');
      console.log('   Created ID:', res3.body.id || res3.body._id, '\n');
    } else {
      console.log('❌ POST /api/archive failed:', res3.status, res3.body);
      process.exit(1);
    }
    
    // Test 4: GET /api/archive
    const res4 = await makeRequest('GET', '/api/archive');
    if (res4.status === 200 && Array.isArray(res4.body)) {
      const found = res4.body.find(e => e.title === 'Test Entry from Smoke Test');
      if (found) {
        console.log('✅ GET /api/archive includes created entry\n');
      } else {
        console.log('⚠️  GET /api/archive returned data but test entry not found\n');
      }
    } else {
      console.log('❌ GET /api/archive failed:', res4.status);
    }
    
    console.log('✅ All admin token tests passed!');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  server.close();
  process.exit(1);
});

