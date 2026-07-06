# Deployment Checklist & Go-Live Guide

**Date:** January 13, 2026  
**Target:** GitHub Pages Frontend + Vercel Backend  
**Domain:** https://pvabazaar.org

---

## PRE-DEPLOYMENT VERIFICATION

### ✅ Frontend Checks (GitHub Pages)

- [ ] **Build succeeds locally**

  ```bash
  cd Frontend && npm ci && npm run build
  # Should complete without errors
  ```

- [ ] **dist/ contains built files**

  ```bash
  ls Frontend/dist/
  # Should show: index.html, assets/, writings/, etc.
  ```

- [ ] **CNAME file present**

  ```bash
  cat CNAME
  # Should output: pvabazaar.org
  ```

- [ ] **No secrets in .env.production**

  ```bash
  grep -E "SECRET|TOKEN|KEY|PASS" Frontend/.env.production
  # Should return no results
  ```

- [ ] **Vite base path correct**

  ```bash
  grep "base:" Frontend/vite.config.js
  # Should show: base: '/'
  ```

- [ ] **API configuration correct**
  ```bash
  cat Frontend/.env.production
  # Should show: VITE_API_URL=https://pva-backend-api.vercel.app
  ```

### ✅ Backend Checks (Vercel)

- [ ] **Backend builds locally**

  ```bash
  cd backend && npm ci
  node -c api/index.js  # Syntax check
  ```

- [ ] **No secrets in code**

  ```bash
  grep -r "SECRET\|PASSWORD\|MONGODB" backend/ | grep -v node_modules | grep -v ".env"
  # Should return no results (or only from .env)
  ```

- [ ] **CORS fixes applied**

  ```bash
  grep -A5 "getAllowedOrigins" backend/api/index.js
  # Should show helper function
  ```

- [ ] **MongoDB connection safe for serverless**

  ```bash
  grep -A10 "connectToDatabase" backend/api/index.js | grep "global._mongooseConn"
  # Should show caching pattern
  ```

- [ ] **Health endpoint working**

  ```bash
  grep -A5 "api/health" backend/api/index.js | grep "res.json"
  # Should show health response
  ```

- [ ] **Error handlers have CORS headers**
  ```bash
  grep -B2 -A8 "Error handling middleware" backend/api/index.js
  # Should show CORS header setting
  ```

---

## GITHUB SETUP

### ✅ Repository Secrets (for GitHub Actions)

Location: **GitHub UI → Settings → Secrets and variables → Repository secrets**

```
☐ VERCEL_TOKEN
  - Get from: https://vercel.com/account/tokens
  - Format: Long alphanumeric string

☐ VERCEL_ORG_ID
  - Get from: Vercel Dashboard → Settings → General
  - Format: Alphanumeric ID

☐ VERCEL_PROJECT_ID_BACKEND
  - Get from: Vercel Dashboard → Backend Project → Settings → General
  - Format: Alphanumeric ID starting with "prj_"
```

### ✅ Repository Variables (for Workflow)

Location: **GitHub UI → Settings → Secrets and variables → Repository variables**

```
☐ VITE_API_URL
  - Value: https://pva-backend-api.vercel.app
  - (or your actual Vercel backend URL)
```

---

## VERCEL SETUP

### ✅ Backend Project Environment Variables

Location: **Vercel Dashboard → Backend Project → Settings → Environment Variables**

| Variable            | Value                                                                                | Scope      |
| ------------------- | ------------------------------------------------------------------------------------ | ---------- |
| `MONGODB_URI`       | `mongodb+srv://user:pass@cluster.mongodb.net/pva-bazaar?retryWrites=true&w=majority` | Production |
| `JWT_SECRET`        | Generate: `openssl rand -hex 32`                                                     | Production |
| `ADMIN_SECRET_CODE` | Generate random code for admin access                                                | Production |
| `ALLOWED_ORIGIN`    | `https://pvabazaar.org`                                                              | Production |
| `NODE_ENV`          | `production`                                                                         | Production |
| `LEGACY_MODE`       | `false`                                                                              | Production |

**How to Add:**

1. Go to Vercel Backend Project
2. Click "Settings" → "Environment Variables"
3. Add each variable
4. Set scope to "Production"
5. Redeploy after adding

### ✅ Frontend Project (if hosted on Vercel)

If Frontend is also on Vercel:

