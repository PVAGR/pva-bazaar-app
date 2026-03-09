# OpenClaw Integration - Quick Start

**Get up and running with OpenClaw in 5 minutes**

---

## Prerequisites

- ✅ Node.js v18+ installed
- ✅ Backend running (local or deployed)
- ✅ PowerShell 5.1+ (Windows) or Bash (Linux/Mac)
- ✅ OpenClaw webhook URL (or test with mock)

---

## Step 1: Configure Environment (30 seconds)

Add to `backend/.env`:

```bash
# Minimum required
OPENCLAW_WEBHOOK_URL=https://your-openclaw-gateway.com/webhook

# Optional but recommended
OPENCLAW_GATEWAY_URL=https://your-openclaw-gateway.com
OPENCLAW_API_KEY=your_api_key_here
```

**Don't have OpenClaw yet?** Use a test webhook:
```bash
# RequestBin, Webhook.site, or similar
OPENCLAW_WEBHOOK_URL=https://webhook.site/your-unique-id
```

---

## Step 2: Start Backend (15 seconds)

```bash
cd backend
npm run dev
```

Wait for: `Backend running on port 5000`

---

## Step 3: Test Integration (30 seconds)

**Option A: PowerShell (Windows)**
```powershell
.\infra\openclaw\test-integration.ps1 -Verbose
```

**Option B: curl (Any OS)**
```bash
# Status check
curl http://localhost:5000/api/openclaw/status

# Test dispatch
curl -X POST http://localhost:5000/api/openclaw/dispatch \
  -H "Content-Type: application/json" \
  -d '{"event":"test","message":"Hello OpenClaw!"}'
```

**Expected Output:**
```
✓ All tests passed!
Total Tests: 8
Passed: 8
Failed: 0
```

---

## Step 4: View in Admin Panel (1 minute)

1. Open: `http://localhost:5173/pages/admin_dashboard/admin.html`
2. Click **connection status button** (top-left)
3. View **OpenClaw Summary** card
4. Click **[Test Dispatch]** button
5. Click **[📋 View Activity]** to see events

**You should see:**
- 🟢 Green health badge
- State: `ok`
- Errors: `0`
- Test dispatch: `✅ Dispatch successful`

---

## Step 5: Install Watchdog (2 minutes)

**Option A: With Admin Rights**
```powershell
.\infra\openclaw\install-watchdog-task.ps1
```

**Option B: Without Admin Rights**
```powershell
.\infra\openclaw\install-watchdog-startup.ps1
```

**Verify Running:**
```powershell
Get-ScheduledTask -TaskName "PVA-OpenClaw-Watchdog"
# OR
Get-Content .\infra\openclaw\logs\watchdog.log -Tail 10
```

---

## Next Steps

### 🎯 Dispatch Real Events

Add to your backend routes:

```javascript
const { createArtifactEvent, dispatchToOpenClaw } = require('./utils/openclaw-events');

// When artifact is created
router.post('/artifacts', async (req, res) => {
  const artifact = await Artifact.create(req.body);
  
  // Dispatch to OpenClaw
  const event = createArtifactEvent('created', artifact, req.user);
  dispatchToOpenClaw(event);
  
  res.json({ ok: true, artifact });
});
```

### 📊 Monitor Health

**Check logs:**
```powershell
Get-Content .\infra\openclaw\logs\watchdog.log -Tail 20
```

**Check status:**
```bash
curl http://localhost:5000/api/openclaw/watchdog-status
```

**View recent events:**
```bash
curl http://localhost:5000/api/openclaw/recent-events?limit=10
```

### 🚀 Deploy to Production

1. **Set Vercel env vars:**
   - `OPENCLAW_WEBHOOK_URL`
   - `OPENCLAW_API_KEY`
   - `OPENCLAW_GATEWAY_URL`

2. **Deploy backend:**
   ```bash
   vercel --prod
   ```

3. **Install watchdog on server:**
   ```powershell
   .\infra\openclaw\install-watchdog-task.ps1
   ```

4. **Configure alerts:**
   Edit `watchdog-bridge.ps1`:
   ```powershell
   $webhookUrl = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```

---

## Common Commands

| Task | Command |
|------|---------|
| Test integration | `.\infra\openclaw\test-integration.ps1` |
| Test dispatch | `.\infra\openclaw\dispatch-event.ps1 -Event "test" -Message "Hello"` |
| Check watchdog status | `curl http://localhost:5000/api/openclaw/watchdog-status` |
| View recent events | `curl http://localhost:5000/api/openclaw/recent-events` |
| Check watchdog logs | `Get-Content .\infra\openclaw\logs\watchdog.log -Tail 20` |
| Restart watchdog | `Stop-ScheduledTask -TaskName "PVA-OpenClaw-Watchdog"; Start-ScheduledTask -TaskName "PVA-OpenClaw-Watchdog"` |

---

## Troubleshooting

### ❌ "OpenClaw not configured"

**Fix:** Add `OPENCLAW_WEBHOOK_URL` to `backend/.env`

### ❌ Connection status shows red

**Check:**
1. Backend is running: `curl http://localhost:5000/api/health`
2. Webhook URL is accessible: `curl $OPENCLAW_WEBHOOK_URL`
3. Logs for errors: `Get-Content .\infra\openclaw\logs\watchdog.log`

### ❌ Watchdog not running

**Windows:**
```powershell
Get-ScheduledTask -TaskName "PVA-OpenClaw-Watchdog" | Start-ScheduledTask
```

**Manual run:**
```powershell
.\infra\openclaw\watchdog-bridge.ps1
```

---

## Example Events

**Artifact Created:**
```json
{
  "event": "pvabazaar.artifact.created",
  "message": "New Afghan carpet listed",
  "metadata": {
    "artifactId": "65f8a1b2c3d4e5f6a7b8c9d0",
    "title": "Handwoven Afghan Carpet",
    "category": "textiles",
    "userId": "65f8a1b2c3d4e5f6a7b8c9d1"
  }
}
```

**Transaction Confirmed:**
```json
{
  "event": "pvabazaar.transaction.confirmed",
  "message": "Sale completed for artifact",
  "metadata": {
    "transactionId": "tx_abc123",
    "amount": 1500,
    "currency": "USD",
    "artifactId": "65f8a1b2c3d4e5f6a7b8c9d0"
  }
}
```

**System Alert:**
```json
{
  "event": "pvabazaar.system.warning",
  "message": "High error rate detected",
  "metadata": {
    "level": "warning",
    "errorCount": 15,
    "timeWindow": "5m"
  }
}
```

---

## Learn More

- **Complete Guide:** [OPENCLAW_INTEGRATION.md](../../OPENCLAW_INTEGRATION.md)
- **Quick Reference:** [OPENCLAW_QUICK_REFERENCE.md](../../OPENCLAW_QUICK_REFERENCE.md)
- **Architecture:** [OPENCLAW_ARCHITECTURE.md](../../OPENCLAW_ARCHITECTURE.md)
- **Backend API:** [backend/README.md](../../backend/README.md)

---

**Need Help?**  
Check logs → Review docs → Test with verbose flag (`-Verbose`)

**Ready for Production?**  
See [OPENCLAW_INTEGRATION.md](../../OPENCLAW_INTEGRATION.md) deployment guide

---

✅ **You're all set!** OpenClaw is now integrated with PVA Bazaar.
