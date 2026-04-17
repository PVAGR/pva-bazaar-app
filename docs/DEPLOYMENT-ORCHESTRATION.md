# 🚀 Deployment Orchestration Guide
## Collaborative Library Module - From Code to Production

**Status:** Code complete, awaiting Render credential configuration  
**Latest Commit:** `fa2378a5` - All fixes merged to main  
**Live Render SHA:** `6cb7cbd9` (stale - needs credential setup)  

---

## Summary: What's Ready to Deploy

### Code Changes
- ✅ **backend/routes/library.js** - Collaborative article/document library with moderation
- ✅ **backend/models/LibraryArticle.js** - Article schema with versioning support
- ✅ **backend/models/LibraryDocument.js** - Document/version tracking
- ✅ **backend/models/ModerationLog.js** - Audit trail
- ✅ **Frontend/pages/library.html** - Public library interface
- ✅ **.github/workflows/deploy-render.yml** - Multi-path deployment (webhook + API fallback)
- ✅ **docs/DEPLOYMENT-VERIFY-LIBRARY.md** - Comprehensive verification steps
- ✅ **scripts/verify-library-deployment.sh** - Bash verification script
- ✅ **scripts/verify-library-deployment.ps1** - PowerShell verification script
- ✅ **backend/routes/__tests__/library.test.js** - Complete test suite

### Critical Fixes Included
- 🔧 **404 Error Handling:** Invalid article IDs now return 404 instead of 500 (proof of deployment)
- 🔧 **ObjectId Validation:** `mongoose.Types.ObjectId.isValid()` guard prevents cast errors
- 🔧 **Slug Fallback:** Graceful degradation when ObjectId lookup fails

---

## Step 1: Configure Render Deployment Credentials (Required)

### Option A: Webhook (Recommended - Easiest)

1. **Get Webhook URL from Render**
   ```
   1. Go to https://dashboard.render.com
   2. Select service: "pva-bazaar-app-1"
   3. Settings tab → Deploy Hook → Copy URL
   4. (URL format: https://api.render.com/deploy/srv-d7etc3n41pts73f3b0fg?key=XXXXX)
   ```

2. **Add to GitHub Repository Secrets**
   ```
   1. Go to: github.com/PVAGR/pva-bazaar-app
   2. Settings → Secrets and variables → Actions
   3. Click "New repository secret"
   4. Name: RENDER_DEPLOY_HOOK
   5. Value: (paste webhook URL from step 1)
   6. Click "Add secret"
   ```

3. **Trigger Deployment**
   ```bash
   # Make any commit and push to main
   git commit --allow-empty -m "trigger: activate render deployment"
   git push origin main
   
   # GitHub Actions will automatically:
   # 1. Run deploy workflow
   # 2. POST to Render webhook
   # 3. Render will deploy your code
   ```

### Option B: API Token (Alternative)

1. **Create Render API Token**
   ```
   1. Go to https://render.com/account/api-tokens
   2. Click "Create new API token"
   3. Copy the token (save it somewhere safe)
   4. From your Render dashboard, note the service ID: srv-d7etc3n41pts73f3b0fg
   ```

2. **Add to GitHub Repository Secrets**
   ```
   Name: RENDER_API_TOKEN
   Value: (your API token)
   
   Name: RENDER_SERVICE_ID
   Value: srv-d7etc3n41pts73f3b0fg
   ```

3. **Trigger Deployment**
   ```bash
   git commit --allow-empty -m "trigger: activate render deployment via api"
   git push origin main
   ```

---

## Step 2: Monitor Deployment

### Watch GitHub Actions
```bash
# View workflow runs
open https://github.com/PVAGR/pva-bazaar-app/actions

# Or check from command line
gh run list --repo PVAGR/pva-bazaar-app --limit 1 --json status,conclusion,name

# Watch in real-time (if gh CLI installed)
gh run watch
```

### Expected Workflow Flow
```
Push to main
   ↓
GitHub Actions triggered
   ↓
🚀 Auto-Deploy to Render.com workflow runs
   ↓
📡 Render webhook/API called
   ↓
Render build starts (~2-3 minutes)
   ↓
✅ Deployment complete
   ↓
Live SHA advances to fa2378a5
```

### Timeline
- **T+0s:** Workflow starts
- **T+30s:** Webhook/API request sent to Render
- **T+40s:** Render receives and queues deploy
- **T+60s:** Render build begins
- **T+120s:** Build completes, service restarts
- **T+180s:** Live version updated (check /api/version)

---

## Step 3: Verify Deployment Success

### Automated Verification (Recommended)

**Option A: PowerShell (Windows)**
```powershell
# Run after ~3 minutes
.\scripts\verify-library-deployment.ps1

# Or specify a custom URL
.\scripts\verify-library-deployment.ps1 -ApiBase "https://pva-bazaar-app-1.onrender.com"
```

**Option B: Bash (macOS/Linux)**
```bash
# Run after ~3 minutes
bash scripts/verify-library-deployment.sh

# Or specify a custom URL
bash scripts/verify-library-deployment.sh "https://pva-bazaar-app-1.onrender.com"
```

### Manual Verification Steps

1. **Check SHA Advanced**
   ```bash
   curl -s https://pva-bazaar-app-1.onrender.com/api/version | jq '.sha'
   # Should show: fa2378a5... or later (NOT 6cb7cbd9)
   ```

