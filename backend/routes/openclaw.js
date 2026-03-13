const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const dbConnect = require('../lib/dbConnect');

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

  // Queue is always enabled — MongoDB is always connected in production.
  // Webhook/gateway are optional enhancements on top of the persistent queue.
  const queueEnabled = true;
  const webhookConfigured = Boolean(webhookUrl || gatewayUrl);

  return {
    gatewayUrl,
    webhookUrl,
    healthUrl,
    apiKey,
    bridgeSecret,
    queueEnabled,
    webhookConfigured,
    configured: true, // queue is always active
  };
}

function isAuthorized(req, bridgeSecret) {
  if (!bridgeSecret) return true;
  const candidate = req.headers['x-openclaw-secret'];
  return typeof candidate === 'string' && candidate === bridgeSecret;
}

function isAdminAuthenticated(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token || !process.env.JWT_SECRET) return false;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded && decoded.role === 'admin';
  } catch (_err) {
    return false;
  }
}

function isBridgeOrAdminAuthorized(req, bridgeSecret) {
  return isAuthorized(req, bridgeSecret) || isAdminAuthenticated(req);
}

function requireBridgeOrAdmin(req, res, config, unauthorizedMessage) {
  if (isBridgeOrAdminAuthorized(req, config.bridgeSecret)) {
    return true;
  }

  res.status(401).json({
    ok: false,
    message: unauthorizedMessage,
  });
  return false;
}

async function getQueueStats() {
  await dbConnect();
  const OpenClawMessage = require('../models/OpenClawMessage');

  const staleMinutes = Math.max(parseInt(process.env.OPENCLAW_STALE_MINUTES || '30', 10), 1);
  const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

  const [
    pendingOutbound,
    processedOutbound,
    inboundCount,
    staleOutbound,
    oldestPending,
    latestInbound,
    latestOutbound,
  ] = await Promise.all([
    OpenClawMessage.countDocuments({ direction: 'outbound', processed: false }),
    OpenClawMessage.countDocuments({ direction: 'outbound', processed: true }),
    OpenClawMessage.countDocuments({ direction: 'inbound' }),
    OpenClawMessage.countDocuments({
      direction: 'outbound',
      processed: false,
      createdAt: { $lt: staleCutoff },
    }),
    OpenClawMessage.findOne({ direction: 'outbound', processed: false })
      .sort({ createdAt: 1 })
      .select({ _id: 1, createdAt: 1, event: 1 })
      .lean(),
    OpenClawMessage.findOne({ direction: 'inbound' })
      .sort({ createdAt: -1 })
      .select({ _id: 1, createdAt: 1, event: 1 })
      .lean(),
    OpenClawMessage.findOne({ direction: 'outbound' })
      .sort({ createdAt: -1 })
      .select({ _id: 1, createdAt: 1, event: 1 })
      .lean(),
  ]);

  return {
    pendingOutbound,
    processedOutbound,
    inboundCount,
    staleOutbound,
    staleMinutes,
    oldestPendingAt: oldestPending?.createdAt || null,
    oldestPendingEvent: oldestPending?.event || null,
    latestInboundAt: latestInbound?.createdAt || null,
    latestInboundEvent: latestInbound?.event || null,
    latestOutboundAt: latestOutbound?.createdAt || null,
    latestOutboundEvent: latestOutbound?.event || null,
  };
}

async function saveMessage(payload) {
  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const doc = await OpenClawMessage.create(payload);
    return doc;
  } catch (_err) {
    // Persistence is best-effort. OpenClaw bridge should still function if DB is unavailable.
    return null;
  }
}

router.get('/status', async (_req, res) => {
  const config = getConfig();

  // Probe external gateway if configured
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

  // Get a quick queue snapshot so the admin UI has real numbers
  let queue = null;
  try {
    queue = await getQueueStats();
  } catch (_err) {
    // best-effort
  }

  const mode = config.webhookConfigured ? 'webhook+queue' : 'queue-only';
  const statusMsg = config.webhookConfigured
    ? (reachable ? `Gateway reachable (${mode})` : `Gateway unreachable — events queued`)
    : `Queue-only mode — ${queue ? queue.pendingOutbound : '?'} pending`;

  res.json({
    ok: true,
    configured: true,
    queueEnabled: true,
    webhookConfigured: config.webhookConfigured,
    reachable,
    mode,
    message: statusMsg,
    gatewayUrl: config.gatewayUrl || null,
    queue: queue ? {
      pending: queue.pendingOutbound,
      stale: queue.staleOutbound,
      processed: queue.processedOutbound,
      inbound: queue.inboundCount,
      latestAt: queue.latestOutboundAt,
    } : null,
    timestamp: new Date().toISOString(),
    ...(detail ? { detail } : {}),
  });
});

