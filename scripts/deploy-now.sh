#!/bin/bash
# 🚀 COMPLETE AUTONOMOUS DEPLOYMENT - RENDER + AGENT
# Run this to deploy everything end-to-end

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🚀 PVA BAZAAR AUTONOMOUS DEPLOYMENT STARTING"
echo "════════════════════════════════════════════════════════════════"

# Check git
echo "📋 Git status..."
git log --oneline -3
git status --short

# Push to production
echo ""
echo "🔼 Pushing to GitHub (triggers Render auto-deploy)..."
git push origin main

echo ""
echo "✅ Code pushed to production"
echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "📝 NEXT STEPS (Complete these in Render dashboard)"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  GO TO: https://dashboard.render.com"
echo ""
echo "2️⃣  CREATE NEW WEB SERVICE:"
echo "   - Click '+ New'"
echo "   - Select 'Web Service'"
echo "   - Connect GitHub repo: PVAGR/pva-bazaar-app"
echo "   - Name: pva-bazaar-prod"
echo "   - Branch: main"
echo "   - Build command: npm install && npm run build"
echo "   - Start command: npm start"
echo ""
echo "3️⃣  ADD ENVIRONMENT VARIABLES:"
cat <<'VARS'
   NODE_ENV = production
   PORT = 5001
   JWT_SECRET = test_secret_key_change_this_later
   MONGODB_URI = mongodb://localhost:27017/pvabazaar
   ETHEREUM_RPC_URL = https://polygon-amoy-rpc.publicnode.com
   ENCRYPTION_KEY = test_encryption_key_32_chars_min
   AUTO_AGENT_SCHEDULER = true
   STRIPE_SECRET_KEY = sk_test_placeholder
VARS

echo ""
echo "4️⃣  DEPLOY"
echo "   - Click 'Create Web Service'"
echo "   - Wait 5-10 minutes"
echo "   - When it says 'Live', note your URL"
echo ""
echo "5️⃣  VERIFY DEPLOYMENT:"
echo "   curl -s YOUR_RENDER_URL/api/health-check"
echo ""
echo "6️⃣  RUN THIS SCRIPT AFTER DEPLOY:"
echo "   bash scripts/go-live.sh YOUR_RENDER_URL"
echo ""
echo "═════════════════════════════════════════════════════════════════"
echo "✅ CODE IS READY - WAITING FOR RENDER DEPLOYMENT"
echo "═════════════════════════════════════════════════════════════════"