2. **Test 4 Critical Endpoints**
   ```bash
   # 1. Public list (should be 200)
   curl -w '\n%{http_code}\n' https://pva-bazaar-app-1.onrender.com/api/library?kind=articles&limit=1
   
   # 2. Submit without auth (should be 401)
   curl -w '\n%{http_code}\n' -X POST https://pva-bazaar-app-1.onrender.com/api/library/submit -d '{}' -H 'Content-Type: application/json'
   
   # 3. Pending without auth (should be 401)
   curl -w '\n%{http_code}\n' https://pva-bazaar-app-1.onrender.com/api/library/pending
   
   # 4. Invalid article (should be 404 - THIS IS THE KEY TEST!)
   curl -w '\n%{http_code}\n' https://pva-bazaar-app-1.onrender.com/api/library/does-not-exist
   ```

3. **Expected Results**
   ```
   ✅ GET /api/library?... → 200 OK (with articles array)
   ✅ POST /api/library/submit → 401 Unauthorized
   ✅ GET /api/library/pending → 401 Unauthorized
   ✅ GET /api/library/does-not-exist → 404 Not Found ← PROOF OF FIX!
   ```

### Success Criteria Met
- [ ] SHA advanced past `6cb7cbd9`
- [ ] All 4 endpoints return correct status codes
- [ ] Invalid article returns **404** (not 500)
- [ ] GitHub Actions workflow shows ✅ success

---

## Troubleshooting

### Deployment Not Triggered
**Problem:** Pushed code but no workflow run appears  
**Solution:**
1. Check webhook secret is correct (no typos)
2. Verify secret is in "Secrets and variables → Actions", not just "Secrets"
3. Try re-pushing with `git push --force-with-lease`
4. Check GitHub Actions tab for error logs

### Webhook Returns 403/401
**Problem:** Render webhook endpoint rejects request  
**Solution:**
1. Webhook URL may have expired (Render rotates them)
2. Re-copy webhook URL from Render dashboard
3. Update `RENDER_DEPLOY_HOOK` secret with new URL
4. Re-push to main

### API Token Returns 401
**Problem:** Render API authentication fails  
**Solution:**
1. API token may have expired
2. Generate new token: https://render.com/account/api-tokens
3. Update both `RENDER_API_TOKEN` and verify `RENDER_SERVICE_ID` is correct
4. Re-push to main

### Deployment Completes but SHA Still Old
**Problem:** Render deployed but `/api/version` still shows old SHA  
**Solution:**
1. Wait additional 1-2 minutes for service to fully restart
2. Clear browser cache and retry
3. Check Render dashboard build logs for errors
4. Render may have rolled back due to startup errors; check logs

### Live Endpoint Still Returns 500
**Problem:** GET /api/library/does-not-exist returns 500 instead of 404  
**Solution:**
1. New code not deployed yet (check SHA with /api/version)
2. Wait 2-3 minutes and retry
3. If SHA is correct but still 500, check backend logs in Render dashboard
4. May need to manually restart service in Render

---

## Post-Deployment Tasks

### 1. Update Documentation
- [ ] Update API docs with library endpoints
- [ ] Add library module to main README
- [ ] Document authentication requirements

### 2. Set Up Monitoring
- [ ] Add `/api/library/*` endpoints to health check
- [ ] Monitor endpoint response times
- [ ] Alert on 500 errors

### 3. Enable Features
- [ ] Configure OpenClaw webhooks for library events
- [ ] Set up email notifications for submissions
- [ ] Enable rate limiting on `/api/library/submit`

### 4. Next Phase Work
- [ ] Implement library moderation dashboard
- [ ] Add author reputation system
- [ ] Create library discovery/search features
- [ ] Integrate with archive verification

---

## References

- **Deployment Files:**
  - [.github/workflows/deploy-render.yml](.github/workflows/deploy-render.yml)
  - [docs/DEPLOYMENT-VERIFY-LIBRARY.md](docs/DEPLOYMENT-VERIFY-LIBRARY.md)

- **Verification Scripts:**
  - [scripts/verify-library-deployment.sh](scripts/verify-library-deployment.sh)
  - [scripts/verify-library-deployment.ps1](scripts/verify-library-deployment.ps1)

- **Test Suite:**
  - [backend/routes/__tests__/library.test.js](backend/routes/__tests__/library.test.js)

- **Code Changes:**
  - [backend/routes/library.js](backend/routes/library.js)
  - [backend/models/LibraryArticle.js](backend/models/LibraryArticle.js)
  - [backend/models/LibraryDocument.js](backend/models/LibraryDocument.js)

---

## Quick Start (TL;DR)

1. **Get Render webhook:** Dashboard.render.com → Settings → Deploy Hook → Copy
2. **Add to GitHub:** Settings → Secrets → New secret → `RENDER_DEPLOY_HOOK` → Paste
3. **Deploy:** `git commit --allow-empty -m "deploy" && git push`
4. **Verify:** `.\scripts\verify-library-deployment.ps1` (after 3 minutes)
5. **Check SHA:** `curl -s https://pva-bazaar-app-1.onrender.com/api/version | jq '.sha'`

Done! 🎉
