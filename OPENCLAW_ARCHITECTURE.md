# OpenClaw Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PVA BAZAAR - OPENCLAW INTEGRATION                   │
│                              Production Architecture                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND LAYER (GitHub Pages / Static Host)                                  │
│ ============================================================================ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  Admin Panel UI (AdminPage.jsx)                                 │        │
│  │  ─────────────────────────────────────────────────────────────  │        │
│  │                                                                 │        │
│  │  📊 Connection Status Dropdown:                                 │        │
│  │     • Color-coded health badge (🟢🟠🔴⚪🔵)                      │        │
│  │     • Auto-refresh: 60s                                         │        │
│  │     • Stale detection: 2min threshold (configurable)            │        │
│  │     • Visual pulse animations                                   │        │
│  │                                                                 │        │
│  │  🔗 OpenClaw Summary Card:                                      │        │
│  │     ┌──────────────────────────────────────────────┐            │        │
│  │     │ Header: "OpenClaw Gateway" ✓ Active / ✗ Issue            │        │
│  │     ├──────────────────────────────────────────────┤            │        │
│  │     │ Metrics:                                     │            │        │
│  │     │   • State: healthy/degraded/error            │            │        │
│  │     │   • Errors: 0 (rolling window)               │            │        │
│  │     │   • Alerts: 0 (alert log count)              │            │        │
│  │     │   • Last Event: 2026-03-05T12:30:00.000Z     │            │        │
│  │     ├──────────────────────────────────────────────┤            │        │
│  │     │ Actions:                                     │            │        │
│  │     │   [Test Dispatch]  [📋 View Activity]        │            │        │
│  │     └──────────────────────────────────────────────┘            │        │
│  │                                                                 │        │
│  │  📋 Recent Events Viewer (collapsible):                         │        │
│  │     • Last 15 events displayed                                  │        │
│  │     • Color-coded levels: ERROR/WARN/INFO/ALERT/SUCCESS         │        │
│  │     • Timestamps + raw log messages                             │        │
│  │     • Manual refresh button                                     │        │
│  │                                                                 │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  Environment:                                                                │
│    • VITE_API_URL → https://api.pvabazaar.org                                │
│    • VITE_STATUS_STALE_MS → 120000 (2 min)                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTPS API Calls
                                       │ (apiFetch helper)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BACKEND LAYER (Vercel Serverless)                                            │
