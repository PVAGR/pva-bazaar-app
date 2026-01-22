# Production Deployment Guide - PVA Bazaar

**Status:** ✅ Ready to Deploy  
**Date:** January 21, 2026  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Deployment (Vercel)](#backend-deployment-vercel)
3. [Frontend Deployment (GitHub Pages)](#frontend-deployment-github-pages)
4. [Domain & DNS Configuration](#domain--dns-configuration)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

Your project is production-ready! The key fixes have been applied:

✅ **Vite port configuration fixed** - Frontend now uses port 5173  
✅ **Backend metrics fixed** - Using real database queries  
✅ **Both build successfully** - Ready for production  
✅ **Security verified** - Stripe webhook, CORS, rate limiting all working

---

## Backend Deployment (Vercel)

### Step 1: Deploy Backend to Vercel

```bash
# From project root
cd backend

# Login to Vercel (first time only)
npx vercel login

# Deploy
npx vercel --prod
```

### Step 2: Configure Backend Environment Variables

After deployment, go to Vercel dashboard and add these variables:

```env
NODE_ENV=production
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<generate-a-strong-random-secret>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
SENTRY_DSN=<your-sentry-dsn>
CORS_ALLOWED_ORIGINS=https://pvabazaar.org,https://www.pvabazaar.org
ADMIN_SECRET_CODE=<strong-random-code>
```

### Step 3: Get Backend URL

After deployment, Vercel will provide a URL like:
```
https://pva-bazaar-backend.vercel.app
```

Save this for frontend configuration.

---

## Frontend Deployment (GitHub Pages)

### Step 1: Build Frontend

```bash
cd Frontend
npm run build
```

This creates optimized files in `Frontend/dist/`

### Step 2: Create `.env.production` for Frontend

```bash
# Frontend/.env.production
VITE_API_URL=https://pva-bazaar-backend.vercel.app
VITE_BASE_PATH=/
```

### Step 3: Deploy to GitHub Pages

**Option A: Using GitHub Actions (Recommended)**

The project already has GitHub Actions configured. Push your changes:

```bash
git add .
git commit -m "feat: production deployment ready"
git push origin main
```

GitHub Actions will automatically build and deploy to GitHub Pages.

**Option B: Manual Deployment**

```bash
# Install GitHub Pages deployer
npm install --save-dev gh-pages

# Deploy
npx gh-pages -d Frontend/dist
```

### Step 4: Configure GitHub Pages

1. Go to your repo Settings → Pages
2. Set source to `gh-pages` branch
3. Click Save

---

## Domain & DNS Configuration

### Option A: Using Custom Domain

1. **In Vercel (Backend):**
   - Project Settings → Domains
   - Add domain: `api.pvabazaar.org`
   - Follow DNS configuration

2. **In GitHub Pages (Frontend):**
   - Create `Frontend/public/CNAME` file:
   ```
   pvabazaar.org
   ```
   - Add DNS records

3. **DNS Records Needed:**
   ```
   # For GitHub Pages (Frontend)
   Type: CNAME
   Name: @
   Value: <your-username>.github.io

   # For Vercel (Backend)  
   Type: CNAME
   Name: api
   Value: cname.vercel.com
   (then follow Vercel's specific DNS configuration)
   ```

### Option B: Using Subdomains

```
Frontend: https://www.pvabazaar.org → GitHub Pages
Backend:  https://api.pvabazaar.org → Vercel
```

---

## Environment Variables

### Production Environment Variables

**Backend (Vercel):**

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `MONGODB_URI` | MongoDB Atlas connection string | Atlas dashboard |
| `JWT_SECRET` | Secret for JWT tokens | Generate: `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | Stripe API secret | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Stripe dashboard |
| `SENTRY_DSN` | Error tracking URL | Sentry project settings |
| `NODE_ENV` | Set to `production` | Manual |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins | Your domain URLs |
| `ADMIN_SECRET_CODE` | Admin access code | Generate secure string |

**Frontend (.env.production):**

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | Your backend URL | e.g., https://api.pvabazaar.org |
| `VITE_BASE_PATH` | `/` | For root domain deployment |

---

## Post-Deployment Verification

### ✅ Checklist

```bash
# 1. Frontend loads
curl -I https://pvabazaar.org
# Should return: 200 OK

# 2. Backend responds
curl https://api.pvabazaar.org/health
# Should return: {"ok": true}

# 3. API calls work
curl -X GET https://api.pvabazaar.org/marketplace/stats
# Should return: {ok: true, activeListings: X, ...}

# 4. Database connection
# Check logs in Vercel dashboard
# Should show: ✅ MongoDB connected

# 5. Stripe webhook
# Test via Stripe dashboard CLI
stripe listen --forward-to https://api.pvabazaar.org/webhooks/stripe
```

### Manual Testing

1. **Visit Frontend:** https://pvabazaar.org
2. **Check Console:** Should have no CORS errors
3. **Test Marketplace:** Navigate to marketplace page
4. **Test Auth:** Try login/signup
5. **Test Orders:** Create test order with Stripe test card

---

## Monitoring & Maintenance

### View Logs

**Backend (Vercel):**
```bash
# View Vercel logs
vercel logs --prod
```

**Frontend (GitHub Pages):**
- Uses GitHub Actions logs
- Check Actions tab in GitHub

### Monitor Errors

- **Sentry:** https://sentry.io (check your project)
- **MongoDB Atlas:** Check connection and database metrics
- **Stripe Dashboard:** Monitor transactions

### Performance Monitoring

```bash
# Check Lighthouse scores
npm run qa:lighthouse

# Run load tests
npm run qa:artillery

# Accessibility audit
npm run qa:accessibility
```

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Solution:**
```bash
# Reinstall dependencies
npm run clean:full
npm install
npm run build:backend
npm run build:frontend
```

### Issue: CORS errors in browser

**Solution:**
1. Check `CORS_ALLOWED_ORIGINS` in Vercel backend settings
2. Ensure frontend URL is included
3. Clear browser cache and try again

### Issue: "MongoDB connection failed"

**Solution:**
1. Check `MONGODB_URI` is correct
2. Verify IP whitelist in MongoDB Atlas
3. Check network connectivity

### Issue: Stripe webhook not working

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches
2. Check webhook endpoint in Stripe dashboard
3. View webhook delivery logs in Stripe

### Issue: Frontend not loading

**Solution:**
1. Check GitHub Pages is enabled
2. Verify build completed in GitHub Actions
3. Check `CNAME` file exists in dist/

### Issue: "Port already in use" (Local)

**Solution:**
```bash
# Kill process on port 5001 (backend)
lsof -ti:5001 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

---

## 📞 Support

### Getting Help

1. **Check Logs:**
   - Vercel: Dashboard → Logs
   - GitHub Pages: Actions → Workflow logs
   - Local: Terminal output

2. **Common Commands:**
   ```bash
   npm run dev:backend    # Start local backend
   npm run dev:frontend   # Start local frontend
   npm run build:backend  # Build backend
   npm run build:frontend # Build frontend
   ```

3. **Environment Check:**
   ```bash
   node --version         # Should be 20.x
   npm --version          # Should be 10.x
   ```

---

## 🎯 Next Steps

1. **Deploy Backend:** Follow [Backend Deployment](#backend-deployment-vercel) steps
2. **Deploy Frontend:** Follow [Frontend Deployment](#frontend-deployment-github-pages) steps
3. **Configure Domain:** Set up custom domain (optional)
4. **Monitor:** Check logs and set up alerts
5. **Scale:** Monitor performance and optimize as needed

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│      Frontend (React + Vite)                                │
│      🌐 pvabazaar.org                                       │
│      📍 Hosted on GitHub Pages                              │
│      ✓ Static site with SPA routing                         │
└────────────────┬────────────────────────────────────────────┘
                 │ API Calls (HTTPS)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│      Backend (Express.js)                                   │
│      🌐 api.pvabazaar.org                                   │
│      📍 Hosted on Vercel (Serverless)                       │
│      ✓ RESTful API with CORS                                │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    MongoDB         Stripe API
    (Atlas)         (Payments)
```

---

## ✨ What's Included

- ✅ Frontend builds without errors
- ✅ Backend runs on port 5001
- ✅ Database connection pooling optimized for serverless
- ✅ Rate limiting on all endpoints
- ✅ Error tracking with Sentry
- ✅ Security headers with Helmet
- ✅ CORS properly configured
- ✅ JWT authentication working
- ✅ Stripe webhook validation
- ✅ Admin secret code authentication

---

## 🎉 You're Ready!

Your PVA Bazaar application is production-ready. Follow the steps above to deploy to Vercel (backend) and GitHub Pages (frontend), and you'll have a live marketplace available online for anyone to access!

**Questions?** Check the [Troubleshooting](#troubleshooting) section or review logs in Vercel/GitHub dashboards.
