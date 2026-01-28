# 🚀 LAUNCH GUIDE - Take PVABazaar to Production

**Status:** Complete step-by-step guide for going live  
**Estimated Time:** 2-4 hours  
**Target Audience:** Developers, DevOps, project leads

---

## Table of Contents

1. [Pre-Launch Checklist](#pre-launch-checklist)
2. [Final Testing](#final-testing)
3. [Backend Deployment (Express)](#backend-deployment-express)
4. [Frontend Deployment (Vite)](#frontend-deployment-vite)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Go Live Ceremony](#go-live-ceremony)
7. [Monitoring & Support](#monitoring--support)
8. [Rollback Procedures](#rollback-procedures)

---

## Pre-Launch Checklist

### Week Before Launch

- [ ] **Code Review**
  - [ ] All PRs merged
  - [ ] No console.logs or debug code
  - [ ] No hardcoded secrets or API keys
  - [ ] All TODOs documented

- [ ] **Security Audit**
  - [ ] Run `npm audit` on all packages
  - [ ] Review JWT secret generation
  - [ ] Verify CORS whitelist (no wildcards)
  - [ ] Check password hashing (bcryptjs)
  - [ ] Verify rate limiting configured

- [ ] **Infrastructure Setup**
  - [ ] MongoDB Atlas cluster (production tier)
  - [ ] Pinata IPFS account (verified)
  - [ ] Vercel account connected to GitHub
  - [ ] GitHub Pages configured
  - [ ] DNS records updated (if custom domain)

- [ ] **Environment Variables**
  - [ ] All `.env.local` keys generated
  - [ ] Secrets NOT in version control
  - [ ] Vercel env vars configured (backend)
  - [ ] GitHub Pages env vars configured (if needed)
  - [ ] API key rotation scheduled

- [ ] **Documentation**
  - [ ] README.md updated
  - [ ] SECURITY.md reviewed
  - [ ] Deployment instructions written
  - [ ] Troubleshooting guide complete
  - [ ] API documentation current

### Day Before Launch

- [ ] **Final Build**
  ```bash
  cd backend && npm run build
  cd Frontend && npm run build
  # Verify no errors
  ```

- [ ] **Performance Testing**
  - [ ] Load test API endpoints
  - [ ] Check database query performance
  - [ ] Verify IPFS upload speed
  - [ ] Monitor memory usage

- [ ] **Database Backup**
  ```bash
  # Export current database (if migrating)
  mongoexport --uri="MONGODB_URI" --collection=users --out=backup_users.json
  mongoexport --uri="MONGODB_URI" --collection=streams --out=backup_streams.json
  ```

- [ ] **Final Communications**
  - [ ] Status page ready
  - [ ] Support team briefed
  - [ ] Stakeholders notified
  - [ ] Maintenance window scheduled (if needed)

---

## Final Testing

### 1. Local Integration Test

```bash
# Backend test
cd backend
npm install
npm run dev
# Keep running, move to next terminal

# Frontend test (new terminal)
cd Frontend
npm install
npm run dev

# Test in browser
open http://localhost:5173
```

**Test Flow:**
1. ✅ Visit landing page (not logged in)
2. ✅ Click "Sign Up"
3. ✅ Create account with test email
4. ✅ Auto-redirected to dashboard
5. ✅ See "No streams yet" message
6. ✅ Verify data export link works
7. ✅ Sign out and sign back in

### 2. API Health Check

```bash
# Health endpoint
curl http://localhost:5001/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-23T..."}

# Database connection
curl http://localhost:5001/api/db/status

# Expected:
# {"status":"connected","version":"7.5.0"}
```

### 3. IPFS Connectivity

```bash
# Test Pinata connection
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_API_SECRET"

# Expected response: {"authenticated":true}
```

### 4. Authentication Test

```bash
# Register user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "displayName": "Test User"
  }'

# Response should include userId and confirmation

# Login
TOKEN=$(curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }' | jq -r '.token')

echo $TOKEN  # Verify token generated

# Use token
curl http://localhost:5001/api/streams \
  -H "Authorization: Bearer $TOKEN"

# Expected: [] (empty streams array)
```

### 5. Load Testing

```bash
# Install Apache Bench
# Mac: brew install httpd
# Linux: sudo apt-get install apache2-utils
# Windows: Download from Apache

# Test 100 requests
ab -n 100 -c 10 http://localhost:5001/api/health

# Look for:
# - Requests per second: >50
# - Failed requests: 0
# - Longest request: <1000ms
```

---

## Backend Deployment (Express)

### Step 1: Prepare Code

```bash
cd backend

# Update version number
# Open package.json, change "version": "1.0.0"

# Verify no secrets committed
git status
# Should NOT show .env file

# Verify .env is in .gitignore
cat .gitignore | grep .env

# Last commit
git log --oneline | head -5
```

### Step 2: Push to GitHub

```bash
# From project root
git add .
git commit -m "chore: prepare v1.0.0 for production deployment"
git push origin main

# Verify on GitHub
open https://github.com/YOUR_USERNAME/pva-bazaar-app
# Should see latest commit
```

### Step 3: Deploy to Vercel

#### Method A: GitHub Integration (Recommended)

1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repo: `pva-bazaar-app`
4. Choose root directory: `backend`
5. Set environment variables:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=<generated-secret>
   PINATA_API_KEY=<your-key>
   PINATA_API_SECRET=<your-secret>
   PINATA_GATEWAY_URL=https://gateway.pinata.cloud
   TWITCH_CLIENT_ID=<optional>
   TWITCH_CLIENT_SECRET=<optional>
   LIVEPEER_API_KEY=<optional>
   NODE_ENV=production
   ```
6. Click "Deploy"
7. Wait ~3-5 minutes for deployment

#### Method B: CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd backend
vercel --prod

# Set environment variables when prompted
# Or use Vercel dashboard after deployment
```

### Step 4: Configure Custom Domain (Optional)

```bash
# In Vercel dashboard
1. Go to Project Settings
2. Click "Domains"
3. Add your domain: pvabazaar-api.com
4. Follow DNS instructions
5. Update NEXTAUTH_URL if using Next.js
```

### Step 5: Verify Backend Deployment

```bash
# Get Vercel URL from dashboard (e.g., https://pvabazaar-api.vercel.app)
BACKEND_URL="https://pvabazaar-api.vercel.app"

# Health check
curl $BACKEND_URL/api/health

# If error, check Vercel logs:
# vercel logs pvabazaar-api
```

---

## Frontend Deployment (Vite)

### Step 1: Build for Production

```bash
cd Frontend

# Production build
npm run build

# Verify build succeeded
ls -la dist/
# Should see index.html, and other files

# Build size check
du -sh dist/
# Should be <2MB
```

### Step 2: Deploy to GitHub Pages

#### Method A: Automatic (Recommended)

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts (already done):
# "deploy": "gh-pages -d dist"

# Deploy
npm run deploy

# Verify
open https://YOUR_USERNAME.github.io/pva-bazaar-app/Frontend
```

#### Method B: Manual

```bash
# Create gh-pages branch
git subtree push --prefix Frontend/dist origin gh-pages

# Verify on GitHub
open https://github.com/YOUR_USERNAME/pva-bazaar-app/settings/pages
# Should show deployed status
```

### Step 3: Configure GitHub Pages

1. Go to repo → Settings → Pages
2. Set source: `Deploy from a branch`
3. Select branch: `gh-pages`
4. Select folder: `/(root)`
5. Save
6. Wait ~2 minutes for deployment

### Step 4: Update Frontend Environment

```bash
# Update Frontend/.env.production
VITE_API_URL=https://pvabazaar-api.vercel.app

# Rebuild with production env
npm run build

# Deploy
npm run deploy
```

### Step 5: Verify Frontend Deployment

```bash
# Test frontend
open https://YOUR_USERNAME.github.io/pva-bazaar-app/Frontend

# Expected:
# - Landing page loads
# - Sign Up button works
# - API calls go to Vercel backend
```

---

## Post-Deployment Verification

### Immediate (< 5 min)

- [ ] Backend health: `curl https://YOUR_BACKEND/api/health`
- [ ] Frontend loads: Open in browser
- [ ] API responding: Can create test account
- [ ] Database connected: No connection errors
- [ ] IPFS working: Can export data

### Within 1 Hour

```bash
# Full test flow
BACKEND="https://YOUR_BACKEND"
FRONTEND="https://YOUR_USERNAME.github.io/pva-bazaar-app/Frontend"

# 1. Register
curl -X POST $BACKEND/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "displayName": "Launch Test User"
  }'

# 2. Verify user in database
mongo $MONGODB_URI \
  -e "db.users.findOne({email: 'test@example.com'})"

# 3. Create stream
TOKEN=$(curl -X POST $BACKEND/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}' \
  | jq -r '.token')

curl -X POST $BACKEND/api/streams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Launch Test Stream",
    "platform": "twitch"
  }'

# 4. Create journal entry
curl -X POST $BACKEND/api/journal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Launch Day Reflection",
    "content": "We did it!",
    "mood": "uplifting"
  }'

# 5. Export data
curl $BACKEND/api/users/export \
  -H "Authorization: Bearer $TOKEN" \
  > export_$(date +%s).json

# 6. Verify export contains data
unzip export_*.json | grep -c "Launch Test"
# Should output: 1 or more
```

### Within 24 Hours

- [ ] Monitor error rates (Vercel dashboard)
- [ ] Check database performance
- [ ] Verify IPFS uploads working
- [ ] Monitor API response times
- [ ] Test with production data
- [ ] Gather user feedback

---

## Go Live Ceremony

### Pre-Announcement (4 Hours Before)

1. **Notify Stakeholders**
   ```
   "PVABazaar is launching in 4 hours!
   
   Backend: https://pvabazaar-api.vercel.app
   Frontend: https://username.github.io/pva-bazaar-app
   
   Features:
   - Decentralized livestreaming
   - Autonomous journal entries
   - IPFS recording
   - Full data ownership
   
   Sign up early access: [LINK]"
   ```

2. **Enable Monitoring**
   - [ ] Enable Vercel alerts
   - [ ] Enable monitoring dashboard
   - [ ] Prepare support channels
   - [ ] Brief support team

3. **Final Checks**
   - [ ] One more production test flow
   - [ ] Verify all dependencies deployed
   - [ ] Confirm database backups
   - [ ] Test error recovery procedures

### Launch Announcement

```
🚀 PVABAZAAR BLUEPRINT V1 IS LIVE! 🚀

Reclaim your digital autonomy.

For the first time in internet history, you can:
✅ Stream to Twitch/Kick
✅ Simultaneously record to YOUR OWN IPFS
✅ Journal your reflections
✅ Control your data completely
✅ Export everything anytime

"Open the doorway at the top of your brain.
 Experience vulnerability.
 Break the callus off our minds.
 One day, one year, one century at a time."

👉 Try it now: [FRONTEND_URL]
🔗 Full docs: [README_URL]
🤝 Fork and customize: [GITHUB_URL]
💬 Questions? [SUPPORT_URL]

#DecentralizedStreaming #DataOwnership #Consciousness
```

### First 24 Hours

- ✅ Monitor errors continuously
- ✅ Respond to user questions
- ✅ Document any issues
- ✅ Celebrate with community!
- ✅ Gather feedback for v1.1

---

## Monitoring & Support

### Vercel Monitoring

1. **Dashboard:** https://vercel.com/dashboard
2. **Metrics to watch:**
   - Response time (target: <200ms)
   - Error rate (target: <0.1%)
   - CPU usage (target: <50%)
   - Memory usage (target: <256MB)

3. **Set alerts:**
   - Error rate > 1%
   - Response time > 1s
   - Deployment failed

### Error Response Procedures

#### 500 Server Error

```bash
# Check Vercel logs
vercel logs pvabazaar-api

# Common causes:
# 1. Database connection failed
# 2. Invalid environment variable
# 3. Out of memory

# Quick fix:
# - Redeploy: vercel --prod
# - Check .env variables in Vercel dashboard
# - Increase MongoDB connection pool
```

#### Database Connection Failed

```bash
# Check MongoDB Atlas
# 1. Verify IP whitelist (MongoDB Atlas dashboard)
# 2. Verify credentials (check MONGODB_URI)
# 3. Check connection pool status

# Restart connection
# In Vercel, redeploy (forces new connection)
```

#### IPFS Upload Timeout

```bash
# Check Pinata status
# 1. Verify API keys
# 2. Check account quota
# 3. Try uploading smaller files

# Fallback: Queue uploads for retry
```

### Support Channels

- **GitHub Issues** - Bug reports, feature requests
- **Email** - security@pvabazaar.org
- **Discord** (if applicable) - Community support
- **Status Page** - Uptime monitoring

---

## Rollback Procedures

### If Critical Error (Immediate)

```bash
# Pause traffic (CORS blacklist) OR
# Revert last deployment in Vercel dashboard:
# 1. Go to Deployments
# 2. Find previous stable deployment
# 3. Click "Redeploy"
# 4. Wait ~2-3 minutes

# OR manually rollback
git revert HEAD
git push origin main
# Auto-deploys to Vercel
```

### If Database Corruption

```bash
# Restore from backup
# 1. MongoDB Atlas: Restore from snapshot
# 2. Check PITR (Point-in-Time Recovery)
# 3. Restore to pre-incident time

# Verify data integrity
mongo $MONGODB_URI -e "db.stats()"
```

### If IPFS Issue

```bash
# IPFS data is permanent, can't delete
# But can pause new uploads:
# 1. Disable stream recording (temporary)
# 2. Fix Pinata account issue
# 3. Resume recording

# All data still on IPFS - recoverable anytime
```

### Post-Incident Checklist

After resolving any critical issue:

- [ ] Write incident report
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Deploy fix to production
- [ ] Verify resolution
- [ ] Notify users
- [ ] Schedule postmortem
- [ ] Update documentation

---

## Success Metrics (First Month)

### Technical

| Metric | Target | Current |
|--------|--------|---------|
| Uptime | 99.9% | TBD |
| Response Time | <200ms | TBD |
| Error Rate | <0.1% | TBD |
| IPFS Upload Success | 99.5% | TBD |
| Database Capacity | <50% used | TBD |

### User

| Metric | Target | Current |
|--------|--------|---------|
| Signups | 100+ | TBD |
| Active Users | 50+ | TBD |
| Streams Created | 20+ | TBD |
| Journal Entries | 50+ | TBD |
| Data Exported | 10+ users | TBD |

### Community

| Metric | Target | Current |
|--------|--------|---------|
| GitHub Stars | 50+ | TBD |
| Forks | 5+ | TBD |
| PRs/Issues | 10+ | TBD |
| Blog Posts | 3+ | TBD |
| Social Mentions | 100+ | TBD |

---

## Post-Launch (Week 2+)

### Planned Improvements

- [ ] Add analytics dashboard
- [ ] Implement email notifications
- [ ] Add password reset flow
- [ ] Create mobile app skeleton
- [ ] Write OBS setup guide
- [ ] Create video tutorials

### Community Engagement

- [ ] Launch bug bounty program (if security-focused)
- [ ] Create contributor guide
- [ ] Plan community calls
- [ ] Encourage forks/customizations
- [ ] Document community instances

### Prepare v1.1

- [ ] Backlog feature requests
- [ ] Plan bug fixes
- [ ] Schedule release date (4 weeks out)
- [ ] Start v1.1 development branch

---

## Checklist Summary

**Before Launch**
- [ ] Code reviewed and tested
- [ ] Security audit complete
- [ ] All environment variables set
- [ ] Database backed up
- [ ] Documentation complete
- [ ] Support team ready

**Launch Day**
- [ ] Final local test pass
- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to GitHub Pages
- [ ] Post-deployment verification complete
- [ ] Announcement made
- [ ] Monitoring active

**After Launch**
- [ ] Monitor for 24 hours continuously
- [ ] Respond to user issues
- [ ] Collect feedback
- [ ] Plan v1.1
- [ ] Write postmortem if needed

---

## Support

Questions during deployment?

1. Check [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
2. Review [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
3. Open [GitHub Issue](https://github.com/YOUR_USERNAME/pva-bazaar-app/issues)
4. Check [STATUS_PAGE.md](STATUS_PAGE.md)

---

**You've got this.** 🚀

The future of decentralized streaming is in your hands. Launch with confidence, support your community, and help reclaim digital autonomy one broadcast at a time.

*"Open the doorway at the top of your brain."*

**Go live!**

---

**Last Updated:** January 23, 2026  
**Status:** Ready for production deployment  
**Version:** Blueprint v1 Launch Guide
