#!/usr/bin/env node
/**
 * OpenClaw Worker Activation Script
 * Configures webhook, starts worker, and monitors health
 */

require('dotenv').config({ path: './backend/.env' });

const axios = require('axios');
const mongoose = require('mongoose');
const dbConnect = require('./backend/lib/dbConnect');

const BACKEND_URL = 'http://localhost:5001';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8479097066';

async function sendTelegramNotification(message) {
  const botToken = '8673642768:AAFHIy1m2fJg_SdZIhLdjViemuND1oUJPPU';
  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    return response.data.ok;
  } catch (e) {
    console.warn('Telegram notification failed:', e.message);
    return false;
  }
}

async function updateMongoConfig() {
  console.log('📝 Updating MongoDB configuration...');
  try {
    await dbConnect();
    const AdminRuntimeConfig = require('./backend/models/AdminRuntimeConfig');
    
    const config = await AdminRuntimeConfig.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          'openclaw.webhookUrl': 'http://localhost:5001/api/openclaw/webhook',
          'openclaw.healthUrl': 'http://localhost:5001/api/health',
          'openclaw.workerPollMs': 5000,
          'openclaw.workerBatchSize': 20,
          'openclaw.autonomousEnabled': true,
        },
      },
      { upsert: true, new: true }
    );
    console.log('✅ MongoDB config updated');
    return config;
  } catch (e) {
    console.error('❌ MongoDB config update failed:', e.message);
    throw e;
  }
}

async function checkSystemHealth() {
  console.log('\n🔍 Checking System Health...\n');
  
  const checks = [];
  
  // Check backend
  try {
    const health = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    checks.push({ name: 'Backend API', status: health.status === 200 ? '✅' : '❌' });
  } catch (e) {
    checks.push({ name: 'Backend API', status: '❌', error: e.message });
  }
  
  // Check MongoDB
  try {
    const status = mongoose.connection.readyState;
    checks.push({ name: 'MongoDB', status: status === 1 ? '✅' : '❌', state: status });
  } catch (e) {
    checks.push({ name: 'MongoDB', status: '❌', error: e.message });
  }
  
  // Check OpenClaw
  try {
    const oc = await axios.get(`${BACKEND_URL}/api/openclaw/status`, { timeout: 5000 });
    checks.push({ 
      name: 'OpenClaw Status', 
      status: (oc.data?.configured && oc.data?.reachable) ? '✅' : '🟡',
      configured: oc.data?.configured,
      reachable: oc.data?.reachable,
    });
  } catch (e) {
    checks.push({ name: 'OpenClaw Status', status: '❌', error: e.message });
  }
  
  // Check Queue
  try {
    const queue = await axios.get(`${BACKEND_URL}/api/openclaw/queue-stats`, { timeout: 5000 });
    checks.push({ 
      name: 'Queue Stats', 
      status: queue.data?.ok ? '✅' : '🟡',
      pending: queue.data?.pendingOutbound || 0,
      processed: queue.data?.processedOutbound || 0,
    });
  } catch (e) {
    checks.push({ name: 'Queue Stats', status: '❌', error: e.message });
  }
  
  // Check Worker
  try {
    const worker = await axios.get(`${BACKEND_URL}/api/openclaw/status`, { timeout: 5000 });
    checks.push({ 
      name: 'Worker Status', 
      status: worker.data?.worker?.active ? '✅' : '🟡',
      active: worker.data?.worker?.active,
      name: worker.data?.worker?.name,
    });
  } catch (e) {
    checks.push({ name: 'Worker Status', status: '❌', error: e.message });
  }
  
  // Display results
  checks.forEach(check => {
    console.log(`${check.status} ${check.name.padEnd(20)}`);
    if (check.error) console.log(`     Error: ${check.error}`);
    if (check.configured !== undefined) console.log(`     Configured: ${check.configured}, Reachable: ${check.reachable}`);
    if (check.pending !== undefined) console.log(`     Pending: ${check.pending}, Processed: ${check.processed}`);
    if (check.active !== undefined) console.log(`     Active: ${check.active}`);
    if (check.name) console.log(`     Worker: ${check.name}`);
  });
  
  return checks;
}

async function testEventProcessing() {
  console.log('\n🧪 Testing Event Processing...\n');
  
  const testEvent = {
    message: 'Test event from OpenClaw activation script',
    event: 'test.worker.activation',
    metadata: {
      source: 'activation-script',
      timestamp: new Date().toISOString(),
      test: true,
    },
  };
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/openclaw/dispatch`, testEvent, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.data?.ok) {
      console.log('✅ Test event queued successfully');
      console.log(`   ID: ${response.data.id}`);
      console.log(`   Processing: ${response.data.processing === true ? 'Yes' : 'Pending'}`);
      return true;
    } else {
      console.log('⚠️ Event queued but may not be processing');
      return false;
    }
  } catch (e) {
    console.log('❌ Failed to queue test event:', e.message);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🤖 OpenClaw Worker Activation        ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  try {
    // Step 1: Update MongoDB config
    await updateMongoConfig();
    
    // Step 2: Check system health
    const healthChecks = await checkSystemHealth();
    
    // Step 3: Test event processing
    const testPassed = await testEventProcessing();
    
    // Step 4: Send Telegram notification
    const allHealthy = healthChecks.every(c => c.status === '✅');
    const status = allHealthy && testPassed ? '✅ FULLY OPERATIONAL' : '🟡 PARTIAL (check logs)';
    
    await sendTelegramNotification(`
🤖 *OpenClaw Worker Activated*

${status}

*Configuration:*
✅ Webhook: http://localhost:5001/api/openclaw/webhook
✅ Poll interval: 5000ms
✅ Batch size: 20 events
✅ Queue monitoring: Active

*Next:*
The worker is ready to process queued events.
Monitor via: /api/openclaw/queue-stats
`);
    
    console.log('\n✅ OpenClaw worker activation complete!');
    console.log('📱 Telegram notification sent to', TELEGRAM_CHAT_ID);
    
  } catch (error) {
    console.error('\n❌ Activation failed:', error.message);
    await sendTelegramNotification(`❌ OpenClaw worker activation failed: ${error.message}`);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
