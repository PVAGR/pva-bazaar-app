# FREE DEPLOYMENT GUIDE FOR PVA BAZAAR

## Overview

The Vercel $20/month Pro plan is no longer needed. We've set up PVA Bazaar to deploy to **3 FREE platforms**:

1. **Railway.app** ⭐ RECOMMENDED (Most similar to Vercel)
2. **Render.com** (Alternative free option)
3. **Fly.io** (Most powerful free tier)

Pick ONE and follow the instructions below.

---

## Option 1: Railway.app ⭐ RECOMMENDED

Railway provides $5/month free credits (plenty for our needs) and is the easiest migration.

### Setup (5 minutes)

1. **Create Account**
   - Go to https://railway.app
   - Sign up with GitHub (recommended for auto-deploy)
   - Connect your GitHub account

2. **Create New Project**
   - Click "Create New Project" → "Deploy from GitHub repo"
   - Select: `pvabazaarapp/pva-bazaar-app`
   - Railway auto-detects Docker and MongoDB from `railway.toml`

3. **Add Environment Variables**
   - In Railway dashboard: Settings → Variables
   - Add these from your `.env.production`:
     ```
     MONGODB_URI = [generated automatically by Railway + MongoDB plugin]
     JWT_SECRET = your-secret-key-here
     ETHEREUM_RPC_URL = https://polygon-amoy-rpc.publicnode.com
     STRIPE_SECRET_KEY = sk_test_xxxxx
     SENDGRID_API_KEY = SG.xxxxx
     AWS_ACCESS_KEY_ID = [optional if using S3]
     AWS_SECRET_ACCESS_KEY = [optional if using S3]
     NODE_ENV = production
     PORT = 5001
     ```

4. **Deploy**
   - Push to main branch: `git push origin main`
   - Railway automatically builds and deploys from `Dockerfile`
   - Watch deployment in dashboard (2-3 minutes)
   - Get public URL from Railway dashboard

5. **Verify**
   ```bash
   curl https://your-railway-url.railway.app/api/health-check
   ```

### Costs
- **Free tier**: $5/month credits (more than enough)
- You only pay if you exceed usage
- MongoDB + Node instance = ~$2-3/month total
- **Status**: ✅ LIVE immediately after push

---

## Option 2: Render.com

Render has a truly free tier but with limitations (auto-sleeps after 15 min inactivity).

### Setup (5 minutes)

1. **Create Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create from render.yaml**
   - Click "New +" → "Blueprint"
   - Select GitHub repository: `pvabazaarapp/pva-bazaar-app`
   - Render auto-reads `render.yaml`

3. **Configure Environment**
   - Add all variables from `.env.production`
   - Database auto-provisioned

4. **Deploy**
   - Click "Deploy"
   - Wait 5 minutes for build

5. **Verify**
   ```bash
   curl https://your-render-url.onrender.com/api/health-check
   ```

### Costs
- **Free tier**: $0/month (includes 750 hours/month which covers one always-on instance)
- Auto-sleeps after 15 min inactivity (cold start ~30 seconds)
- **Status**: ✅ LIVE immediately

### Limitation
- Plans sleep after inactivity (wake up is ~30s)
- Not ideal for production but good for testing

---

## Option 3: Fly.io

Fly.io has the most generous free tier with excellent performance.

### Setup (5 minutes)

1. **Install Fly CLI**
   ```bash
   # macOS / Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (via scoop or direct download)
   scoop install flyctl
   ```

2. **Create Account**
   ```bash
   flyctl auth signup
   # Or login if you have existing account
   flyctl auth login
   ```

3. **Deploy**
   ```bash
   # From repo root
   flyctl launch --name pva-bazaar

   # This reads fly.toml and asks questions:
   # - Dockerfile: yes
   # - Database: external (we'll use MongoDB Atlas)
   # - Copy production app: yes
   ```

4. **Configure Environment**
   ```bash
   flyctl secrets set \
     JWT_SECRET="your-key" \
     ETHEREUM_RPC_URL="https://polygon-amoy-rpc.publicnode.com" \
     STRIPE_SECRET_KEY="sk_test_xxxxx" \
     SENDGRID_API_KEY="SG.xxxxx" \
     MONGODB_URI="your-atlas-uri" \
     NODE_ENV="production"
   ```

5. **Deploy**
   ```bash
   git push origin main  # Or flyctl deploy
   ```