| Variable       | Value                                | Scope      |
| -------------- | ------------------------------------ | ---------- |
| `VITE_API_URL` | `https://pva-backend-api.vercel.app` | Production |

---

## DNS CONFIGURATION (Already Done ✅)

### Verify GitHub Pages DNS

```bash
nslookup pvabazaar.org
# Should resolve to GitHub Pages IPs:
# 185.199.108.153
# 185.199.109.153
# 185.199.110.153
# 185.199.111.153
```

### Verify CNAME Record

```bash
dig pvabazaar.org CNAME
# May show: pvabazaar.org CNAME pvagr.github.io
# OR directly resolve to IPs above
```

---

## DEPLOYMENT PROCESS

### Step 1: Merge Code Changes ✅ DONE

```bash
git status
# Should show backend/api/index.js modified

git add backend/api/index.js
git commit -m "fix: Add CORS headers to all error responses"
git push origin main
```

### Step 2: Trigger GitHub Actions

**Frontend Deployment:**

- Trigger: Push to `main` with changes in `Frontend/`
- Automated by: [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml)
- Time: ~2-3 minutes

**Backend Deployment:**

- Trigger: Push to `main`
- Automated by: [.github/workflows/deploy-backend.yml](.github/workflows/deploy-backend.yml)
- Time: ~5-10 minutes
- Requires: Vercel secrets set in GitHub

### Step 3: Monitor Deployments

**GitHub Actions:**

```bash
# View workflow status
gh workflow list
gh workflow run status

# View specific workflow
gh workflow view deploy-frontend.yml
gh workflow view deploy-backend.yml
```

**Vercel:**

```bash
# View deployments
vercel list

# View logs
vercel logs pva-backend-api

# View build log
vercel logs pva-backend-api --follow
```

---

## POST-DEPLOYMENT VERIFICATION

### ✅ Phase 1: Immediate Checks (5 minutes)

- [ ] **Frontend loads**

  ```bash
  curl -I https://pvabazaar.org
  # Should return: HTTP/1.1 200 OK
  ```

- [ ] **Frontend can reach API**

  ```bash
  curl -H "Origin: https://pvabazaar.org" \
    https://pva-backend-api.vercel.app/api/health
  # Should include:
  # Access-Control-Allow-Origin: https://pvabazaar.org
  ```

- [ ] **Health endpoint responds**

  ```bash
  curl https://pva-backend-api.vercel.app/api/health | jq .
  # Should show: {"ok":true,"mongo":true,"ready":true,...}
  ```

- [ ] **CORS headers present on all responses**
  ```bash
  curl -v -H "Origin: https://pvabazaar.org" \
    https://pva-backend-api.vercel.app/api/invalid | grep "Access-Control"
  # Should show CORS headers even on 404
  ```

### ✅ Phase 2: Functional Tests (15 minutes)

- [ ] **Visit homepage**

  ```
  https://pvabazaar.org/
  # Should load archive entries
  ```

- [ ] **Navigate routes**

  ```
  https://pvabazaar.org/#/about
  https://pvabazaar.org/#/admin
  https://pvabazaar.org/#/library
  # All should work without 404s
  ```

- [ ] **API calls from frontend**
  - Open browser console (F12)
  - Check Network tab for `/api/archive`, `/api/search`, etc.
  - Verify status: 200 OK
  - Verify CORS headers present

- [ ] **Admin panel accessible**

  ```
  https://pvabazaar.org/#/admin
  # Should show: Login form or admin dashboard
  ```

- [ ] **Error handling works**
  - Try accessing `/api/invalid-endpoint`
  - Should get JSON error with CORS headers
  - Not a browser CORS error

### ✅ Phase 3: Performance & Security (30 minutes)

- [ ] **Page load time**

  ```bash
  curl -w "Total: %{time_total}s\n" \
    https://pvabazaar.org/ -o /dev/null -s
  # Should be < 2 seconds
  ```

- [ ] **HTTPS enforced**

  ```bash
  curl -I http://pvabazaar.org/
  # Should redirect to HTTPS
  ```

- [ ] **CORS blocks invalid origins**

  ```bash
  curl -H "Origin: https://evil.com" \
    https://pva-backend-api.vercel.app/api/health | grep "Access-Control-Allow-Origin"
  # Should NOT include header
  ```

