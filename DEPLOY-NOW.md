# 🚀 DEP Ltradicional PVA BAZAAR - INSTANT DEPLOYMENT(No Vercel $20/month!)

> **TL;DR:** One command gets you live in 10 minutes. Pick your platform, run the script, done.

```bash
bash scripts/one-command-deploy.sh
```

---

## 🎯 Choose Your Path

### ⭐ Path 1: Railway.app (RECOMMENDED)

**Best for:** Easiest setup, most similar to Vercel

```bash
bash scripts/deploy-railway.sh
```

- 📊 $5/month free credits (we use $2-3)
- 🚀 Auto-deployment on git push
- 🗄️ MongoDB included
- ⚡ <1 second response time
- 99.9% uptime
- **Time:** ~10 minutes

### 🟢 Path 2: Render.com (FREE Tier)

**Best for:** Zero cost forever

```bash
bash scripts/deploy-render.sh
```

- 💰 Completely FREE
- 🌐 Auto-sleeps after 15 min (30 sec to wake)
- 📋 Easy GitHub integration
- 🗄️ PostgreSQL or MongoDB included
- 99.9% uptime (with sleep)
- **Time:** ~15 minutes

### 🔵 Path 3: Fly.io (Most Reliable)

**Best for:** Best performance for free

```bash
bash scripts/deploy-flyio.sh
```

- 💰 FREE tier (up to 3 instances)
- 🚀 <1 second deployments
- 🌍 Global deployment options
- 📊 Excellent monitoring
- 99.99% uptime
- **Time:** ~10 minutes

### 🐳 Path 4: Docker (Any Server)

**Best for:** Self-hosting, full control

```bash
npm run docker:compose:up
```

- 💰 FREE (your server cost only)
- 🔧 Full control
- 🚀 Instant startup locally
- 📦 MongoDB + Redis included
- ♾️ Unlimited uptime potential
- **Time:** ~2 minutes

---

## 📋 Complete Setup Instructions

### Before You Start

1. ✅ Node.js 20+ installed
2. ✅ Git configured with main branch
3. ✅ GitHub account (for Render/Railway/Fly)
4. ✅ MongoDB Atlas account (free tier)

### Step 1: Create MongoDB Connection

```bash
# Go to: https://www.mongodb.com/cloud/atlas
# Create free cluster → Copy connection string
# Should look like: mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar
```

### Step 2: Choose & Deploy

**Option A - Railway (Easiest):**

```bash
bash scripts/deploy-railway.sh
# Script handles everything:
# - Installs Railway CLI
# - Authenticates you (browser based)
# - Builds Docker image
# - Deploys to Railway
# - Configures environment variables
```

**Option B - Render:**

```bash
bash scripts/deploy-render.sh
# Manual steps:
# - Go to render.com
# - Connect GitHub
# - Create from render.yaml
# - Monitor deployment
```

**Option C - Fly.io:**

```bash
bash scripts/deploy-flyio.sh
# Automated:
# - Installs Fly CLI
# - Creates app
# - Sets environment
# - Deploys
```

**Option D - Docker:**

```bash
npm run docker:compose:up
# Done! Runs locally on port 5001
```

### Step 3: Get Your URL

- **Railway:** Check dashboard → Service → URL
- **Render:** Check dashboard → URL
- **Fly.io:** `https://{app-name}.fly.dev`
- **Docker:** `http://localhost:5001`

### Step 4: Verify It's Working

```bash
# Test endpoints
curl https://your-app-url/api/health-check

# Or use our script
npm run deploy:verify

# Or watch the logs
npm run monitor:prod
```

### Step 5: Seed Your Database

```bash
npm run seed:db

# Creates:
# - 6 test users
# - 3 shops with products
# - Reviews, orders, fulfillment centers
# - More...
```

---

## 🏃 Quick Reference

### One-Time Setup

```bash
# Interactive deployment guide
bash scripts/one-command-deploy.sh

# Or choose directly:
bash scripts/deploy-railway.sh    # Railway
bash scripts/deploy-render.sh     # Render
bash scripts/deploy-flyio.sh      # Fly.io

# Or Docker
npm run docker:compose:up
```

### Testing Locally

```bash
# Start Docker stack
npm run docker:compose:up

# Logs
npm run docker:compose:logs

# Stop
npm run docker:compose:down
```

### After Deployment

```bash
# Seed database
npm run seed:db

# Test all endpoints
npm run deploy:verify

# Monitor for 30 minutes
npm run monitor:prod

# View API docs
curl https://your-url/api/docs
```

### Development

```bash
# Start local backend
npm run dev:backend

# Start local frontend
npm run dev:frontend

# Start both
npm run dev

# Run tests
npm run test:phases-6-8
```

---

## 💰 Cost Comparison

| Platform | Cost          | Uptime  | Cold Start | Best For         |
| -------- | ------------- | ------- | ---------- | ---------------- |
| Railway  | $5/mo credits | 99.9%   | <1s        | Easiest setup    |
| Render   | FREE          | 99.9%\* | 30s        | Zero cost        |
| Fly.io   | FREE          | 99.99%  | <1s        | Best reliability |
| Docker   | $0-???        | 99.99%† | Instant    | Self-control     |

\*Sleeps after 15 min inactivity
†Depends on your server

---

## 🌐 After Going Live

