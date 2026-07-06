# 🚀 Quick Deployment Checklist

**Project:** PVA Bazaar  
**Status:** ✅ READY TO DEPLOY  
**Last Updated:** January 21, 2026

---

## ✅ Pre-Deployment Verification

- [x] Frontend builds successfully → `npm run build:frontend` ✓
- [x] Backend starts without errors → `npm run dev:backend` ✓
- [x] Vite port configured correctly (5173) ✓
- [x] Backend API proxy correct (localhost:5001) ✓
- [x] Database queries working (real data from DB) ✓
- [x] Stripe webhook validation in place ✓
- [x] CORS configuration complete ✓
- [x] Rate limiting active ✓
- [x] JWT authentication working ✓
- [x] Sentry error tracking configured ✓

---

## 🔧 Local Testing (DO FIRST)

### Terminal 1 - Backend

```bash
cd backend
npm run dev
# Expected: 🚀 Server running on http://localhost:5001
```

### Terminal 2 - Frontend

```bash
cd Frontend
npm run dev
# Expected: ➜  Local:   http://localhost:5173/
```

### Test Browser

- Open http://localhost:5173
- Check Console for errors
- Navigate around the app
- Test marketplace page

---

## 🌐 Deploy Backend to Vercel

### Step 1: Login to Vercel

```bash
cd backend
npx vercel login
```

### Step 2: Deploy

```bash
npx vercel --prod
```

### Step 3: Add Environment Variables

Go to Vercel Dashboard → Project Settings → Environment Variables

Add these variables:

```
NODE_ENV=production
MONGODB_URI=<your-connection-string>
JWT_SECRET=<generate-secure-value>
STRIPE_SECRET_KEY=<stripe-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook>
SENTRY_DSN=<sentry-dsn>
CORS_ALLOWED_ORIGINS=https://pvabazaar.org
ADMIN_SECRET_CODE=<admin-code>
```

### Result

You'll get a URL like: `https://pva-bazaar-backend.vercel.app`
→ Save this URL for frontend config

---

## 🎨 Deploy Frontend to GitHub Pages

### Step 1: Update API URL

Create `Frontend/.env.production`:

```
VITE_API_URL=https://your-backend-url.vercel.app
VITE_BASE_PATH=/
```

### Step 2: Build

```bash
cd Frontend
npm run build
```

### Step 3: Commit & Push

```bash
git add .
git commit -m "feat: production deployment"
git push origin main
```

GitHub Actions will automatically deploy to GitHub Pages!

### Step 4: Configure GitHub Pages Settings

- Go to GitHub Repo → Settings → Pages
- Set Source: `gh-pages` branch
- Save

Your site will be available at: `https://<username>.github.io/pva-bazaar-app`

---

## 🔗 Configure Custom Domain (Optional)

### Add CNAME to Frontend

Create `Frontend/public/CNAME`:

```
pvabazaar.org
```

### DNS Configuration

Add these DNS records with your domain registrar:

**For GitHub Pages (Frontend):**

```
CNAME    @    <username>.github.io
```

**For Vercel (Backend):**

```
CNAME    api    cname.vercel.com
```

Then in Vercel dashboard, add your custom domain.

---

## 📊 Post-Deployment Tests

### Backend Health Check

```bash
curl https://your-backend-url.vercel.app/health
# Should return: {"ok":true}
```

### Frontend Access

- Visit: https://pvabazaar.org
- Check browser console for errors
- Should see no CORS warnings

### API Integration

- Click on marketplace
- Should load listings
- Database queries working

### Test Payment Flow (Use Stripe Test Card)

- Card: `4242 4242 4242 4242`
- Exp: Any future date
- CVC: Any 3 digits

---

## 🎯 What's Now Live

| Component       | URL                               | Hosted On    |
| --------------- | --------------------------------- | ------------ |
| **Frontend**    | https://pvabazaar.org             | GitHub Pages |
| **Backend API** | https://api.pvabazaar.org         | Vercel       |
| **MongoDB**     | (Private)                         | Atlas        |
| **Admin Panel** | https://pvabazaar.org/admin       | GitHub Pages |
| **Marketplace** | https://pvabazaar.org/marketplace | GitHub Pages |

---

## ⚠️ Common Issues & Fixes

### CORS Errors

**Problem:** Frontend can't reach backend  
**Fix:** Check `CORS_ALLOWED_ORIGINS` in Vercel → includes your domain

### "Cannot find module"

**Problem:** Build fails  
**Fix:**

```bash
npm run clean:full
npm install
npm run build:backend
npm run build:frontend
```

### Database Not Connecting

**Problem:** Backend can't reach MongoDB  
**Fix:**

1. Check `MONGODB_URI` is correct
2. Add IP whitelist in MongoDB Atlas
3. Verify connection string has password

### Stripe Webhook Failing

**Problem:** Payments not processing  
**Fix:**

1. Check `STRIPE_WEBHOOK_SECRET` matches
2. Add webhook endpoint in Stripe dashboard
3. Point to: `https://api.pvabazaar.org/webhooks/stripe`

---

## 📋 Deployment Summary

```
✅ Fixed all CRITICAL issues
✅ Local dev environment working
✅ Frontend builds successfully (dist/ folder ready)
✅ Backend ready for Vercel deployment
✅ Environment variables configured
✅ CORS headers set up
✅ Rate limiting enabled
✅ Database connection optimized
✅ Error tracking (Sentry) ready
✅ Stripe integration tested

🚀 READY TO DEPLOY TO PRODUCTION
```

---

## 🎉 You're Ready to Go Live!

Follow these steps:

1. Deploy backend to Vercel (5 min)
2. Deploy frontend to GitHub Pages (GitHub Actions auto-deploys)
3. Configure custom domain (optional, 15 min)
4. Verify deployment works (5 min)
5. Monitor logs in Vercel dashboard

**Total time: ~30 minutes**

Need help? Check `PRODUCTION_DEPLOYMENT_GUIDE.md` for detailed instructions!
