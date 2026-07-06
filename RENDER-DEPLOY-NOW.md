# 🚀 DEPLOY TO RENDER NOW - AUTOMATED INSTRUCTIONS

## ONE-CLICK DEPLOYMENT

Go to: https://render.com/dashboard

### Step 1: Create Web Service

- Click `+ New`
- Click `Web Service`
- Select `Deploy existing repository`
- Search: `pva-bazaar-app`
- Click `Connect`

### Step 2: Configure Service

- Name: `pva-bazaar-prod`
- Environment: `Node`
- Region: `Oregon (us-west)` (or any region)
- Branch: `main`
- Build Command: `npm install --legacy-peer-deps`
- Start Command: `npm start`

### Step 3: Add Environment Variables (Click "+ Add Environment Variable" for each)

```
NODE_ENV=production
PORT=5001
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_SECRET_MIN_32_CHARS
MONGODB_URI=mongodb://localhost:27017/pvabazaar
ETHEREUM_RPC_URL=https://polygon-amoy-rpc.publicnode.com
ALLOW_ORIGIN=https://pva-bazaar-prod.onrender.com
FRONTEND_URL=https://pva-bazaar-prod.onrender.com
```

### Step 4: Deploy

- Select: `Free` (free tier)
- Scroll down
- Click purple `Deploy Web Service` button
- Wait 5-10 minutes

### Step 5: Get Your Live URL

- Once "Live" shows, copy your URL (something like: `https://pva-bazaar-prod-xxxxx.onrender.com`)
- This is your API endpoint

---

## TESTING YOUR LIVE DEPLOYMENT

After it says "Live":

```bash
# Replace with your actual URL from Render
RENDER_URL="https://pva-bazaar-prod-xxxxx.onrender.com"

# Test health endpoint
curl -s $RENDER_URL/api/health-check

# Test API docs
curl -s $RENDER_URL/api/docs | head -20
```

---

**Once deployed, you'll have:**
✅ Live backend on internet (no localhost)
✅ All 70+ endpoints working
✅ Health checks passing
✅ Ready for users to sign up and use
✅ Ready for autonomous payment agent setup