### Access Your Application

- **API:** `https://your-url/api`
- **API Docs:** `https://your-url/api/docs` (Interactive Swagger UI)
- **Health:** `https://your-url/api/health-check`
- **OpenAPI:** `https://your-url/api/openapi.json`

### Key Endpoints

```
POST   /api/artifacts                 # Create artifact
GET    /api/artifacts                 # List artifacts
GET    /api/artifacts/:id             # Get artifact
POST   /api/auth/login                # User login
GET    /api/shops                     # List shops
POST   /api/orders                    # Create order
GET    /api/health-check              # System health
```

### Configure Your Domain

- **Railway:** Settings → Custom Domain
- **Render:** Settings → Custom Domain
- **Fly.io:** `flyctl certs add yourdomain.com`
- **Docker:** Set up reverse proxy (nginx/Caddy)

### Enable HTTPS

All platforms handle this automatically. ✅

---

## 🐛 Troubleshooting

### "MongoDB connection refused"

```bash
# Problem: MONGODB_URI is wrong or IP not whitelisted
# Fix:
# 1. Check connection string (starts with mongodb+srv://)
# 2. At MongoDB Atlas: Security → Network Access
# 3. Allow all: 0.0.0.0/0
# 4. Reset password and try new connection string
```

### "Port already in use (Docker)"

```bash
# Problem: Port 5001 already in use
# Fix:
docker kill $(docker ps -q)  # Stop conflicting container
npm run docker:compose:up    # Try again
```

### "Function timed out"

```bash
# Problem: First request slow (cold start)
# Fix: Wait ~30 seconds for warm-up
# Better: Use Railway or Fly.io for <1s response
```

### "API returns 502 Bad Gateway"

```bash
# Problem: App still deploying
# Fix: Wait 2-3 minutes and retry
# Or: Check logs in platform dashboard
```

### "Health check fails"

```bash
# Problem: Environment variables not set
# Fix:
# 1. Verify all env vars in platform dashboard
# 2. Especially: MONGODB_URI, JWT_SECRET, NODE_ENV
# 3. Restart deployment after updating
```

---

## 📚 Comprehensive Guides

| Guide                               | Purpose                      |
| ----------------------------------- | ---------------------------- |
| `DEPLOY-FREE-NOW.md`                | Complete step-by-step guide  |
| `DEPLOYMENT-FREE.md`                | Detailed platform comparison |
| `backend/docs/API-DOCS.md`          | API reference (430+ lines)   |
| `backend/docs/INTEGRATION-GUIDE.md` | Developer integration guide  |
| `backend/docs/PHASE9-PROVENANCE.md` | NFT system documentation     |

---

## ✨ Features Included

### Platform Features

- ✅ Full REST API (70+ endpoints)
- ✅ User authentication & JWT tokens
- ✅ Shop management
- ✅ Product listings
- ✅ Order processing
- ✅ Payment integration (Stripe-ready)
- ✅ Email notifications
- ✅ Blockchain integration (NFT support)
- ✅ Admin dashboard
- ✅ Real-time monitoring

### Infrastructure

- ✅ MongoDB database (Atlas)
- ✅ Redis caching
- ✅ Docker containerization
- ✅ Health checks
- ✅ Error tracking
- ✅ CORS & security headers
- ✅ Rate limiting
- ✅ Auto-scaling (platform-dependent)

### Documentation

- ✅ OpenAPI 3.0 spec
- ✅ Interactive Swagger UI
- ✅ API documentation (430 lines)
- ✅ Integration guide
- ✅ Deployment checklist
- ✅ Product sourcing docs
- ✅ OPS workflow

---

## 🚀 TLDR Timeline

| Step | Time  | Action                                   |
| ---- | ----- | ---------------------------------------- |
| 1    | 2 min | Sign up on platform (Railway/Render/Fly) |
| 2    | 2 min | Connect GitHub account                   |
| 3    | 5 min | Run deployment script                    |
| 4    | 1 min | Add environment variables                |
| 5    | Done! | Your app is LIVE 🎉                      |

**Total: 10 minutes**

---

## 🎯 Make a Choice NOW

### Which platform for you?

**If you want:**

- ✅ Easiest setup → **Railway**
- ✅ Zero cost forever → **Render or Fly.io**
- ✅ Best reliability → **Fly.io**
- ✅ Full control → **Docker**

### Ready? Go!

```bash
bash scripts/one-command-deploy.sh
```

No more $20/month. Go live in 10 minutes. Let's go! 🚀

---

## 📞 Support

**Need help?**

1. Read: `DEPLOY-FREE-NOW.md` (this file's sibling)
2. Check: Platform-specific docs (Railway/Render/Fly links below)
3. Run: `bash backend/scripts/status-dashboard.sh`
4. View: API docs at `/api/docs` (after deployed)

**Platform Documentation:**

- Railway: https://docs.railway.app
- Render: https://render.com/docs
- Fly.io: https://fly.io/docs
- Docker: https://docs.docker.com

**Project Documentation:**

- API Reference: `backend/docs/API-DOCS.md`
- Integration: `backend/docs/INTEGRATION-GUIDE.md`
- Production: `backend/docs/PRODUCTION-CHECKLIST.md`

---

**Version:** 1.0
**Last Updated:** 2026-04-14
**Status:** ✅ Production Ready
