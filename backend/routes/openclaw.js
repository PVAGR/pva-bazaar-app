const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function readLastLines(filePath, maxLines = 200) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw) {
    return [];
  }

  const lines = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length <= maxLines) {
    return lines;
  }

  return lines.slice(lines.length - maxLines);
}

function extractLatestLine(lines, token) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].includes(token)) {
      return lines[index];
    }
  }
  return null;
}

function parseTimestamp(line) {
  if (!line) return null;
  const match = line.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

function buildWatchdogSummary(logLines, alertLines) {
  const latestError = extractLatestLine(logLines, '[ERROR]');
  const latestWarn = extractLatestLine(logLines, '[WARN]');
  const latestRecovery = extractLatestLine(logLines, 'watchdog recovered');
  const latestStatus = extractLatestLine(logLines, 'status configured=');
  const latestDispatch = extractLatestLine(logLines, 'dispatch forwarded=');
  const latestAlert = alertLines.length ? alertLines[alertLines.length - 1] : null;

  const hasRecentError = Boolean(latestError);
  const state = hasRecentError ? 'degraded' : 'ok';

  return {
    state,
    latestStatus,
    latestDispatch,
    latestError,
    latestWarn,
    latestRecovery,
    latestAlert,
    lastEventAt:
      parseTimestamp(latestAlert) ||
      parseTimestamp(latestError) ||
      parseTimestamp(latestStatus) ||
      null,
    errorCountWindow: logLines.filter(line => line.includes('[ERROR]')).length,
    warnCountWindow: logLines.filter(line => line.includes('[WARN]')).length,
    alertCountWindow: alertLines.length,
  };
}

function resolveWatchdogPaths() {
  const defaultLog = path.join(process.cwd(), 'infra', 'openclaw', 'logs', 'watchdog.log');
  const defaultAlert = path.join(process.cwd(), 'infra', 'openclaw', 'logs', 'watchdog.alert.log');

  return {
    logPath: process.env.OPENCLAW_WATCHDOG_LOG_PATH || defaultLog,
    alertPath: process.env.OPENCLAW_WATCHDOG_ALERT_PATH || defaultAlert,
  };
}

function getConfig() {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || '';
  const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL || '';
  const healthUrl = process.env.OPENCLAW_HEALTH_URL ||
    (gatewayUrl ? `${gatewayUrl.replace(/\/$/, '')}/health` : '');
  const apiKey = process.env.OPENCLAW_API_KEY || '';
  const bridgeSecret = process.env.OPENCLAW_BRIDGE_SECRET || '';

  return {
    gatewayUrl,
    webhookUrl,
    healthUrl,
    apiKey,
    bridgeSecret,
    configured: Boolean(webhookUrl || gatewayUrl),
  };
}

function isAuthorized(req, bridgeSecret) {
  if (!bridgeSecret) return true;
  const candidate = req.headers['x-openclaw-secret'];
  return typeof candidate === 'string' && candidate === bridgeSecret;
}

router.get('/status', async (_req, res) => {
  const config = getConfig();

  if (!config.configured) {
    return res.json({
      ok: true,
      configured: false,
      reachable: false,
      message: 'OpenClaw is not configured. Set OPENCLAW_GATEWAY_URL or OPENCLAW_WEBHOOK_URL.',
      timestamp: new Date().toISOString(),
    });
  }

  let reachable = false;
  let detail = null;

  if (config.healthUrl) {
    try {
      const headers = {};
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
      const result = await axios.get(config.healthUrl, {
        headers,
        timeout: 6000,
      });
      reachable = result.status >= 200 && result.status < 500;
    } catch (err) {
      detail = err?.response?.data || err.message;
    }
  }

  res.json({
    ok: true,
    configured: true,
    reachable,
    gatewayUrl: config.gatewayUrl || null,
    webhookUrlConfigured: Boolean(config.webhookUrl),
    timestamp: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  });
});

router.get('/watchdog-status', (_req, res) => {
  const { logPath, alertPath } = resolveWatchdogPaths();

  const logLines = readLastLines(logPath, 400);
  const alertLines = readLastLines(alertPath, 120);

  if (!logLines.length && !alertLines.length) {
    return res.json({
      ok: true,
      available: false,
      message: 'No watchdog logs found yet',
      paths: {
        logPath,
        alertPath,
      },
      timestamp: new Date().toISOString(),
    });
  }

  const summary = buildWatchdogSummary(logLines, alertLines);

  return res.json({
    ok: true,
    available: true,
    summary,
    paths: {
      logPath,
      alertPath,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/recent-events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const { logPath, alertPath } = resolveWatchdogPaths();

  const logLines = readLastLines(logPath, limit);
  const alertLines = readLastLines(alertPath, Math.floor(limit / 2));

  if (!logLines.length && !alertLines.length) {
    return res.json({
      ok: true,
      available: false,
      events: [],
      message: 'No watchdog activity logs found',
      timestamp: new Date().toISOString(),
    });
  }

  // Parse log lines into structured events
  const events = logLines.map((line, idx) => {
    const timestampMatch = line.match(/^\[([^\]]+)\]/);
    const timestamp = timestampMatch ? timestampMatch[1] : null;
    
    let level = 'INFO';
    if (line.includes('[ERROR]')) level = 'ERROR';
    else if (line.includes('[WARN]')) level = 'WARN';
    else if (line.includes('[SUCCESS]')) level = 'SUCCESS';
    
    let type = 'general';
    if (line.includes('status configured=')) type = 'status-check';
    else if (line.includes('dispatch forwarded=')) type = 'dispatch';
    else if (line.includes('watchdog recovered')) type = 'recovery';
    else if (line.includes('health check failed')) type = 'health-failure';
    
    return {
      id: `log-${idx}`,
      timestamp,
      level,
      type,
      message: line,
      source: 'watchdog-log'
    };
  });

  // Add alert events
  alertLines.forEach((line, idx) => {
    const timestampMatch = line.match(/^\[([^\]]+)\]/);
    events.push({
      id: `alert-${idx}`,
      timestamp: timestampMatch ? timestampMatch[1] : null,
      level: 'ALERT',
      type: 'alert',
      message: line,
      source: 'alert-log'
    });
  });

  // Sort by timestamp (most recent first)
  events.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return res.json({
    ok: true,
    available: true,
    events: events.slice(0, limit),
    count: events.length,
    timestamp: new Date().toISOString(),
  });
});

router.post('/dispatch', async (req, res) => {
  const config = getConfig();

  if (!isAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized OpenClaw dispatch request',
    });
  }

  if (!config.webhookUrl) {
    return res.status(400).json({
      ok: false,
      message: 'OPENCLAW_WEBHOOK_URL is required for dispatch',
    });
  }

  const { message, event, metadata } = req.body || {};

  if (!message && !event) {
    return res.status(400).json({
      ok: false,
      message: 'Provide at least one of: message, event',
    });
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const payload = {
      source: 'pvabazaar-backend',
      message: message || null,
      event: event || 'pvabazaar.dispatch',
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    const forward = await axios.post(config.webhookUrl, payload, {
      headers,
      timeout: 12000,
    });

    return res.json({
      ok: true,
      forwarded: true,
      status: forward.status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const status = err?.response?.status || 502;
    return res.status(status).json({
      ok: false,
      forwarded: false,
      message: 'Failed to forward to OpenClaw webhook',
      detail: err?.response?.data || err.message,
    });
  }
});

// Lightweight health check for inclusion in main health endpoint
function getOpenClawHealth() {
  const config = getConfig();
  
  if (!config.configured) {
    return { 
      configured: false, 
      status: 'not-configured',
      message: 'OpenClaw not configured'
    };
  }

  const paths = resolveWatchdogPaths();
  
  // Quick file existence check
  const logExists = fs.existsSync(paths.logPath);
  const alertExists = fs.existsSync(paths.alertPath);
  
  if (!logExists) {
    return {
      configured: true,
      status: 'no-logs',
      message: 'Watchdog logs not found',
      paths: { log: paths.logPath, alert: paths.alertPath }
    };
  }

  try {
    // Quick summary without reading all lines
    const logLines = readLastLines(paths.logPath, 50);
    const alertLines = alertExists ? readLastLines(paths.alertPath, 20) : [];
    
    const recentErrors = logLines.filter(l => l.includes('[ERROR]')).length;
    const recentWarns = logLines.filter(l => l.includes('[WARN]')).length;
    const status = recentErrors > 5 ? 'unhealthy' : recentErrors > 0 ? 'degraded' : 'healthy';
    
    return {
      configured: true,
      status,
      errors: recentErrors,
      warnings: recentWarns,
      alerts: alertLines.length,
      message: `OpenClaw ${status} (${recentErrors} errors, ${recentWarns} warnings)`
    };
  } catch (err) {
    return {
      configured: true,
      status: 'error',
      message: `Failed to read watchdog logs: ${err.message}`
    };
  }
}

module.exports = router;
module.exports.getOpenClawHealth = getOpenClawHealth;
