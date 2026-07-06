# OpenClaw Integration - Quick Reference

**Quick lookup for OpenClaw integration features and file locations**

---

## ✅ Completed Features

### Backend Integration

- ✅ OpenClaw bridge routes (`backend/routes/openclaw.js`)
- ✅ Status endpoint with reachability checks
- ✅ Dispatch endpoint for event forwarding
- ✅ Watchdog status endpoint with log parsing
- ✅ Recent events endpoint (structured activity log)
- ✅ Prometheus metrics endpoint (`/api/openclaw/metrics`)
- ✅ Health endpoint enhancement (includes OpenClaw status)
- ✅ Event creators library (`backend/utils/openclaw-events.js`)
- ✅ Event integration in auth.js (register, login)
- ✅ Event integration in checkout.js (transaction created)
- ✅ Event integration in artifacts.js (artifact created)
- ✅ Smoke tests (`backend/scripts/smoke-openclaw.js`)

### Frontend Integration

- ✅ Admin panel connection status dropdown
- ✅ Color-coded health indicator badge (green/orange/red/gray/blue)
- ✅ Auto-refresh (60s) while dropdown open
- ✅ Stale data detection with configurable threshold
- ✅ Visual pulse animations for degraded/error/loading states
- ✅ Dedicated OpenClaw summary card
- ✅ Real-time metrics display (state, errors, alerts, last event)
- ✅ Test dispatch button with success/failure feedback
- ✅ Recent events viewer (collapsible, color-coded by level)
- ✅ Refresh button for manual event updates
- ✅ Embeddable health widget (`openclaw-widget.js`)
- ✅ Widget demo page (`Frontend/pages/openclaw-widget-demo.html`)
- ✅ Public status page (`Frontend/pages/status.html`)

### Operational Tools

- ✅ Windows CLI bootstrap script (`infra/openclaw/setup-windows.ps1`)
- ✅ Watchdog monitoring script (`infra/openclaw/watchdog-bridge.ps1`)
- ✅ Alert system (file, desktop toast, webhook)
- ✅ Scheduled task installer (admin) (`infra/openclaw/install-watchdog-task.ps1`)
- ✅ Startup folder installer (no admin) (`infra/openclaw/install-watchdog-startup.ps1`)
- ✅ PowerShell verification script (`infra/openclaw/verify-bridge.ps1`)
- ✅ Integration test suite (`infra/openclaw/test-integration.ps1`)
- ✅ Event dispatcher CLI (`infra/openclaw/dispatch-event.ps1`)

### CI/CD

- ✅ GitHub Actions workflow (`.github/workflows/openclaw-integration.yml`)
- ✅ Multi-platform testing (Ubuntu + Windows)
- ✅ Node.js version matrix (18, 20)
- ✅ MongoDB service container
- ✅ Frontend build validation
- ✅ PowerShell integration tests

### Documentation

- ✅ Comprehensive integration guide (`OPENCLAW_INTEGRATION.md`)
- ✅ Architecture diagrams (`OPENCLAW_ARCHITECTURE.md`)
- ✅ Quick start guide (`infra/openclaw/QUICK_START.md`)
- ✅ Feature inventory (`OPENCLAW_FEATURES.md`)
- ✅ Event integration guide (`OPENCLAW_EVENT_INTEGRATION.md`)
- ✅ Backend README updates (`backend/README.md`)
- ✅ Environment variable documentation
- ✅ Deployment instructions
- ✅ Troubleshooting guides

---

## 📁 Key Files

### Backend

```
backend/
├── routes/
│   ├── openclaw.js              # OpenClaw bridge API
│   └── health.js                # Enhanced with OpenClaw status
├── api/
│   └── index.js                 # Route mounting (DB-skip allowlist)
├── scripts/
│   └── smoke-openclaw.js        # Smoke tests
├── .env.example                 # OpenClaw env vars documented
└── README.md                    # API documentation
```

### Frontend

