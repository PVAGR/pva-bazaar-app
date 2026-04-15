# 🚀 PVA BAZAAR - FREE DEPLOYMENT (No $20/month Vercel!)

## If Vercel shows “Paused” / `DEPLOYMENT_DISABLED`

Your **frontend** can stay on **GitHub Pages** (`pvabazaar.org`). Move the **API** to **Render free** so `api.pvabazaar.org` works again:

1. In [Render](https://dashboard.render.com): **New +** → **Blueprint** → connect **PVAGR/pva-bazaar-app** (or **New Web Service** from the same repo).
2. Render reads [`render.yaml`](./render.yaml): service runs from **`backend/`** (`npm ci` + `npm start`). **Health check:** `/api/health-check`.
3. In the Render dashboard, set **Environment** variables marked `sync: false` (at minimum **`MONGODB_URI`** and **`JWT_SECRET`**). **`MONGODB_URI` must be your MongoDB Atlas `mongodb+srv://…` string** — if it is `mongodb://localhost:27017/...`, the API will start but every real route will fail with `ECONNREFUSED` (there is no MongoDB inside the Render container).

   **Fast path (matches your last good Vercel export + Atlas):** from the repo root run PowerShell:

   `powershell -File scripts/sync-render-dashboard-env.ps1 -ServicePublicUrl "https://YOUR-SERVICE.onrender.com"`

   Use your real Render hostname (example: `https://pva-bazaar-app-1.onrender.com`). That writes **`render-dashboard.env`** (gitignored) with the same keys as `.tmp-vercel-pva-backend/.env.production.local`, fixes the Atlas URI to include database name `pvabazaar` when missing, strips bad newline junk on secrets, adds default **OpenClaw** gateway/webhook/health URLs, and rewrites **`https://api.pvabazaar.org`** to your Render URL so **Telegram** and **OpenClaw** call the service that is actually up. Then paste the whole file into **Render → Environment →** bulk editor and **Save** + redeploy.

   If you do not have the Vercel export file, copy keys from [`backend/.env.example`](./backend/.env.example) instead.
4. **Custom domain:** Render service → **Settings** → **Custom Domains** → add **`api.pvabazaar.org`** and apply the **CNAME** they show (at your DNS host, point `api` to Render, not Vercel).
5. After traffic is on Render, **disable or delete** the old Vercel `pva-backend-api` project so nothing keeps calling the paused deployment.
6. **Security:** An older `render.yaml` once contained a Mongo connection string in git. **Rotate that database user password** in MongoDB Atlas even if you pick a new password in Render.

Repo cron schedules for GitHub Actions were slowed (e.g. every **30 minutes** instead of **5–10**) to reduce load on whatever API URL you use.

---

You won't pay a dime. Pick your platform and go live in 10 minutes.

## ⚡ 10-Minute Quick Start

### Step 1: Choose Your Platform (Pick ONE)

| Platform  | Cost | Uptime | Recommendation |
|-----------|------|--------|-----------------|
| 🟠 Railway | $5 credits/mo | 99.9% | ⭐ BEST - Most similar to Vercel |
| 🟢 Render | FREE | 99.8% | Good (sleeps after 15 min) |
| 🔵 Fly.io | FREE | 99.99% | Most reliable |

### Step 2: Run Deployment Script

**Railway.app (RECOMMENDED):**
```bash
bash scripts/deploy-railway.sh
```

**Render.com:**
```bash
bash scripts/deploy-render.sh
```

**Fly.io:**
```bash
bash scripts/deploy-flyio.sh
```

### Step 3: That's It!

Your app is live. Done in ~10 minutes. ✨

---

## 🐳 Option 4: Docker (Self-Host or Any VPS)

If you prefer running Docker locally or on your own VPS:

```bash
# Build image
npm run docker:build

# Run with docker-compose (includes MongoDB, Redis, etc)
npm run docker:compose:up

# App runs on http://localhost:5001
```

---

## 📝 Detailed Setup by Platform

### Railway.app (RECOMMENDED)

**Why:** Most similar to Vercel, easy setup, includes MongoDB.

1. **Create Account**
   ```bash
   # Sign up: https://railway.app (use GitHub)
   ```

2. **Run Deploy Script**
   ```bash
   bash scripts/deploy-railway.sh
   ```
   - Script installs Railway CLI
   - Auto-authenticates via browser
   - Asks for app name
   - Builds Docker image
   - Deploys to Railway

3. **Set Environment Variables**
   - Script prompts for variables
   - Or edit `.env.production` and script loads them
   - All secrets encrypted by Railway

4. **Verify**
   ```bash
   curl https://your-railway-app.railway.app/api/health-check
   npm run deploy:verify
   npm run monitor:prod
   ```

**Cost:** $5/month in free credits (we use ~$2-3)

---

### Render.com (FREE TIER)

**Why:** Truly free, no credit card required (initially).

1. **Go to Dashboard**
   ```bash
   open https://render.com  # or visit in browser
   ```

2. **Create from GitHub**
   - Sign in with GitHub
   - Click "New +" → "Blueprint"
   - Select `pvabazaarapp/pva-bazaar-app`
   - Render auto-reads `render.yaml`

3. **Configure Variables**
   - Add from `.env.production`

4. **Deploy**
   - Click "Deploy Blueprint"
   - Wait 5-10 minutes
   - You're live

**Cost:** FREE (with auto-sleep after 15 min inactivity)

---

### Fly.io (BEST UPTIME)

**Why:** Best free tier specs, excellent uptime.

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | bash
   ```

2. **Run Deploy Script**
   ```bash
   bash scripts/deploy-flyio.sh
   ```
   - Script installs Fly CLI
   - Creates your app
   - Configures environment
   - Deploys

3. **Monitor**
   ```bash
   flyctl logs              # View logs
   flyctl status            # Check deployment
   flyctl monitor           # Real-time metrics
   ```

**Cost:** FREE (includes up to 3 instances + storage)

---

### Docker Local (For Testing/Development)

```bash
# Start all services
npm run docker:compose:up

# Services:
# - API: http://localhost:5001
# - Frontend: http://localhost:3000
# - MongoDB: localhost:27017
# - Redis: localhost:6379
# - Email Testing: http://localhost:8025

# Logs
npm run docker:compose:logs

# Stop all
npm run docker:compose:down
```

---

## 📋 Pre-Deployment Checklist

- [ ] Node.js 20+ installed
- [ ] Git set up with main branch
- [ ] Account created on chosen platform (Railway/Render/Fly.io)
- [ ] GitHub connected to platform
- [ ] `.env.production` ready with:
  - `MONGODB_URI` (MongoDB Atlas)
  - `JWT_SECRET` (generate: `openssl rand -hex 32`)
  - `ETHEREUM_RPC_URL` (use free public RPC)
  - `NODE_ENV=production`

---

## 🔑 Environment Variables

### Minimal Setup (Everything Works)
```bash
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar
JWT_SECRET=your-random-secret-key
ETHEREUM_RPC_URL=https://polygon-amoy-rpc.publicnode.com
```

### Full Setup (All Features)
See `.env.production.template` for complete list with:
- Stripe (payments)
- SendGrid (email)
- AWS S3 (storage)
- Sentry (error tracking)
- Plus 15+ others

---

## ✅ Post-Deployment

```bash
# Seed your database
npm run seed:db

# Test all endpoints
npm run deploy:verify

# Start monitoring (30-minute health checks)
npm run monitor:prod

# View live docs
# Visit: https://your-app-url/api/docs
```

---

## 🐛 Troubleshooting

### "MongoDB connection refused"
```bash
# Fix: Check MONGODB_URI in your platform dashboard
# Ensure IP whitelist allows all: 0.0.0.0/0
# At MongoDB Atlas: Security → Network Access
```

### "Health check failed"
```bash
# Wait 2-3 minutes for deployment
# Check platform logs
# Verify all env vars are set
```

### "Port already in use"
```bash
# Docker issue - platform assigns port automatically
# For local: use different port
NODE_ENV=local PORT=5002 npm run dev:backend
```

### "Docker build fails"
```bash
# Clean and rebuild
npm run clean
npm install
docker build -t pva-bazaar .

# Or use compose
npm run docker:compose:up
```

---

## 💡 Platform Comparison

| Feature | Railway | Render | Fly.io | Docker |
|---------|---------|--------|--------|--------|
| Signup | 2 min | 2 min | 2 min | None |
| Deployment | 5 min | 15 min | 10 min | Instant |
| Cost | $5 credits | $0 | $0 | $0 (your server) |
| Uptime | 99.9% | 99.9%* | 99.99% | Depends |
| Cold Start | <1s | 30s | <1s | None |
| MongoDB | Built-in | Built-in | External | Docker |
| Scaling | Auto | Manual | Auto | Manual |

*Render sleeps after 15 min inactivity

---

## 🎯 My Recommendation

**Go with Railway.app:**
- ✅ Easiest setup (most similar to Vercel)
- ✅ Best UX
- ✅ MongoDB included
- ✅ 30-day free trial
- ✅ Only $5/month after (we use ~$2-3)
- ✅ Auto-scaling
- ✅ Instant deployments

**If you want 100% free (with caveats):**
- Use Render or Fly.io
- Expect ~30 second cold starts
- Or self-host on a VPS

---

## 🔗 Useful Links

| Resource | Link |
|----------|------|
| Railway Docs | https://docs.railway.app |
| Render Docs | https://render.com/docs |
| Fly.io Docs | https://fly.io/docs |
| Docker Guide | https://docs.docker.com |
| MongoDB Atlas | https://www.mongodb.com/cloud/atlas |
| API Docs | `/api/docs` (after deployed) |

---

## 🆘 Need Help?

**Deployment issues?**
1. Check `DEPLOYMENT-FREE.md` for detailed guide
2. Read platform-specific docs above
3. Check logs in platform dashboard
4. Verify all env vars are set

**Code issues?**
1. Run tests: `npm run test:phases-6-8`
2. Check health: `curl http://localhost:5001/api/health-check`
3. View API docs: `http://localhost:5001/api/docs`

**Still stuck?**
- Docs: `backend/docs/API-DOCS.md`
- Status dashboard: `bash backend/scripts/status-dashboard.sh`
- Integration guide: `backend/docs/INTEGRATION-GUIDE.md`

---

## 🎉 You're Ready!

No more $20/month. Choose your platform above and go live now.

You've got this! 🚀