- [ ] **Secrets not exposed**

  ```bash
  curl https://pvabazaar.org/*.env
  curl https://pvabazaar.org/api-keys.json
  # Should all return 404
  ```

- [ ] **Security headers present**
  ```bash
  curl -I https://pvabazaar.org/ | grep -E "X-|Strict-Transport|Content-Security"
  # Check for security headers
  ```

### ✅ Phase 4: Mobile & Accessibility (optional, 15 minutes)

- [ ] **Mobile responsive**
  - Visit on phone/tablet
  - Verify layout adjusts
  - Verify touch interactions work

- [ ] **Keyboard navigation**
  - Press Tab key through page
  - Verify focus visible on all interactive elements
  - Verify links/buttons work with Enter

- [ ] **Screen reader compatible**
  - Test with browser accessibility inspector
  - Check alt text on images
  - Verify heading hierarchy

---

## ROLLBACK PROCEDURE

### If Frontend Breaks

```bash
# Option 1: Revert GitHub Actions
git revert <commit-hash>
git push origin main
# GitHub Actions will automatically redeploy

# Option 2: Manual rollback (if needed)
git log --oneline origin/gh-pages | head -5
git checkout gh-pages
git reset --hard <known-good-commit>
git push origin gh-pages --force
```

### If Backend Breaks

```bash
# Option 1: Vercel automatic rollback
vercel rollback pva-backend-api

# Option 2: Manual rollback
vercel list --json  # Find deployment ID
vercel promote <deployment-id>

# Option 3: Git revert
git revert <commit-hash>
git push origin main
# GitHub Actions will redeploy
```

---

## MONITORING & LOGGING

### Real-time Logs

```bash
# Frontend (GitHub Actions)
gh workflow run --repo PVAGR/pva-bazaar-app -F log=frontend deploy-frontend.yml

# Backend (Vercel)
vercel logs pva-backend-api --follow

# MongoDB (Atlas)
# Login to MongoDB Atlas → Cluster → Logs
```

### Error Alerts

**Set up Vercel alerts:**

1. Go to Vercel Dashboard → Settings → Notifications
2. Enable:
   - [ ] Failed deployments
   - [ ] Function errors
   - [ ] Bandwidth alerts

**Set up GitHub alerts:**

1. Go to GitHub → Settings → Code security → Dependabot
2. Enable:
   - [ ] Dependency alerts
   - [ ] Security alerts

---

## ONGOING MAINTENANCE

### Weekly

- [ ] Check Vercel logs for errors
- [ ] Monitor API response times
- [ ] Check for any failed requests

### Monthly

- [ ] Review GitHub Actions logs
- [ ] Update dependencies: `npm update`
- [ ] Check for security vulnerabilities: `npm audit`

### As Needed

- [ ] Rotate JWT_SECRET (if compromised)
- [ ] Update ALLOWED_ORIGIN if domain changes
- [ ] Add new origins to CORS if needed
- [ ] Update content via Admin panel

---

## CONTACTS & REFERENCES

**Useful URLs:**

- Frontend: https://pvabazaar.org
- Admin Panel: https://pvabazaar.org/#/admin
- Backend Health: https://pva-backend-api.vercel.app/api/health
- GitHub Repo: https://github.com/PVAGR/pva-bazaar-app
- GitHub Actions: https://github.com/PVAGR/pva-bazaar-app/actions
- Vercel Dashboard: https://vercel.com/dashboard

**Documentation:**

- [Full Stack Audit](./FULL_STACK_AUDIT.md)
- [CORS Fix Summary](./CORS_FIX_SUMMARY.md)
- [Vite Config](./Frontend/vite.config.js)
- [Backend Entry Point](./backend/api/index.js)

---

## SUCCESS CRITERIA

✅ **Deployment is successful when:**

1. ✅ Frontend loads at https://pvabazaar.org
2. ✅ All navigation works without errors
3. ✅ API calls succeed from frontend
4. ✅ CORS headers present on all responses
5. ✅ Admin panel accessible at /#/admin
6. ✅ No console errors in browser DevTools
7. ✅ No errors in Vercel logs
8. ✅ Performance metrics acceptable (< 3s load)
9. ✅ Mobile responsive on all devices
10. ✅ Keyboard accessible (Tab navigation works)

---

**Status:** ✅ Ready for Deployment  
**Last Updated:** 2026-01-13  
**Prepared By:** GitHub Copilot Full-Stack Engineer