```
Frontend/
├── src/
│   ├── pages/
│   │   ├── AdminPage.jsx        # Connection status + OpenClaw UI
│   │   └── AdminPage.css        # Styles for OpenClaw components
│   └── config/
│       └── env.ts               # STATUS_STALE_MS configuration
├── .env.production              # VITE_STATUS_STALE_MS documented
└── [build output]               # Validated, builds successfully
```

### Infrastructure

```
infra/openclaw/
├── setup-windows.ps1            # Local CLI install
├── watchdog-bridge.ps1          # Monitoring loop + alerting
├── verify-bridge.ps1            # API verification script
├── install-watchdog-task.ps1    # Scheduled task (requires admin)
├── install-watchdog-startup.ps1 # Startup folder (no admin)
├── uninstall-watchdog-startup.ps1
├── docker-compose.yml           # Persistent runtime config
├── .env.example                 # Environment template
├── README.md                    # Deployment runbook
└── logs/                        # Watchdog logs (git-ignored)
    ├── watchdog.log
    └── watchdog.alert.log
```

### Documentation

```
OPENCLAW_INTEGRATION.md          # Complete integration guide
backend/README.md                # Backend API docs (OpenClaw section)
VERCEL_READY_TO_DEPLOY.md        # Production deployment checklist
.gitignore                       # Excludes logs and temp files
```

---

## 🌐 API Endpoints

| Endpoint                        | Method | Purpose                     |
| ------------------------------- | ------ | --------------------------- |
| `/api/openclaw/status`          | GET    | Config + reachability check |
| `/api/openclaw/dispatch`        | POST   | Forward events to OpenClaw  |
| `/api/openclaw/watchdog-status` | GET    | Detailed watchdog summary   |
| `/api/openclaw/recent-events`   | GET    | Structured activity log     |
| `/api/health`                   | GET    | Includes OpenClaw status    |

---

## 🎨 UI Components

### Connection Status Dropdown

**Location:** [AdminPage.jsx](Frontend/src/pages/AdminPage.jsx) lines 560-710

**Features:**

- Health indicator badge on button (color-coded state)
- API base URL display
- Last check timestamp
- Stale data warning
- Auto-refresh note
- Admin token input (optional)

### OpenClaw Summary Card

**Location:** [AdminPage.jsx](Frontend/src/pages/AdminPage.jsx) lines 620-685

**Features:**

- Header with Active/Issue status badge
- Metrics grid: state, errors, alerts, last event
- Test dispatch button
- View activity button

### Recent Events Viewer

**Location:** [AdminPage.jsx](Frontend/src/pages/AdminPage.jsx) lines 705-755

**Features:**

- Collapsible panel
- Refresh button
- Color-coded event levels (ERROR, WARN, INFO, ALERT, SUCCESS)
- Timestamp + message display
- Empty/loading/error states

---

## 🎨 CSS Classes

### Health Indicators

```css
.health-indicator--healthy     /* Green pulse */
.health-indicator--degraded    /* Orange pulse */
.health-indicator--error       /* Red pulse */
.health-indicator--stale       /* Gray (no pulse) */
.health-indicator--loading     /* Blue pulse */
.health-indicator--unknown     /* Gray (no pulse) */
```

### OpenClaw Components