router.get('/watchdog-status', async (_req, res) => {
  const { logPath, alertPath } = resolveWatchdogPaths();

  const logLines = readLastLines(logPath, 400);
  const alertLines = readLastLines(alertPath, 120);

  if (!logLines.length && !alertLines.length) {
    // In serverless deployments watchdog file logs may not exist.
    // Fall back to queue-backed health signals so the admin UI remains useful.
    try {
      const queue = await getQueueStats();
      const degraded = queue.staleOutbound > 0 || queue.pendingOutbound > 20;
      return res.json({
        ok: true,
        available: true,
        source: 'queue-store',
        summary: {
          state: degraded ? 'degraded' : 'ok',
          latestStatus: null,
          latestDispatch: queue.latestOutboundEvent || null,
          latestError: null,
          latestWarn: queue.staleOutbound > 0 ? `staleOutbound=${queue.staleOutbound}` : null,
          latestRecovery: null,
          latestAlert: null,
          lastEventAt: queue.latestInboundAt || queue.latestOutboundAt || null,
          errorCountWindow: 0,
          warnCountWindow: queue.staleOutbound > 0 ? 1 : 0,
          alertCountWindow: 0,
          queue,
        },
        message: 'Watchdog file logs not found; using queue-store fallback',
        paths: {
          logPath,
          alertPath,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (_err) {
      return res.json({
        ok: true,
        available: false,
        source: 'none',
        message: 'No watchdog logs found yet',
        paths: {
          logPath,
          alertPath,
        },
        timestamp: new Date().toISOString(),
      });
    }
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

router.get('/recent-events', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw recent-events request')) return;

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const { logPath, alertPath } = resolveWatchdogPaths();

  const logLines = readLastLines(logPath, limit);
  const alertLines = readLastLines(alertPath, Math.floor(limit / 2));

  if (!logLines.length && !alertLines.length) {
    // No file logs (expected on Vercel serverless) – serve from MongoDB queue
    try {
      await dbConnect();
      const OpenClawMessage = require('../models/OpenClawMessage');
      const messages = await OpenClawMessage.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      if (!messages.length) {
        return res.json({
          ok: true,
          available: false,
          source: 'queue-store',
          events: [],
          message: 'No OpenClaw events recorded yet',
          timestamp: new Date().toISOString(),
        });
      }

      const events = messages.map((msg) => ({
        id: msg._id.toString(),
        timestamp: msg.createdAt ? msg.createdAt.toISOString() : null,
        level: msg.direction === 'inbound' ? 'INFO' : 'SUCCESS',
        type: msg.direction === 'inbound' ? 'inbound' : 'dispatch',
        message: `[${msg.direction.toUpperCase()}] ${msg.event} — ${msg.content || ''}`.trim(),
        source: msg.source || 'queue-store',
        event: msg.event,
        direction: msg.direction,
        processed: msg.processed,
      }));

      return res.json({
        ok: true,
        available: true,
        source: 'queue-store',
        events,
        count: events.length,
        timestamp: new Date().toISOString(),
      });
    } catch (_err) {
      return res.json({
        ok: true,
        available: false,
        source: 'none',
        events: [],
        message: 'No watchdog activity logs found',
        timestamp: new Date().toISOString(),
      });
    }
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

  if (!isBridgeOrAdminAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized OpenClaw dispatch request',
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
    const storedOutbound = await saveMessage({
      direction: 'outbound',
      content: message || event,
      event: event || 'pvabazaar.dispatch',
      source: metadata?.source || 'openclaw-dispatch',
      processed: false,
      metadata: metadata || {},
    });

    if (!config.webhookUrl) {
      return res.json({
        ok: true,
        forwarded: false,
        queued: true,
        message: 'Message queued in OpenClaw store; webhook not configured',
        queuedMessageId: storedOutbound ? storedOutbound._id.toString() : null,
        timestamp: new Date().toISOString(),
      });
    }

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
      queued: true,
      status: forward.status,
      queuedMessageId: storedOutbound ? storedOutbound._id.toString() : null,
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

router.get('/messages', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw messages request')) return;

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');

    const limit = Math.min(parseInt(req.query.limit, 10) || 120, 300);
    const query = {};

    if (req.query.direction) {
      query.direction = req.query.direction;
    }

    if (req.query.unprocessed === 'true') {
      query.processed = false;
    }

    const messages = await OpenClawMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      message: 'Message store unavailable',
      error: err.message,
    });
  }
});

router.get('/queue-stats', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw queue stats request')) return;

  try {
    const stats = await getQueueStats();

    return res.json({
      ok: true,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      message: 'Failed to load OpenClaw queue stats',
      error: err.message,
    });
  }
});

router.post('/replay-webhook', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw replay request')) return;

  if (!config.webhookUrl) {
    return res.status(400).json({
      ok: false,
      message: 'OpenClaw webhook is not configured',
    });
  }

  const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 15, 1), 100);
  const dryRun = req.body?.dryRun === true;

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const pending = await OpenClawMessage.find({ direction: 'outbound', processed: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    if (!pending.length) {
      return res.json({
        ok: true,
        dryRun,
        attempted: 0,
        forwarded: 0,
        failed: 0,
        message: 'No pending outbound OpenClaw messages to replay',
        timestamp: new Date().toISOString(),
      });
    }

    if (dryRun) {
      return res.json({
        ok: true,
        dryRun: true,
        attempted: pending.length,
        forwarded: 0,
        failed: 0,
        candidateIds: pending.map(item => item._id.toString()),
        timestamp: new Date().toISOString(),
      });
    }

    let forwarded = 0;
    let failed = 0;
    const failures = [];

    for (const entry of pending) {
      const payload = {
        source: 'pvabazaar-openclaw-replay',
        message: entry.content || null,
        event: entry.event || 'pvabazaar.dispatch.replay',
        metadata: {
          ...(entry.metadata || {}),
          replayed: true,
          replayedAt: new Date().toISOString(),
          replayedMessageId: entry._id.toString(),
        },
        timestamp: new Date().toISOString(),
      };

      try {
        await axios.post(config.webhookUrl, payload, { headers, timeout: 12000 });
        forwarded += 1;
        await OpenClawMessage.updateOne(
          { _id: entry._id },
          {
            $set: {
              'metadata.lastWebhookReplayAt': new Date().toISOString(),
              'metadata.lastWebhookReplayStatus': 'ok',
            },
          },
        );
      } catch (err) {
        failed += 1;
        const detail = err?.response?.data || err.message || 'Unknown replay error';
        failures.push({
          id: entry._id.toString(),
          status: err?.response?.status || null,
          detail,
        });
        await OpenClawMessage.updateOne(
          { _id: entry._id },
          {
            $set: {
              'metadata.lastWebhookReplayAt': new Date().toISOString(),
              'metadata.lastWebhookReplayStatus': 'failed',
              'metadata.lastWebhookReplayError': typeof detail === 'string' ? detail.slice(0, 300) : JSON.stringify(detail).slice(0, 300),
            },
          },
        );
      }
    }

    return res.json({
      ok: true,
      dryRun: false,
      attempted: pending.length,
      forwarded,
      failed,
      failures: failures.slice(0, 20),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to replay queued OpenClaw messages',
      error: err.message,
    });
  }
});

router.post('/maintenance/cleanup', async (req, res) => {
  const config = getConfig();
  if (!requireBridgeOrAdmin(req, res, config, 'Unauthorized OpenClaw cleanup request')) return;

  const retainDays = Math.min(Math.max(parseInt(req.body?.retainDays, 10) || 30, 1), 365);
  const deleteProcessedOnly = req.body?.deleteProcessedOnly !== false;
  const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');

    const query = {
      createdAt: { $lt: cutoff },
    };

    if (deleteProcessedOnly) {
      query.processed = true;
    }

    const result = await OpenClawMessage.deleteMany(query);

    return res.json({
      ok: true,
      retainDays,
      deleteProcessedOnly,
      cutoff,
      deletedCount: result.deletedCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to cleanup OpenClaw messages',
      error: err.message,
    });
  }
});

router.post('/inbound', async (req, res) => {
  const config = getConfig();
  if (!isAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized inbound OpenClaw message',
    });
  }

  const { content, event, metadata, respondingTo } = req.body || {};
  if (!content || !String(content).trim()) {
    return res.status(400).json({
      ok: false,
      message: 'content is required',
    });
  }

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const doc = await OpenClawMessage.create({
      direction: 'inbound',
      content: String(content).trim(),
      event: event || 'pvabazaar.agent.response',
      source: metadata?.source || 'openclaw-inbound',
      processed: true,
      respondingTo: respondingTo || null,
      metadata: metadata || {},
    });

    return res.json({
      ok: true,
      messageId: doc._id.toString(),
      timestamp: doc.createdAt,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to store inbound message',
      error: err.message,
    });
  }
});

router.post('/messages/:id/processed', async (req, res) => {
  const config = getConfig();
  if (!isAuthorized(req, config.bridgeSecret)) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized mark-processed request',
    });
  }

  try {
    await dbConnect();
    const OpenClawMessage = require('../models/OpenClawMessage');
    const updated = await OpenClawMessage.findByIdAndUpdate(
      req.params.id,
      { processed: true },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({
        ok: false,
        message: 'Message not found',
      });
    }

    return res.json({
      ok: true,
      id: updated._id.toString(),
      processed: updated.processed,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to update message state',
      error: err.message,
    });
  }
});

// Lightweight health check for inclusion in main health endpoint
function getOpenClawHealth() {
  const config = getConfig();
  const paths = resolveWatchdogPaths();
  const logExists = fs.existsSync(paths.logPath);
  const alertExists = fs.existsSync(paths.alertPath);

  if (!logExists) {
    return {
      configured: true,
      status: config.webhookConfigured ? 'no-logs' : 'queue-only',
      mode: config.webhookConfigured ? 'webhook+queue' : 'queue-only',
      message: config.webhookConfigured
        ? 'Watchdog logs not found'
        : 'Queue-only mode — events stored in MongoDB'
    };
  }

  try {
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
