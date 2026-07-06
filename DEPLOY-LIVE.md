# 🚀 DEPLOY TO INTERNET NOW - Choose Your Path

Your code is pushed to GitHub. Now get it LIVE online.

## 🎯 Two Options (Pick ONE)

### ⚡ OPTION A: Railway.app (FASTEST)

**Best for**: Quick setup, easiest, most similar to Vercel

```bash
bash scripts/deploy-live-now.sh
```

**What happens**:

- Browser opens → Authenticate with GitHub
- Selects Railway as host
- Configures environment
- Deploys automatically
- **Live in ~5 minutes**
- Cost: $5/month (you get free credits)

**Your URL will be**: `https://your-app-name.railway.app`

---

### 🎯 OPTION B: Fly.io (BEST PERFORMANCE)

**Best for**: Best specs, global deployment, most powerful free tier

```bash
bash scripts/deploy-live-flyio.sh
```

**What happens**:

- Browser opens → Authenticate with Fly.io
- Deploys Docker container to Fly
- Configures environment variables
- Sets up monitoring
- **Live in ~5 minutes**
- Cost: Completely FREE

**Your URL will be**: `https://your-app-name.fly.dev`

---

## 🚀 GET GOING (Choose A or B Above)

### Choose ONE Command:

```bash
# OPTION A - Railway (RECOMMENDED)
bash scripts/deploy-live-now.sh

# OR

# OPTION B - Fly.io (BEST PERF)
bash scripts/deploy-live-flyio.sh
```

Pick whichever you want - both work perfectly.

---

## ✅ After Deployment Complete

Once your app is live online, do these 5 steps:

### 1️⃣ Verify It's Working

```bash
curl https://YOUR_NEW_URL/api/health-check
```

You'll see:

```json
{
  "status": "ok",
  "uptime": 99.9,
  "timestamp": "2026-04-14T..."
}
```

### 2️⃣ Add MongoDB (if you want persistent DB)

- Go to https://www.mongodb.com/cloud/atlas
- Create free cluster
- Get connection string
- Update environment variable in Railway/Fly dashboard
  - Variable: `MONGODB_URI`
  - Value: Your connection string

### 3️⃣ Create Autonomous Agent

```bash
curl -X POST https://YOUR_NEW_URL/api/admin/autonomous-agent \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PVA Bazaar Agent",
    "email": "agent@pvabazaar.org",
    "emailPassword": "your_email_password",
    "primaryPaymentMethod": "crypto"
  }'
```

Get the `agentId` from response.

### 4️⃣ Add Payment Methods to Agent

**Add PayPal**:

```bash
curl -X POST https://YOUR_NEW_URL/api/admin/autonomous-agent/{agentId}/payment-method \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "paypal",
    "credentials": {
      "email": "payments@example.com",
      "clientId": "YOUR_PAYPAL_ID",
      "clientSecret": "YOUR_PAYPAL_SECRET"
    }
  }'
```

**Add Crypto Wallet**:

```bash
curl -X POST https://YOUR_NEW_URL/api/admin/autonomous-agent/{agentId}/payment-method \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "crypto",
    "credentials": {
      "coin": "usdc",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7...",
      "network": "polygon"
    }
  }'
```

### 5️⃣ Create Billing Schedules

**Monthly Railway Payment**:

```bash
curl -X POST https://YOUR_NEW_URL/api/admin/autonomous-agent/{agentId}/billing-schedule \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor": "railway",
    "amount": 50,
    "frequency": "monthly",
    "dayOfMonth": 1
  }'
```

### 6️⃣ Enable Autonomous Operations

```bash
curl -X POST https://YOUR_NEW_URL/api/admin/autonomous-agent/{agentId}/toggle-operations \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 7️⃣ Fund the Agent

Transfer money to:

- PayPal: $500
- Crypto Wallet: $1,000
- CashApp: $300
- etc.

---

## 🎉 DONE!

Your autonomous agent is now **LIVE ON THE INTERNET** and will:

✅ Execute all vendor payments automatically
✅ Monitor system health 24/7
✅ Send daily status emails
✅ Alert on issues
✅ Maintain itself forever

**No local running**. **Everything online**. **Completely autonomous**.

---

## 📊 Access Your Live Platform

**API**: `https://YOUR_NEW_URL/api`
**Docs**: `https://YOUR_NEW_URL/api/docs`
**Health**: `https://YOUR_NEW_URL/api/health-check`
**Agent Status**: `https://YOUR_NEW_URL/api/admin/autonomous-agent/status`

---

## 💡 Quick Reference

| Task                  | Command                                        |
| --------------------- | ---------------------------------------------- |
| Deploy Railway        | `bash scripts/deploy-live-now.sh`              |
| Deploy Fly.io         | `bash scripts/deploy-live-flyio.sh`            |
| View Logs (Railway)   | `railway logs`                                 |
| View Logs (Fly.io)    | `flyctl logs -a YOUR_APP_NAME`                 |
| SSH into app (Fly.io) | `flyctl ssh console`                           |
| Update env var        | Dashboard or `railway variables set KEY VALUE` |

---

**Ready? Pick A or B above and get LIVE!** 🚀
