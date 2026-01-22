# Vercel Environment Variables Setup

## Required Environment Variables for Backend

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables for **Production**, **Preview**, and **Development** environments:

### Core Settings
```bash
NODE_ENV=production
```

### Database
```bash
MONGODB_URI=<your-mongodb-atlas-connection-string>
# Example: mongodb+srv://username:password@cluster.mongodb.net/pvabazaar?retryWrites=true&w=majority
```

### Security & Authentication
```bash
JWT_SECRET=<generate-random-64-char-string>
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

ADMIN_SECRET_CODE=<your-secure-admin-code>
# Use for /api/admin/token endpoint

ADMIN_USERNAME=<your-admin-username>
# For /api/admin/login endpoint

ADMIN_PASSWORD=<your-admin-password>
# For /api/admin/login endpoint - use strong password
```

### CORS
```bash
CORS_ALLOWED_ORIGINS=https://pvabazaar.org
# Add multiple origins separated by commas if needed
```

### Stripe (Payment Processing)
```bash
STRIPE_SECRET_KEY=<your-stripe-secret-key>
# Get from: https://dashboard.stripe.com/apikeys

STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
# Get from: https://dashboard.stripe.com/webhooks
```

### Optional: Error Tracking
```bash
SENTRY_DSN=<your-sentry-dsn>
# Get from: https://sentry.io/settings/projects/
```

### Optional: Ethereum/Blockchain
```bash
ETHEREUM_RPC_URL=https://mainnet.base.org
ADMIN_WALLET_PUBLIC=<your-wallet-address>
```

## Quick Setup Commands

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Generate Admin Password
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

## Current Status

✅ Backend deployed to: https://api.pvabazaar.org
✅ Vercel project: pva-backend-api
⚠️ Missing environment variables causing admin login 503 error

## Fix Admin Login

1. Go to Vercel Dashboard: https://vercel.com/pvagrs-projects/pva-backend-api/settings/environment-variables
2. Add `ADMIN_USERNAME` and `ADMIN_PASSWORD`
3. Redeploy: https://vercel.com/pvagrs-projects/pva-backend-api

After adding env vars, the admin login will work!

## Testing After Setup

```bash
# Test admin login
curl https://api.pvabazaar.org/api/admin/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}'

# Should return: {"ok":true,"message":"Login successful"}
```

## Restore Point

This configuration is saved at git tag: **v0.1.0-foundation**

To restore to this point:
```bash
git checkout v0.1.0-foundation
```
