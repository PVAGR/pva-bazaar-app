# 🔐 ENVIRONMENT VARIABLES & SECRETS FOR RENDER DEPLOYMENT

Copy-paste these into your Render dashboard "Environment Variables" section.

---

## ✅ REQUIRED VARIABLES (MUST SET)

```
NAME_OF_VARIABLE        VALUE
═══════════════════════════════════════════════════════════════

NODE_ENV                production

PORT                    5001

JWT_SECRET              pva_jwt_secret_key_min_32_chars_here_12345

MONGODB_URI             mongodb+srv://username:password@cluster.mongodb.net/pvabazaar?retryWrites=true&w=majority

ETHEREUM_RPC_URL        https://polygon-amoy-rpc.publicnode.com
```

---

## 📧 EMAIL SYSTEM (For Autonomous Agent Emails)

```
SMTP_HOST               smtp.gmail.com

SMTP_PORT               587

SMTP_USER               your-email@gmail.com

SMTP_PASS               your-app-specific-password

SENDGRID_API_KEY        sg_test_key_or_your_actual_key

SENDGRID_FROM           noreply@pvabazaar.org
```

---

## 💰 PAYMENT PROCESSING

```
STRIPE_SECRET_KEY       sk_test_your_stripe_secret_key_here

STRIPE_PUBLISHABLE_KEY  pk_test_your_stripe_public_key_here

STRIPE_WEBHOOK_SECRET   whsec_your_webhook_secret_here
```

---

## 🤖 AUTONOMOUS AGENT

```
ENCRYPTION_KEY          autonomous_agent_encryption_key_min_32_chars

AUTO_AGENT_SCHEDULER    true

AGENT_PAYMENT_LIMIT     500

AGENT_DAILY_LIMIT       1000

AGENT_MONTHLY_LIMIT     5000
```

---

## 🔗 BLOCKCHAIN & WEB3

```
ETHEREUM_NETWORK        polygon-amoy

ETHEREUM_CHAIN_ID       80002

WEB3_PROVIDER_URL       https://polygon-amoy-rpc.publicnode.com

CONTRACT_ADDRESS        0x742d35Cc6634C0532925a3b844Bc9e7595f2d2ea

NFT_CONTRACT_ADDRESS    0x742d35Cc6634C0532925a3b844Bc9e7595f2d2ea
```

---

## 📊 OPTIONAL BUT RECOMMENDED

```
SENTRY_DSN              https://your_sentry_url@sentry.io/your_project_id

REDIS_URL               redis://default:password@localhost:6379

LOG_LEVEL               info

ALLOW_ORIGIN            https://pva-bazaar-prod.onrender.com

CORS_ORIGIN             https://pva-bazaar-prod.onrender.com
```

---

## 🎯 MINIMAL SETUP (Testing/Demo)

If you just want it to work for testing, use these:

```
NAME_OF_VARIABLE        VALUE
═══════════════════════════════════════════════════════════════

NODE_ENV                production

PORT                    5001

JWT_SECRET              test_jwt_secret_key_change_this_to_something_longer

USE_MEMORY_DB           false

MONGODB_URI             mongodb://localhost:27017/pvabazaar

ETHEREUM_RPC_URL        https://polygon-amoy-rpc.publicnode.com

SMTP_HOST               smtp.mailtrap.io

SMTP_PORT               587

SMTP_USER               your_mailtrap_user

SMTP_PASS               your_mailtrap_pass

STRIPE_SECRET_KEY       sk_test_fake_key_for_testing

ENCRYPTION_KEY          test_encryption_key_32_chars_min

AUTO_AGENT_SCHEDULER    true
```

---

## 🚨 HOW TO GET REAL VALUES

### MongoDB (FREE TIER):

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up for free
3. Create cluster (free tier)
4. Get connection string
5. Paste as MONGODB_URI

### Gmail SMTP (FREE):

1. Go to: https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Create "App Password"
4. Use in SMTP_PASS

### Stripe (FREE):

1. Go to: https://dashboard.stripe.com
2. Sign up (free testing mode)
3. Get test keys from Dashboard
4. Use "sk*test*..." for STRIPE_SECRET_KEY

### Sentry (FREE):

1. Go to: https://sentry.io
2. Sign up free
3. Create project (Node.js)
4. Copy DSN URL

### SendGrid (FREE TIER):

1. Go to: https://sendgrid.com
2. Free tier: 100 emails/day
3. Create API key
4. Paste as SENDGRID_API_KEY

---

## 📋 STEP-BY-STEP IN RENDER DASHBOARD

When you're on the Render deployment page:

1. Look for "Environment Variables" section
2. Click "+ Add Environment Variable"
3. Fill in:
   - **NAME_OF_VARIABLE**: (copy from left column above)
   - **VALUE**: (copy from right column above)
4. Click outside or press Enter
5. Click "+ Add Environment Variable" again for next one
6. Repeat for all variables you need

---

## ✅ MINIMUM TO DEPLOY (Just These 5):

```
1. NODE_ENV              →  production
2. PORT                  →  5001
3. JWT_SECRET            →  test_key_change_this_later
4. MONGODB_URI           →  (from MongoDB Atlas)
5. ETHEREUM_RPC_URL      →  https://polygon-amoy-rpc.publicnode.com
```

Then click "Deploy Web Service" button.

---

## 🔐 SECURITY NOTES

⚠️ **DO NOT commit secrets to GitHub**
✅ **Always add in Render dashboard only**
✅ **Change test values in production**
✅ **Use strong JWT_SECRET (30+ chars)**
✅ **Keep API keys private**

---

## 📱 AFTER DEPLOYMENT

Once deployed to Render:

```bash
bash scripts/go-live.sh
```

This creates the autonomous agent and everything works automatically!

---

## 💡 FOR PRODUCTION (Eventually)

Replace test values with:

- Real MongoDB production URI
- Real Stripe production keys (sk*live*...)
- Real SendGrid API key
- Real Sentry production URL
- Real domain in CORS_ORIGIN
- Strong random JWT_SECRET

But for now, the test values above work perfectly!