6. **Verify**
   ```bash
   flyctl status
   curl https://pva-bazaar.fly.dev/api/health-check
   ```

### Costs
- **Free tier**: 3 shared-cpu-1x 256MB VMs + 3GB persistent storage
- Perfect for one instance
- **Status**: ✅ LIVE immediately

---

## Recommended Setup Path

### Step 1: Choose Database (Same for all options)

We need MongoDB. Use **MongoDB Atlas** (free tier, we already use this):

1. Go to https://cloud.mongodb.com
2. Log in to your account
3. Copy connection string: `mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar?retryWrites=true&w=majority`
4. This is your `MONGODB_URI`

### Step 2: Get Required API Keys

You'll need these for ANY deployment:

```bash
# List what you already have
grep -E "STRIPE|SENDGRID|AWS|ETHEREUM|JWT" backend/api/index.js

# Required:
JWT_SECRET = generate a random string: $(openssl rand -hex 32)
ETHEREUM_RPC_URL = https://polygon-amoy-rpc.publicnode.com (free public RPC)
NODE_ENV = production
PORT = 5001

# Optional (if using features):
STRIPE_SECRET_KEY = from Stripe dashboard
SENDGRID_API_KEY = from SendGrid dashboard
AWS_ACCESS_KEY_ID = if using S3
AWS_SECRET_ACCESS_KEY = if using S3
```

### Step 3: Create `.env.production`

```bash
cp pva-bazaar-app.env .env.production
# Edit and add your values
```

### Step 4: Deploy

Choose ONE:

```bash
# Option 1: Railway.app (RECOMMENDED)
git push origin main
# Then configure in Railway dashboard

# Option 2: Render.com
# Go to render.com and create from GitHub

# Option 3: Fly.io
flyctl launch --name pva-bazaar
git push origin main
```

### Step 5: Verify Deployment

```bash
# Test health endpoint
npm run deploy:verify

# Monitor in production
npm run monitor:prod

# Seed database
npm run seed:db
```

---

## Quick Command Reference

```bash
# Local development
npm run dev                    # Start locally

# Testing before deploy
npm run build:backend          # Build backend
npm run build:frontend        # Build frontend
npm run seed:db               # Populate test data
npm run test:phases-6-8       # Run tests

# After deploy
npm run deploy:verify         # Verify endpoints live
npm run monitor:prod          # 30-min health checks

# Docker (all platforms use this)
docker build -t pva-bazaar .
docker run -p 5001:5001 -e MONGODB_URI="..." pva-bazaar
```

---

## Troubleshooting

### "MongoDB connection failed"
- Check `MONGODB_URI` is correct in dashboard
- Verify IP whitelist in MongoDB Atlas (should allow all: 0.0.0.0/0)

### "Health check 404"
- Wait 2-3 minutes for deployment to finish
- Check logs in platform dashboard
- Verify `NODE_ENV=production` is set

### "Dockerfile build failed"
- Check `npm install` succeeds locally: `npm ci`
- Verify Node version: `node -v` should be 20.x
- Check Docker has enough disk space

### "Cold start too slow on Render"
- Use Railway or Fly.io instead
- Render sleeps after 15 min inactivity

---

## Final Checklist

- [ ] Choose platform (Railway recommended)
- [ ] Create account on chosen platform
- [ ] Set up MongoDB Atlas connection string
- [ ] Configure all environment variables
- [ ] Deploy via git push
- [ ] Verify `/api/health-check` responds
- [ ] Seed database: `npm run seed:db`
- [ ] Run monitoring: `npm run monitor:prod`
- [ ] Share production URL with team

---

## Cost Summary

| Platform | Monthly Cost | Uptime | Cold Start | Notes |
|----------|-------------|--------|-----------|-------|
| Railway | $5 credits | 99.9% | Instant | ⭐ RECOMMENDED |
| Render | $0 (free tier) | 99.8% | 30 sec | Sleeps after 15 min |
| Fly.io | $0 (free tier) | 99.99% | <1 sec | Most reliable |

All are **100% free** or **under $5/month** compared to Vercel's $20.

---

## Need Help?

- Railway support: https://docs.railway.app
- Render docs: https://render.com/docs
- Fly.io docs: https://fly.io/docs
- PVA Bazaar API docs: `/api/docs` (after deployed)

Deploy now and join our global marketplace! 🚀
