// backend/scripts/monitor-production.js - Production monitoring & health verification
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:5001';
const MONITOR_INTERVAL = process.env.MONITOR_INTERVAL || 30000; // 30 seconds
const LOG_FILE = path.join(__dirname, '../../logs/monitor.log');

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const endpoints = [
  '/api/health',
  '/api/health-check',
  '/api/health-check/endpoints',
  '/api/health-check/test',
  '/api/openapi.json',
  '/api/docs',
  '/api/version',
];

const lastStatus = {};
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level} ${message}\n`;
  console.log(logEntry);
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Error writing to log:', err.message);
  }
}

function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, API_URL);
    const startTime = Date.now();

    const request = http.get(url, { timeout: 5000 }, (res) => {
      const responseTime = Date.now() - startTime;
      const status = res.statusCode;
      
      resolve({
        endpoint,
        status,
        success: status >= 200 && status < 300,
        responseTime,
        timestamp: new Date().toISOString(),
      });
    });

    request.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: err.message,
        responseTime,
        timestamp: new Date().toISOString(),
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: 'Timeout',
        responseTime: 5000,
        timestamp: new Date().toISOString(),
      });
    });
  });
}

async function monitor() {
  log('🔍 Starting health checks...');

  const results = await Promise.all(endpoints.map(checkEndpoint));
  const allHealthy = results.every((r) => r.success);

  // Log results
  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const msg = `${icon} ${result.endpoint} - ${result.status || 'NO_RESPONSE'} (${result.responseTime}ms)`;
    log(msg, result.success ? 'INFO' : 'ERROR');
  });

  // Statistics
  const healthy = results.filter((r) => r.success).length;
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );

  if (allHealthy) {
    consecutiveFailures = 0;
    log(`✅ All systems healthy (${healthy}/${results.length}) - Avg: ${avgResponseTime}ms`);
  } else {
    consecutiveFailures++;
    log(`⚠️ Some endpoints down (${healthy}/${results.length}) - Failures: ${consecutiveFailures}/${MAX_FAILURES}`, 'WARN');

    if (consecutiveFailures >= MAX_FAILURES) {
      log(`❌ CRITICAL: ${consecutiveFailures} consecutive failures!`, 'ERROR');
      consecutiveFailures = 0; // Reset for next cycle
    }
  }

  // Write status file
  fs.writeFileSync(
    path.join(logsDir, 'status.json'),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        healthy: allHealthy,
        endpoints_healthy: healthy,
        total_endpoints: results.length,
        avg_response_time: avgResponseTime,
        results,
      },
      null,
      2
    )
  );

  log('✅ Health check cycle complete\n');
}

// Run monitor
log('🚀 Production Monitor Started');
log(`Monitoring ${API_URL} every ${MONITOR_INTERVAL}ms`);
log(`Endpoints: ${endpoints.join(', ')}`);
log('━'.repeat(60));

// Initial check
monitor().catch((err) => log(`Monitor error: ${err.message}`, 'ERROR'));

// Recurring checks
setInterval(monitor, MONITOR_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  log('📍 Monitor shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('📍 Monitor interrupted by user');
  process.exit(0);
});
