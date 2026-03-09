/**
 * Prometheus Metrics Exporter for OpenClaw
 * 
 * Exposes OpenClaw health metrics in Prometheus format
 * Endpoint: GET /api/openclaw/metrics
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

function resolveWatchdogPaths() {
  const defaultLog = path.join(process.cwd(), 'infra', 'openclaw', 'logs', 'watchdog.log');
  const defaultAlert = path.join(process.cwd(), 'infra', 'openclaw', 'logs', 'watchdog.alert.log');

  return {
    logPath: process.env.OPENCLAW_WATCHDOG_LOG_PATH || defaultLog,
    alertPath: process.env.OPENCLAW_WATCHDOG_ALERT_PATH || defaultAlert,
  };
}

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

function getOpenClawMetrics() {
  const { logPath, alertPath } = resolveWatchdogPaths();
  
  // Check configuration
  const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL || '';
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || '';
  const configured = Boolean(webhookUrl || gatewayUrl) ? 1 : 0;
  
  // Read logs
  const logLines = readLastLines(logPath, 400);
  const alertLines = readLastLines(alertPath, 120);
  
  // Count metrics
  const errorCount = logLines.filter(line => line.includes('[ERROR]')).length;
  const warnCount = logLines.filter(line => line.includes('[WARN]')).length;
  const alertCount = alertLines.length;
  
  // Determine health state
  let healthState = 0; // unknown
  if (logLines.length > 0) {
    if (errorCount > 5) {
      healthState = 3; // critical
    } else if (errorCount > 0) {
      healthState = 2; // degraded
    } else {
      healthState = 1; // healthy
    }
  }
  
  // Parse latest timestamp
  let lastEventTimestamp = 0;
  for (let i = logLines.length - 1; i >= 0; i--) {
    const match = logLines[i].match(/^\[([^\]]+)\]/);
    if (match) {
      try {
        lastEventTimestamp = Math.floor(new Date(match[1]).getTime() / 1000);
        break;
      } catch {
        // Invalid timestamp, continue
      }
    }
  }
  
  return {
    configured,
    healthState,
    errorCount,
    warnCount,
    alertCount,
    lastEventTimestamp,
    logLinesCount: logLines.length,
    alertLinesCount: alertLines.length,
  };
}

// Prometheus metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const metrics = getOpenClawMetrics();
    
    // Format in Prometheus exposition format
    const prometheusOutput = `# HELP openclaw_configured Whether OpenClaw is configured
# TYPE openclaw_configured gauge
openclaw_configured ${metrics.configured}

# HELP openclaw_health_state Health state (0=unknown, 1=healthy, 2=degraded, 3=critical)
# TYPE openclaw_health_state gauge
openclaw_health_state ${metrics.healthState}

# HELP openclaw_errors_total Total errors in recent window
# TYPE openclaw_errors_total counter
openclaw_errors_total ${metrics.errorCount}

# HELP openclaw_warnings_total Total warnings in recent window
# TYPE openclaw_warnings_total counter
openclaw_warnings_total ${metrics.warnCount}

# HELP openclaw_alerts_total Total alerts triggered
# TYPE openclaw_alerts_total counter
openclaw_alerts_total ${metrics.alertCount}

# HELP openclaw_last_event_timestamp_seconds Timestamp of last event
# TYPE openclaw_last_event_timestamp_seconds gauge
openclaw_last_event_timestamp_seconds ${metrics.lastEventTimestamp}

# HELP openclaw_log_lines_count Number of log lines in window
# TYPE openclaw_log_lines_count gauge
openclaw_log_lines_count ${metrics.logLinesCount}

# HELP openclaw_alert_lines_count Number of alert lines
# TYPE openclaw_alert_lines_count gauge
openclaw_alert_lines_count ${metrics.alertLinesCount}
`;

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(prometheusOutput);
  } catch (err) {
    res.status(500).send(`# Error generating metrics: ${err.message}\n`);
  }
});

module.exports = router;
