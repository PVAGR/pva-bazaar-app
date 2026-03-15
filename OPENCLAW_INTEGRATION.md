# OpenClaw Integration Guide

**PVA Bazaar - OpenClaw Gateway Integration**

Complete guide for connecting PVA Bazaar with OpenClaw gateway for event dispatching, monitoring, and operational observability.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Setup](#backend-setup)
4. [Frontend Integration](#frontend-integration)
5. [Watchdog Monitoring](#watchdog-monitoring)
6. [API Endpoints](#api-endpoints)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

OpenClaw integration provides:

- **Event Dispatching**: Forward events from PVA Bazaar to OpenClaw webhook/gateway
- **Health Monitoring**: Real-time status checks and health indicators
- **Watchdog System**: Automated monitoring with alerting (desktop toast, webhook notifications)
- **Admin Visibility**: Rich dashboard UI with health badges, metrics, and activity logs
- **Always-On Operation**: Windows scheduled tasks and startup persistence

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  PVA Bazaar     │         │  Backend API     │         │  OpenClaw       │
│  Frontend       │────────▶│  (Bridge Layer)  │────────▶│  Gateway        │
│  Admin Panel    │         │  /api/openclaw/* │         │  Webhook        │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     │
                            ┌────────▼────────┐
                            │  Watchdog       │
                            │  Monitor        │
                            │  (PowerShell)   │
                            └─────────────────┘
```

**Key Components:**

1. **Backend Bridge** (`backend/routes/openclaw.js`): Proxy API for OpenClaw interaction
2. **Frontend UI** (`Frontend/src/pages/AdminPage.jsx`): Admin dashboard with live status
3. **Watchdog Script** (`infra/openclaw/watchdog-bridge.ps1`): Monitoring loop with alerting
4. **Persistence Layer**: Windows scheduled tasks + startup folder integration

---

## Backend Setup

### 1. Environment Variables

Add to `backend/.env`:

```bash
# OpenClaw Configuration
OPENCLAW_GATEWAY_URL=https://your-openclaw-gateway.com
OPENCLAW_WEBHOOK_URL=https://your-openclaw-gateway.com/webhook
OPENCLAW_HEALTH_URL=https://your-openclaw-gateway.com/health
OPENCLAW_API_KEY=your_api_key_here
OPENCLAW_BRIDGE_SECRET=your_shared_secret_here

# Optional: Custom log paths
OPENCLAW_WATCHDOG_LOG_PATH=./infra/openclaw/logs/watchdog.log
OPENCLAW_WATCHDOG_ALERT_PATH=./infra/openclaw/logs/watchdog.alert.log
```

### 2. Backend Files

**`backend/routes/openclaw.js`** - Bridge endpoints:
- `GET /api/openclaw/status` - Gateway configuration and reachability
- `POST /api/openclaw/dispatch` - Forward events to OpenClaw webhook
- `POST /api/openclaw/chat` - Live chat request with short wait for correlated inbound reply
- `POST /api/openclaw/inbound` - Store OpenClaw replies/events back into website message store
- `GET /api/openclaw/watchdog-status` - Detailed watchdog summary with log parsing
- `GET /api/openclaw/recent-events` - Structured recent activity (limit: 30-200)

**`backend/routes/health.js`** - Enhanced health endpoint:
- Includes OpenClaw status in main `/api/health` response
- Shows `configured`, `status`, `errors`, `warnings`, `alerts` counts

### 3. Validation

```bash
cd backend
npm run dev

# Test endpoints:
curl http://localhost:5000/api/openclaw/status
curl http://localhost:5000/api/health
```

---

## Frontend Integration

### Admin Panel Features

**Connection Status Dropdown:**
- Color-coded health indicator badge (green/orange/red/gray/blue)
- Visual pulse animations for degraded/error/loading states
- Auto-refresh every 60s while dropdown is open
- Stale data detection with configurable threshold

**OpenClaw Summary Section:**
- Dedicated card above general API endpoints
- Real-time metrics: state, errors, alerts, last event timestamp
- "Test Dispatch" button - sends `pvabazaar.admin_test` event
- "View Activity" button - toggles recent events viewer

**Recent Events Viewer:**
- Last 15 events displayed with color-coded levels (ERROR, WARN, INFO, ALERT, SUCCESS)
- Timestamps in ISO format
- Refresh button for manual updates
- Collapsible panel to reduce clutter

### Environment Variables

Add to `Frontend/.env.production`:

```bash
# OpenClaw Status Thresholds
VITE_STATUS_STALE_MS=120000  # 2 minutes (min: 15000)
```

### Visual States

| Health State | Badge Color | Condition |
|-------------|-------------|-----------|
| `healthy` | Green | All checks passing, no errors |
| `degraded` | Orange | Minor issues, watchdog state degraded |
| `error` | Red | Critical failure, high error count |
| `stale` | Gray | Data older than threshold |
| `loading` | Blue | Checking status |
| `unknown` | Gray | No data available |

---

## Watchdog Monitoring

### Features

- **Health Checks**: Periodic polling of `/api/openclaw/status`
- **Error Tracking**: Counts errors/warnings in rolling window
- **Alert Thresholds**: Configurable failure thresholds before alerting
- **Cooldown**: Prevents alert spam with configurable cooldown period
- **Multiple Alert Channels**:
  - File log (`watchdog.alert.log`)
  - Windows desktop toast notifications
  - Webhook delivery (Slack, Discord, generic)

### Installation

**Option A: Scheduled Task (Recommended, requires admin)**

```powershell
# Run as Administrator
.\infra\openclaw\install-watchdog-task.ps1

# Verify task created
Get-ScheduledTask -TaskName "PVA-OpenClaw-Watchdog"
```

**Option B: Startup Folder (No admin required)**

```powershell
.\infra\openclaw\install-watchdog-startup.ps1

# Uninstall
.\infra\openclaw\uninstall-watchdog-startup.ps1
```

### Configuration

Edit `infra/openclaw/watchdog-bridge.ps1` parameters:

```powershell
$checkInterval = 60           # Seconds between checks
$errorThreshold = 5           # Errors before alerting
$alertCooldown = 300          # Seconds between alerts
$enableHeartbeat = $true      # Send periodic test dispatches
$heartbeatInterval = 600      # Seconds between heartbeats
$webhookUrl = "https://..."   # Slack/Discord webhook
```

### Log Files

- **`infra/openclaw/logs/watchdog.log`** - All health checks
- **`infra/openclaw/logs/watchdog.alert.log`** - Alerts only
- **Git-ignored** - Won't clutter repository

---

## API Endpoints

### `GET /api/openclaw/status`

**Description:** Check OpenClaw gateway configuration and reachability.

**Response:**
```json
{
  "ok": true,
  "configured": true,
  "reachable": true,
  "gatewayUrl": "https://...",
  "webhookUrlConfigured": true,
  "timestamp": "2026-03-05T12:34:56.789Z",
  "detail": { /* health endpoint response */ }
}
```

---

### `POST /api/openclaw/dispatch`

**Description:** Forward event to OpenClaw webhook.

**Request:**
```json
{
  "event": "pvabazaar.artifact.created",
  "message": "New artifact published",
  "metadata": {
    "artifactId": "abc123",
    "userId": "user456"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "forwarded": true,
  "status": 200,
  "timestamp": "2026-03-05T12:34:56.789Z"
}
```

---

### `POST /api/openclaw/chat`

**Description:** Send a chat message to OpenClaw and wait briefly for a correlated inbound response.

**Request:**
```json
{
  "message": "Run an ops status check and summarize queue health",
  "source": "admin-openclaw-tab",
  "waitForReplyMs": 14000
}
```

**Response (live reply):**
```json
{
  "ok": true,
  "queued": true,
  "forwarded": true,
  "waiting": false,
  "chatRequestId": "f4f37a66-xxxx-xxxx-xxxx-3f4f6f25f5f2",
  "reply": {
    "messageId": "67cb0d5d...",
    "content": "Gateway healthy. Pending queue is 2, stale is 0.",
    "event": "pvabazaar.agent.response",
    "source": "openclaw-inbound",
    "createdAt": "2026-03-14T10:20:00.000Z"
  }
}
```

**Response (timed out waiting):**
```json
{
  "ok": true,
  "queued": true,
  "forwarded": true,
  "waiting": true,
  "chatRequestId": "f4f37a66-xxxx-xxxx-xxxx-3f4f6f25f5f2",
  "message": "Message sent. Waiting timed out; poll messages for agent reply."
}
```

---

### `POST /api/openclaw/inbound`

**Description:** OpenClaw posts replies/events back to PVA Bazaar.

**Critical for threaded live chat:** include one or more correlation fields in `metadata`.

**Recommended inbound payload contract:**
```json
{
  "content": "Gateway healthy. No recovery action required.",
  "event": "pvabazaar.agent.response",
  "respondingTo": "67cb0d5d...",
  "metadata": {
    "source": "openclaw-gateway",
    "chatRequestId": "f4f37a66-xxxx-xxxx-xxxx-3f4f6f25f5f2",
    "replyToRequestId": "f4f37a66-xxxx-xxxx-xxxx-3f4f6f25f5f2",
    "respondingToMessageId": "67cb0d5d..."
  }
}
```

Any of these currently correlate a reply to a chat request:
- `respondingTo` (ObjectId of outbound message)
- `metadata.respondingToMessageId` (string outbound message id)
- `metadata.replyToRequestId` (chat request UUID)
- `metadata.chatRequestId` (chat request UUID)

---

### `GET /api/openclaw/watchdog-status`

**Description:** Detailed watchdog summary with log parsing.

**Response:**
```json
{
  "ok": true,
  "available": true,
  "summary": {
    "state": "ok",
    "errorCountWindow": 0,
    "warnCountWindow": 2,
    "alertCountWindow": 0,
    "lastEventAt": "2026-03-05T12:30:00.000Z",
    "latestStatus": "[2026-03-05T12:30:00] status configured=true",
    "latestDispatch": null,
    "latestError": null,
    "latestWarn": "[2026-03-05T12:25:00] [WARN] minor issue"
  },
  "timestamp": "2026-03-05T12:34:56.789Z"
}
```

---

### `GET /api/openclaw/recent-events?limit=30`

**Description:** Structured recent activity log.

**Response:**
```json
{
  "ok": true,
  "available": true,
  "count": 30,
  "events": [
    {
      "id": "log-0",
      "timestamp": "2026-03-05T12:34:00.000Z",
      "level": "INFO",
      "type": "status-check",
      "message": "[2026-03-05T12:34:00] status configured=true reachable=true",
      "source": "watchdog-log"
    },
    {
      "id": "alert-0",
      "timestamp": "2026-03-05T12:00:00.000Z",
      "level": "ALERT",
      "type": "alert",
      "message": "[2026-03-05T12:00:00] ALERT: 5 consecutive errors detected",
      "source": "alert-log"
    }
  ],
  "timestamp": "2026-03-05T12:34:56.789Z"
}
```

---

## Production Deployment

### Vercel Backend

1. Add OpenClaw environment variables in Vercel project settings
2. Deploy backend with OpenClaw routes included
3. Verify `/api/health` returns `openclaw` field

### Frontend (GitHub Pages / Static Host)

1. Set `VITE_STATUS_STALE_MS` in build environment
2. Build with `npm run build`
3. Deploy `dist/` folder

### Watchdog Host

**Option 1: Same Windows Server**
- Install scheduled task on production Windows server
- Logs stored locally, accessible via backend API

**Option 2: Dedicated Monitoring Server**
- Install watchdog on separate monitoring host
- Update `OPENCLAW_WATCHDOG_LOG_PATH` to network path
- Configure webhook alerts (Slack/Discord)

**Option 3: Cloud Function**
- Port watchdog logic to cloud function (AWS Lambda, Azure Functions)
- Trigger via EventBridge/Timer
- Store logs in cloud storage (S3, Blob Storage)

---

## Troubleshooting

### Watchdog Not Running

**Check scheduled task:**
```powershell
Get-ScheduledTask -TaskName "PVA-OpenClaw-Watchdog"
Get-ScheduledTaskInfo -TaskName "PVA-OpenClaw-Watchdog"
```

**Check startup folder:**
```powershell
Test-Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\launch-pvabazaar-openclaw-watchdog.bat"
```

**Manual run:**
```powershell
.\infra\openclaw\watchdog-bridge.ps1
```

---

### Backend Returns "Not Configured"

**Verify environment variables:**
```bash
cd backend
node -e "console.log(process.env.OPENCLAW_GATEWAY_URL)"
```

**Check .env file:**
```bash
cat backend/.env | grep OPENCLAW
```

---

### Frontend Shows Stale Data

**Increase stale threshold:**
```bash
# Frontend/.env.production
VITE_STATUS_STALE_MS=300000  # 5 minutes
```

**Check watchdog interval:**
```powershell
# infra/openclaw/watchdog-bridge.ps1
$checkInterval = 60  # Reduce for more frequent checks
```

---

### Dispatch Fails with 502

**Verify webhook URL:**
```bash
curl -X POST https://your-openclaw-gateway.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"test","message":"ping"}'
```

**Check API key:**
```bash
# Ensure OPENCLAW_API_KEY matches gateway expectations
```

---

### Chat Sends But No Reply Appears

1. Confirm webhook forwarding is enabled (`OPENCLAW_WEBHOOK_URL` or runtime OpenClaw webhook URL).
2. Confirm OpenClaw posts to `/api/openclaw/inbound` after processing.
3. Ensure inbound payload includes at least one correlation field:
  - `respondingTo`
  - `metadata.respondingToMessageId`
  - `metadata.replyToRequestId`
  - `metadata.chatRequestId`

Without correlation fields, replies are stored but cannot be matched for immediate live chat response.

---

### Desktop Toast Not Appearing

**PowerShell execution policy:**
```powershell
Get-ExecutionPolicy
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Test toast directly:**
```powershell
New-BurntToastNotification -Text "Test Title", "Test Message"
```

---

## Additional Resources

- **Backend README**: `backend/README.md` - API documentation
- **Frontend ENV**: `Frontend/.env.production` - Environment variables
- **Watchdog Script**: `infra/openclaw/watchdog-bridge.ps1` - Monitoring logic
- **Setup Scripts**: `infra/openclaw/` - Windows installation tools
- **Deployment Guide**: `VERCEL_READY_TO_DEPLOY.md` - Production checklist

---

## Support

For issues or questions:
1. Check logs: `infra/openclaw/logs/`
2. Verify environment configuration
3. Review API responses: `/api/openclaw/status`
4. Check watchdog scheduled task status

---

**Last Updated:** March 5, 2026  
**Integration Version:** 1.0.0  
**Status:** ✅ Production Ready