```css
.openclaw-summary              /* Main card */
.openclaw-summary__header      /* Title + status badge */
.openclaw-summary__metrics     /* Metrics grid */
.openclaw-metric               /* Individual metric */
.openclaw-test-button          /* Primary action button */
.openclaw-test-button--secondary  /* Secondary action button */
.openclaw-events               /* Events container */
.openclaw-event                /* Individual event */
.openclaw-event--error         /* Error level styling */
.openclaw-event--warn          /* Warning level styling */
.openclaw-event--info          /* Info level styling */
.openclaw-event--alert         /* Alert level styling */
.openclaw-event--success       /* Success level styling */
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```bash
OPENCLAW_GATEWAY_URL=https://...
OPENCLAW_WEBHOOK_URL=https://...
OPENCLAW_HEALTH_URL=https://...
OPENCLAW_API_KEY=your_key
OPENCLAW_BRIDGE_SECRET=your_secret
OPENCLAW_WATCHDOG_LOG_PATH=./infra/openclaw/logs/watchdog.log
OPENCLAW_WATCHDOG_ALERT_PATH=./infra/openclaw/logs/watchdog.alert.log
```

### Frontend (`Frontend/.env.production`)

```bash
VITE_STATUS_STALE_MS=120000  # 2 minutes (min: 15000)
```

---

## 🔧 Watchdog Configuration

**File:** `infra/openclaw/watchdog-bridge.ps1`

```powershell
$checkInterval = 60           # Seconds between health checks
$errorThreshold = 5           # Errors before alerting
$alertCooldown = 300          # Seconds between alerts
$enableHeartbeat = $true      # Send test dispatches
$heartbeatInterval = 600      # Seconds between heartbeats
$webhookUrl = ""              # Slack/Discord webhook
```

---

## 🚀 Deployment Commands

### Backend

```bash
cd backend
npm run dev                   # Local development
node --check routes/openclaw.js  # Syntax validation
node scripts/smoke-openclaw.js   # Smoke tests
```

### Frontend

```bash
cd Frontend
npm run dev                   # Local development
npm run build                 # Production build (validates)
```

### Watchdog (Windows)

```powershell
# Admin (scheduled task)
.\infra\openclaw\install-watchdog-task.ps1

# No admin (startup folder)
.\infra\openclaw\install-watchdog-startup.ps1

# Manual run
.\infra\openclaw\watchdog-bridge.ps1
```

---

## 📊 Health States

| State      | Badge     | Frontend Display          | Backend Condition                      |
| ---------- | --------- | ------------------------- | -------------------------------------- |
| `healthy`  | 🟢 Green  | "All systems operational" | All checks pass, no errors             |
| `degraded` | 🟠 Orange | "Minor issues detected"   | Some warnings, watchdog state degraded |
| `error`    | 🔴 Red    | "Critical failure"        | High error count, alerts triggered     |
| `stale`    | ⚪ Gray   | "Data may be stale"       | Last check > threshold                 |
| `loading`  | 🔵 Blue   | "Checking status..."      | Request in progress                    |
| `unknown`  | ⚪ Gray   | "Status unknown"          | No data available                      |

---

## 🧪 Testing

### Backend Endpoints

```bash
# Status check
curl http://localhost:5000/api/openclaw/status

# Health with OpenClaw
curl http://localhost:5000/api/health

# Test dispatch
curl -X POST http://localhost:5000/api/openclaw/dispatch \
  -H "Content-Type: application/json" \
  -d '{"event":"test","message":"ping"}'

# Recent events
curl http://localhost:5000/api/openclaw/recent-events?limit=10
```

### Frontend UI

1. Open admin panel (`/pages/admin_dashboard/admin.html`)
2. Click connection status button (top-left)
3. View OpenClaw summary card
4. Click "Test Dispatch" button
5. Click "View Activity" to see recent events

### Watchdog

```powershell
# Manual run (terminal output)
.\infra\openclaw\watchdog-bridge.ps1

# Check logs
Get-Content .\infra\openclaw\logs\watchdog.log -Tail 20
Get-Content .\infra\openclaw\logs\watchdog.alert.log
```

---

## 📖 Documentation Links

- **Complete Guide:** [OPENCLAW_INTEGRATION.md](OPENCLAW_INTEGRATION.md)
- **Backend API:** [backend/README.md](backend/README.md)
- **Infra Setup:** [infra/openclaw/README.md](infra/openclaw/README.md)
- **Deployment:** [VERCEL_READY_TO_DEPLOY.md](VERCEL_READY_TO_DEPLOY.md)

---

## ✅ Validation Status

- ✅ Backend syntax validation passed
- ✅ Frontend build successful (3.68s)
- ✅ No TypeScript/ESLint errors
- ✅ API endpoints smoke tested
- ✅ Watchdog script syntax valid
- ✅ Git-ignored files configured
- ✅ Documentation complete

---

**Last Updated:** March 5, 2026  
**Status:** Production Ready  
**Next Steps:** Deploy to Vercel, configure production OpenClaw gateway, install watchdog on monitoring host
