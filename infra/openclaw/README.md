# OpenClaw Always-On Runtime (for PVA Bazaar)

This folder gives you a deployable OpenClaw runtime on a persistent host (VM or Docker host), then connects it back to the PVA backend bridge.

## Windows-first setup (no Docker required)

If Docker is not available locally, use PowerShell bootstrap (Node 22+ required):

```powershell
./infra/openclaw/setup-windows.ps1
```

Run onboarding as well:

```powershell
./infra/openclaw/setup-windows.ps1 -RunOnboard -InstallDaemon
```

This avoids known `npx openclaw` cleanup failures on Windows by using a local dedicated CLI install under `.tmp/openclaw-cli`.

## 1) Start OpenClaw gateway container

```bash
cd infra/openclaw
cp .env.example .env
docker compose up -d
```

This compose stack now starts both:

- `openclaw-gateway` (OpenClaw service)
- `pva-openclaw-worker` (PVA outbound queue dispatcher)

OpenClaw health should be live at:

- `http://<your-openclaw-host>:18789/healthz`

You can verify worker runtime from backend status:

- `GET /api/openclaw/status` → includes `worker.active`, `worker.holderId`, `worker.heartbeatAt`

If Docker is running and worker is not active, check container logs:

```bash
docker compose logs -f pva-openclaw-worker
```

## 2) Complete OpenClaw onboarding once

Use either local CLI on that host or temporary shell inside the container to initialize auth/config.

Recommended (host install):

```bash
openclaw onboard --install-daemon
openclaw gateway status
```

## 3) Connect PVA backend to OpenClaw

In backend environment variables (Vercel/local):

- `OPENCLAW_GATEWAY_URL=https://<your-openclaw-domain>`
- `OPENCLAW_WEBHOOK_URL=https://<your-openclaw-domain>/<your-webhook-path>`
- `OPENCLAW_HEALTH_URL=https://<your-openclaw-domain>/healthz` (optional)
- `OPENCLAW_API_KEY=<token-if-required-by-openclaw>` (optional)
- `OPENCLAW_BRIDGE_SECRET=<random-long-secret>` (recommended)

Then use the backend endpoints:

- `GET /api/openclaw/status`
- `POST /api/openclaw/dispatch` with header `X-OpenClaw-Secret: <OPENCLAW_BRIDGE_SECRET>`

## 4) Verify bridge from backend workspace

Run:

```bash
cd backend
npm run smoke:openclaw
```

You can override defaults:

- `BACKEND_BASE_URL` (default `http://localhost:5001`)
- `OPENCLAW_TEST_DISPATCH=true` to test dispatch too
- `OPENCLAW_TEST_MESSAGE="your test message"`

PowerShell alternative:

```powershell
./infra/openclaw/verify-bridge.ps1 -BackendBaseUrl "http://localhost:5001"
./infra/openclaw/verify-bridge.ps1 -BackendBaseUrl "http://localhost:5001" -Dispatch -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>"
```

Check backend watchdog summary endpoint:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5001/api/openclaw/watchdog-status"
```

## 5) Run bridge watchdog in background (Windows)

Continuous monitor loop (manual foreground):

```powershell
./infra/openclaw/watchdog-bridge.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -IntervalSeconds 60
```

Alerting controls (defaults shown):

- `-FailureAlertThreshold 3` (alert after 3 consecutive failures)
- `-AlertCooldownMinutes 15` (minimum minutes between alerts)
- `-AlertFile ".\\infra\\openclaw\\logs\\watchdog.alert.log"`

With heartbeat dispatch enabled:

```powershell
./infra/openclaw/watchdog-bridge.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -IntervalSeconds 120 -DispatchHeartbeat
```

Optional desktop toast notifications:

```powershell
Install-Module BurntToast -Scope CurrentUser
./infra/openclaw/watchdog-bridge.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -EnableDesktopToast
```

Webhook notifications (Discord/Slack/generic):

```powershell
./infra/openclaw/watchdog-bridge.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -AlertWebhookUrl "https://hooks.slack.com/services/XXX/YYY/ZZZ" -AlertWebhookFormat slack
```

Supported `-AlertWebhookFormat` values:

- `auto` (default, infers from URL)
- `discord`
- `slack`
- `generic`

Install as Windows startup scheduled task:

```powershell
./infra/openclaw/install-watchdog-task.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -IntervalSeconds 60
Start-ScheduledTask -TaskName "PVABazaar-OpenClaw-Watchdog"
```

Example with webhook alerts enabled:

```powershell
./infra/openclaw/install-watchdog-task.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -IntervalSeconds 60 -AlertWebhookUrl "https://discord.com/api/webhooks/XXX/YYY" -AlertWebhookFormat discord
```

If scheduled task install fails with access denied (non-admin shell), use the no-admin Startup folder installer:

```powershell
./infra/openclaw/install-watchdog-startup.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -IntervalSeconds 60 -DispatchHeartbeat
```

Example with webhook alerts enabled:

```powershell
./infra/openclaw/install-watchdog-startup.ps1 -BackendBaseUrl "http://localhost:5001" -BridgeSecret "<OPENCLAW_BRIDGE_SECRET>" -IntervalSeconds 60 -DispatchHeartbeat -AlertWebhookUrl "https://hooks.slack.com/services/XXX/YYY/ZZZ" -AlertWebhookFormat slack
```

This creates a user-level startup launcher at:

 
 Remove startup launcher later:
 
 ```powershell
 ./infra/openclaw/uninstall-watchdog-startup.ps1
 ```

Logs are written to `infra/openclaw/logs/watchdog.log`.

## 6) Production recommendation

- Keep OpenClaw on a persistent host (not serverless).
- Put HTTPS + firewall in front of the OpenClaw host.
- Keep `OPENCLAW_BRIDGE_SECRET` enabled and rotate it periodically.
- Keep backend `.env` present on host for worker runtime (MongoDB URI, OpenClaw webhook URL, and worker tuning vars).
