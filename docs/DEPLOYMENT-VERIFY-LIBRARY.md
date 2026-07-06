# Deployment Verification: Collaborative Library Module

## Current Status

**Code Status:** ✅ Complete and committed to main

- SHA: `fa2378a5c1a4a6a5b969330b0dd6fbef7bb9a85b`
- All fixes merged: library routes, MongoDB error handling, CI/CD hardening

**Live Status:** ⏳ Awaiting Render deployment

- Live backend SHA: `6cb7cbd9c43406b57e1a1b62a38c0999e66add55` (old)
- Live URL: https://pva-bazaar-app-1.onrender.com

**Blocker:** Render deployment credentials not configured in GitHub repo

- Solution: Configure `RENDER_DEPLOY_HOOK` OR (`RENDER_API_TOKEN` + `RENDER_SERVICE_ID`) in repo secrets/vars
- Once configured: Next push to main will trigger auto-deployment

---

## Post-Deployment Verification Steps

Once deployment completes and live SHA advances past `6cb7cbd9`:

### 1. Verify Backend SHA

```bash
curl -s https://pva-bazaar-app-1.onrender.com/api/version | jq '.sha'
# Expected: fa2378a5... (or later)
```

### 2. Test Library Endpoints (4 endpoints)

#### Endpoint 1: List Articles (Public)

```bash
curl -s 'https://pva-bazaar-app-1.onrender.com/api/library?kind=articles&limit=3' | jq '.'
# Expected: 200 OK with article array
```

#### Endpoint 2: Submit Article (Auth Required)

```bash
curl -s -X POST https://pva-bazaar-app-1.onrender.com/api/library/submit \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test"}' | jq '.status'
# Expected: 401 Unauthorized (no auth token)
```

#### Endpoint 3: Pending Articles (Auth Required)

```bash
curl -s https://pva-bazaar-app-1.onrender.com/api/library/pending | jq '.status'
# Expected: 401 Unauthorized (no auth token)
```

#### Endpoint 4: Get Invalid Article → **404 (Critical Fix)**

```bash
curl -s -w '\nStatus: %{http_code}\n' \
  https://pva-bazaar-app-1.onrender.com/api/library/does-not-exist | jq '.'
# Expected: 404 Not Found (this was returning 500 before the fix)
# This endpoint proves the fix is deployed
```

### 3. Verify Database Entries

```bash
# From backend terminal, connect to MongoDB production and verify:
db.libraryarticles.find().limit(1)
# Expected: At least one published article
```

### 4. Check CI/CD Logs

- GitHub Actions: https://github.com/PVAGR/pva-bazaar-app/actions
- Look for latest `🚀 Auto-Deploy to Render.com` workflow
- Should show: ✅ Deploy triggered successfully

---

## Local Pre-Deployment Testing

Run these tests locally before deployment credentials are configured:

### Test 1: Backend Route Syntax

```bash
cd backend
npm test -- routes/library.test.js
# Or manually:
npm start
# Then in another terminal:
curl -s http://localhost:5001/api/library?kind=articles
```

### Test 2: ObjectId Validation

```bash
# Start backend locally
npm start

# Test valid article request (should return empty or existing articles)
curl -s 'http://localhost:5001/api/library?kind=articles'

# Test invalid ObjectId (should return 404, not 500)
curl -s -w '\nStatus: %{http_code}\n' http://localhost:5001/api/library/invalid-id-12345
# Should show: 404

# Test invalid ObjectId with special chars (should return 404, not 500)
curl -s -w '\nStatus: %{http_code}\n' http://localhost:5001/api/library/../../etc/passwd
# Should show: 404
```

### Test 3: Docker Build

```bash
docker build -t pva-bazaar-test .
docker run -p 5001:5001 -e MONGODB_URI=mongodb://mongo:27017/pvabazaar pva-bazaar-test
# Then test endpoints against localhost:5001
```

---

## Deployment Credential Configuration

### Option A: Webhook (Easiest)

1. Go to https://dashboard.render.com
2. Select service: `pva-bazaar-app-1`
3. Settings → Deploy Hook → Copy webhook URL
4. GitHub repo → Settings → Secrets and variables → Actions
5. Add Secret: `RENDER_DEPLOY_HOOK` = (webhook URL)
6. Push any commit to main to trigger deployment

### Option B: API Token

1. Go to https://render.com/account/api-tokens
2. Create new token (copy it)
3. GitHub repo → Settings → Secrets and variables → Actions
4. Add secrets:
   - `RENDER_API_TOKEN` = (your token)
   - `RENDER_SERVICE_ID` = `srv-d7etc3n41pts73f3b0fg`
5. Push any commit to main to trigger deployment

### Verification After Configuration

```bash
# Monitor GitHub Actions
git push  # Any commit will trigger workflow
# Watch: https://github.com/PVAGR/pva-bazaar-app/actions

# Wait ~2-3 minutes for Render deployment
# Check live version:
curl -s https://pva-bazaar-app-1.onrender.com/api/version | jq '.sha'
# Should show: fa2378a5... or later
```

---

## Rollback Plan (if needed)

If deployment fails:

1. Check GitHub Actions workflow logs
2. Common issues:
   - Webhook URL invalid/expired: Update `RENDER_DEPLOY_HOOK` in secrets
   - API token invalid: Regenerate and update `RENDER_API_TOKEN`
   - Service ID wrong: Verify in Render dashboard (should be `srv-d7etc3n41pts73f3b0fg`)
3. Revert specific commits if code issues detected:
   ```bash
   git revert fa2378a5  # Revert latest fixes if needed
   git push
   # Render will auto-deploy again
   ```

---

## Success Criteria

✅ All 4 library endpoints responding with correct status codes:

- GET /api/library?kind=articles → 200
- POST /api/library/submit (no auth) → 401
- GET /api/library/pending (no auth) → 401
- GET /api/library/invalid-id → **404** ← Key proof of deployment

✅ Backend SHA advanced from 6cb7cbd9 to fa2378a5 or later

✅ CI/CD workflow completed successfully in GitHub Actions

---

## Next Steps (Post-Deployment)

1. Update CI/CD monitoring dashboard
2. Add library endpoints to production health check
3. Configure OpenClaw webhooks for library events
4. Document library API in public API docs
5. Set up rate limiting for /api/library/submit endpoint