│ ============================================================================ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │  Express API (backend/api/index.js)                           │          │
│  │  ──────────────────────────────────────────────────────────   │          │
│  │                                                               │          │
│  │  Core Routes:                                                 │          │
│  │    GET  /api/health          → Enhanced with OpenClaw status  │          │
│  │    GET  /api/ping                                            │          │
│  │    GET  /api/artifacts                                       │          │
│  │    POST /api/upload                                          │          │
│  │    ...                                                       │          │
│  │                                                               │          │
│  │  OpenClaw Bridge Routes (routes/openclaw.js):                │          │
│  │  ┌─────────────────────────────────────────────────────────┐ │          │
│  │  │                                                         │ │          │
│  │  │  GET /api/openclaw/status                              │ │          │
│  │  │    ↳ Returns: configured, reachable, gatewayUrl        │ │          │
│  │  │    ↳ Probes: OPENCLAW_HEALTH_URL if configured         │ │          │
│  │  │                                                         │ │          │
│  │  │  POST /api/openclaw/dispatch                           │ │          │
│  │  │    ↳ Accepts: { event, message, metadata }             │ │          │
│  │  │    ↳ Forwards to: OPENCLAW_WEBHOOK_URL                 │ │          │
│  │  │    ↳ Auth: Bearer token (OPENCLAW_API_KEY)             │ │          │
│  │  │    ↳ Returns: { ok, forwarded, status, timestamp }     │ │          │
│  │  │                                                         │ │          │
│  │  │  GET /api/openclaw/watchdog-status                     │ │          │
│  │  │    ↳ Reads: watchdog.log + watchdog.alert.log          │ │          │
│  │  │    ↳ Parses: last 400 lines (configurable)             │ │          │
│  │  │    ↳ Returns: summary with state, error/warn/alert     │ │          │
│  │  │               counts, latest events, timestamps        │ │          │
│  │  │                                                         │ │          │
│  │  │  GET /api/openclaw/recent-events?limit=30              │ │          │
│  │  │    ↳ Reads: watchdog.log + watchdog.alert.log          │ │          │
│  │  │    ↳ Structures: events array with id, timestamp,      │ │          │
│  │  │                  level, type, message, source          │ │          │
│  │  │    ↳ Sorts: most recent first                          │ │          │
│  │  │    ↳ Returns: { ok, available, events[], count }       │ │          │
│  │  │                                                         │ │          │
│  │  │  Exported: getOpenClawHealth() → used by /health       │ │          │
│  │  │    ↳ Quick summary: configured, status, errors,        │ │          │
│  │  │                     warnings, alerts, message          │ │          │
│  │  │                                                         │ │          │
│  │  └─────────────────────────────────────────────────────────┘ │          │
│  │                                                               │          │
│  │  DB-Skip Allowlist:                                          │          │
│  │    • /api/health                                             │          │
│  │    • /api/openclaw/*                                         │          │
│  │    (allows OpenClaw routes to run without MongoDB)           │          │
│  │                                                               │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  Environment:                                                                │
│    • OPENCLAW_GATEWAY_URL                                                    │
│    • OPENCLAW_WEBHOOK_URL                                                    │
│    • OPENCLAW_HEALTH_URL                                                     │
│    • OPENCLAW_API_KEY                                                        │
│    • OPENCLAW_BRIDGE_SECRET                                                  │
│    • OPENCLAW_WATCHDOG_LOG_PATH (default: infra/openclaw/logs/watchdog.log) │
│    • OPENCLAW_WATCHDOG_ALERT_PATH                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                     │                                          │
                     │ Forwards events                          │ Reads logs
                     ▼                                          ▼
┌─────────────────────────────────┐      ┌──────────────────────────────────────┐
│ OPENCLAW GATEWAY                │      │ WATCHDOG MONITORING                  │
│ (External Service)              │      │ (Windows Host / Cloud Function)      │
│ ─────────────────────────────── │      │ ──────────────────────────────────── │
│                                 │      │                                      │
│  POST /webhook                  │      │  PowerShell Script:                  │
│    ← Receives events from PVA   │      │    watchdog-bridge.ps1               │
│                                 │      │                                      │
│  GET /health                    │      │  Loop (every 60s):                   │
│    → Returns gateway status     │      │    1. Call /api/openclaw/status      │
│                                 │      │    2. Check reachability + config    │
│  Authentication:                │      │    3. Count errors in window         │
│    • Bearer token (API key)     │      │    4. Trigger alerts if threshold    │
│    • Shared secret header       │      │       exceeded (cooldown: 5min)      │
│                                 │      │    5. Log to watchdog.log            │
│  Channels:                      │      │                                      │
│    • Event processing           │      │  Optional Heartbeat:                 │
│    • Agent dispatch             │      │    • POST /api/openclaw/dispatch     │
│    • Webhook forwarding         │      │      every 10min with test event     │
│                                 │      │                                      │
└─────────────────────────────────┘      │  Alert Channels:                     │
                                         │    • File: watchdog.alert.log        │
                                         │    • Desktop: Windows toast          │
                                         │    • Webhook: Slack/Discord/Generic  │
                                         │                                      │
                                         │  Persistence:                        │
                                         │    • Windows Scheduled Task (admin)  │
                                         │      → Runs on boot, survives logout │
                                         │    • Startup Folder (no admin)       │
                                         │      → Runs on user login            │
                                         │                                      │
                                         │  Logs:                               │
                                         │    • infra/openclaw/logs/            │
                                         │      watchdog.log                    │
                                         │      watchdog.alert.log              │
                                         │    • Git-ignored (local only)        │
                                         │                                      │
                                         └──────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
DATA FLOW EXAMPLES
═══════════════════════════════════════════════════════════════════════════════

1. ADMIN VIEWS STATUS
   ────────────────────
   User opens Admin Panel
      │
      ├─→ Frontend fetches /api/health
      │     └─→ Backend returns: { ok: true, openclaw: { status: "healthy" } }
      │
      ├─→ Frontend fetches /api/openclaw/watchdog-status
      │     └─→ Backend parses logs, returns summary
      │
      └─→ UI renders:
            • Health badge: 🟢 GREEN (healthy)
            • OpenClaw card: state=ok, errors=0, alerts=0
            • Auto-refresh starts (60s interval)

2. ADMIN TESTS DISPATCH
   ─────────────────────
   User clicks [Test Dispatch] button
      │
      └─→ Frontend POST /api/openclaw/dispatch
            {
              "event": "pvabazaar.admin_test",
              "message": "Test from admin panel",
              "metadata": { "source": "admin-panel", "timestamp": "..." }
            }
            │
            └─→ Backend forwards to OPENCLAW_WEBHOOK_URL
                  │
                  ├─ Success → Frontend shows: ✅ Dispatch successful
                  └─ Failure → Frontend shows: ❌ Failed to forward

3. WATCHDOG DETECTS ERRORS
   ────────────────────────
   Watchdog loop (every 60s)
      │
      ├─→ Fetch /api/openclaw/status
      │     └─→ Returns: { ok: false, reachable: false }
      │
      ├─→ Increment error counter
      │
      ├─→ If error_count >= threshold (5):
      │     │
      │     ├─→ Log to watchdog.alert.log
      │     │     "[2026-03-05T12:34:56] ALERT: 5 consecutive errors detected"
      │     │
      │     ├─→ Show Windows toast notification
      │     │     "OpenClaw Watchdog Alert"
      │     │     "Gateway health check failed 5 times"
      │     │
      │     └─→ POST to webhook (Slack/Discord)
      │           { "text": "🚨 OpenClaw alert: 5 errors detected" }
      │
      └─→ Wait cooldown period (5min) before next alert

4. ADMIN VIEWS RECENT EVENTS
   ──────────────────────────
   User clicks [📋 View Activity] button
      │
      └─→ Frontend fetches /api/openclaw/recent-events?limit=30
            │
            └─→ Backend reads logs, structures events:
                  [
                    {
                      "id": "log-0",
                      "timestamp": "2026-03-05T12:34:00.000Z",
                      "level": "INFO",
                      "type": "status-check",
                      "message": "[2026-03-05T12:34:00] status configured=true"
                    },
                    {
                      "id": "alert-0",
                      "timestamp": "2026-03-05T12:00:00.000Z",
                      "level": "ALERT",
                      "type": "alert",
                      "message": "[2026-03-05T12:00:00] ALERT: 5 errors"
                    }
                  ]
                  │
                  └─→ UI renders color-coded event list with timestamps

═══════════════════════════════════════════════════════════════════════════════
DEPLOYMENT TOPOLOGY
═══════════════════════════════════════════════════════════════════════════════

Production Environment:

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ pvabazaar.org   │  HTTPS  │ Vercel          │  HTTPS  │ OpenClaw        │
│ (GitHub Pages)  │────────▶│ Backend API     │────────▶│ Gateway         │
│                 │         │ (Serverless)    │         │ (VM/Container)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     │                            ▲
                                     │ Reads logs                 │
                                     ▼                            │
                            ┌─────────────────┐                  │
                            │ Windows Server  │                  │
                            │ Monitoring Host │──────────────────┘
                            │                 │  Health checks
                            │ • Watchdog      │  Event dispatch
                            │ • Scheduled Task│
                            │ • Log storage   │
                            └─────────────────┘

Alternative: Cloud-Native Watchdog

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ pvabazaar.org   │  HTTPS  │ Vercel          │  HTTPS  │ OpenClaw        │
│ (GitHub Pages)  │────────▶│ Backend API     │────────▶│ Gateway         │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     ▲                            ▲
                                     │ Reads logs                 │
                                     │ (S3/Blob)                  │
                            ┌────────┴──────────┐                 │
                            │ AWS Lambda /      │─────────────────┘
                            │ Azure Function    │  Health checks
                            │                   │
                            │ • EventBridge     │
                            │ • Timer trigger   │
                            │ • CloudWatch logs │
                            └───────────────────┘

═══════════════════════════════════════════════════════════════════════════════
SECURITY & AUTHENTICATION
═══════════════════════════════════════════════════════════════════════════════

Backend → OpenClaw Gateway:
  • Bearer token: Authorization: Bearer ${OPENCLAW_API_KEY}
  • Shared secret: X-OpenClaw-Secret: ${OPENCLAW_BRIDGE_SECRET}
  • HTTPS only (TLS 1.2+)

Frontend → Backend:
  • Standard PVA Bazaar auth (JWT for protected routes)
  • /api/openclaw/* routes: No DB, no user auth required
  • CORS: pvabazaar.org allowed origin

Watchdog → Backend:
  • Local network (same host) or private network
  • No auth required (internal service)
  • Logs stored locally (not exposed externally)

═══════════════════════════════════════════════════════════════════════════════
SCALABILITY & RELIABILITY
═══════════════════════════════════════════════════════════════════════════════

Backend (Vercel Serverless):
  • Auto-scaling: 0→N instances based on traffic
  • Cold start: ~200-500ms
  • No DB dependency for OpenClaw routes (fast path)
  • Timeout: 10s max execution time

OpenClaw Gateway:
  • Persistent service (always-on VM/container)
  • Handles async event processing
  • Scales independently from PVA backend

Watchdog:
  • Single-instance monitoring (sufficient for production)
  • Failover: Health endpoint accessible from multiple monitors
  • Alerting: Multiple channels (file, toast, webhook) for redundancy

Log Rotation:
  • Backend: Vercel logs (24h retention, then archive)
  • Watchdog: Local logs (manual rotation recommended)
  • Recommendation: Implement logrotate or PowerShell retention policy

═══════════════════════════════════════════════════════════════════════════════

Last Updated: March 5, 2026
Architecture Version: 1.0.0
Status: ✅ Production Ready
```
