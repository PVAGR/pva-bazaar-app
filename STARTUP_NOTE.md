# 📌 STARTUP NOTE - Project Configuration

**Date**: January 13, 2026  
**Status**: Frontend & Backend Connected  
**Last Updated**: Just now

---

## 🎯 CURRENT INFRASTRUCTURE (READ CAREFULLY)

### Frontend 
- **Location**: `/Frontend`
- **Hosting**: GitHub Pages
- **URL**: https://pvabazaar.org
- **Build**: Vite
- **Deployment**: Automatic via GitHub Actions on push to main

### Backend
- **Location**: `/backend`
- **Hosting**: Vercel (existing project: `pva-backend-api`)
- **URL**: https://pva-backend-api.vercel.app
- **Framework**: Express.js + MongoDB
- **Entry Point**: `backend/server.js` (serverless wrapper)

### API Connection
- **Frontend Config**: `Frontend/.env.production`
- **API Base URL**: `VITE_API_URL=https://pva-backend-api.vercel.app`
- **Frontend API Client**: `Frontend/src/lib/api.js` → uses `VITE_API_URL`
- **Fallback**: If env not set, defaults to `https://pva-backend-api.vercel.app`

---

## ✅ WHAT'S DEPLOYED

| Component | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ Live | https://pvabazaar.org |
| Backend | ✅ Live | https://pva-backend-api.vercel.app |
| API Health | ✅ Check | `curl https://pva-backend-api.vercel.app/api/health` |

---

## 🔧 STARTUP CHECKLIST

**Before starting work:**

1. ✅ **Verify Frontend Config**
   ```bash
   cat Frontend/.env.production
   # Should show: VITE_API_URL=https://pva-backend-api.vercel.app
   ```

2. ✅ **Test Backend Health**
   ```bash
   curl https://pva-backend-api.vercel.app/api/health
   # Should return JSON with status
   ```

3. ✅ **Check Git Status**
   ```bash
   git status
   # Ensure main is clean or has only your changes
   ```

4. ✅ **Environment Variables** (if needed)
   - Backend `.env` is for LOCAL development
   - Production vars are set in Vercel Dashboard: https://vercel.com/pvagrs-projects/pva-backend-api/settings/environment-variables
   - DO NOT commit sensitive data to git

---

## 🚀 DEPLOYMENT WORKFLOW

### To Deploy Frontend Changes:
```bash
git add Frontend/...
git commit -m "your message"
git push origin main
# GitHub Actions automatically builds and deploys to GitHub Pages
```

### To Deploy Backend Changes:
```bash
git add backend/...
git commit -m "your message"
git push origin main
# Vercel automatically detects push and rebuilds
# Monitor: https://vercel.com/pvagrs-projects/pva-backend-api/deployments
```

---

## 📂 KEY FILES TO REMEMBER

| File | Purpose | When to Edit |
|------|---------|--------------|
| `Frontend/.env.production` | Frontend production config | If backend URL changes |
| `Frontend/src/lib/api.js` | API client logic | When changing API patterns |
| `backend/server.js` | Serverless entry point | When changing backend initialization |
| `backend/vercel.json` | Vercel build config | When changing build/routes |
| `Frontend/vite.config.js` | Vite build config | When changing frontend build |

---

## ⚠️ DO NOT DO

- ❌ Create new Vercel projects without asking
- ❌ Commit `.env` files with secrets
- ❌ Change backend URL without updating `Frontend/.env.production`
- ❌ Delete extensions without asking why they were created

---

## 🤔 NEED HELP WITH?

**Ask me about:**
1. What extensions are available/needed
2. What markdown docs to create or update
3. How to fix API issues
4. How to test deployments
5. Changes to make to the codebase

**Don't ask me to:**
1. Create new Vercel projects
2. Delete things without documenting
3. Make destructive changes to deployed services

---

## 📝 NOTES FOR FUTURE SESSIONS

This document should be the first thing read when starting work. Update it whenever:
- Infrastructure changes
- New deployment URLs are added
- Important configuration changes
- Critical issues are found

Keep it current and clear!
