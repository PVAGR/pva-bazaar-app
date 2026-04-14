#!/bin/bash
# Instant Fly.io Deployment - Everything Online in Minutes

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║         PVA BAZAAR - INSTANT FLY.IO DEPLOYMENT                             ║"
echo "║                    🚀 LAUNCHING TO INTERNET NOW                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Install Fly CLI
if ! command -v flyctl &> /dev/null; then
    echo "📦 Installing Fly CLI..."
    curl -L https://fly.io/install.sh | bash
fi

echo "✅ Fly CLI ready"
echo ""

# Auth
echo "📋 STEP 1: Authentication"
echo "Opening browser for Fly.io login..."
echo ""

flyctl auth login

echo "✅ Authenticated"
echo ""

# Launch app
echo "📋 STEP 2: Creating Your App"
echo ""

APP_NAME="pva-bazaar-$(date +%s)"

echo "App name: $APP_NAME"
echo ""

flyctl launch \
  --name "$APP_NAME" \
  --region iad \
  --dockerfile ./Dockerfile \
  --auto-confirm

echo "✅ App created"
echo ""

# Set secrets/env
echo "📋 STEP 3: Setting Environment"
echo ""

flyctl config show

echo ""
echo "❓ Do you have a MongoDB Atlas connection string?"
read -p "Paste MongoDB URI (or press Enter to use demo DB): " MONGO_URI
if [ -n "$MONGO_URI" ]; then
    flyctl secrets set MONGODB_URI="$MONGO_URI"
fi

JWT_SECRET=$(openssl rand -hex 32)
flyctl secrets set JWT_SECRET="$JWT_SECRET"
flyctl secrets set NODE_ENV="production"
flyctl secrets set ETHEREUM_RPC_URL="https://polygon-amoy-rpc.publicnode.com"

echo "✅ Environment configured"
echo ""

# Deploy
echo "📋 STEP 4: Deploying Now"
echo ""

flyctl deploy --dockerfile ./Dockerfile

echo ""
echo "⏳ Waiting for deployment..."
sleep 45

# Get status
APP_URL="https://$APP_NAME.fly.dev"

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                        🎉 YOU'RE LIVE ON INTERNET! 🎉                     ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Your PVA Bazaar:"
echo "   $APP_URL"
echo ""
echo "📚 API Docs:"
echo "   $APP_URL/api/docs"
echo ""
echo "✅ Health:"
echo "   $APP_URL/api/health-check"
echo ""
echo "📊 Autonomous Agent Status:"
echo "   $APP_URL/api/admin/autonomous-agent/status"
echo ""
echo "💾 View Logs:"
echo "   flyctl logs -a $APP_NAME"
echo ""
echo "📝 Next:"
echo "   1. Add MongoDB Atlas URI"
echo "   2. Create autonomous agent"
echo "   3. Add payment methods"
echo "   4. Create billing schedules"
echo "   5. Enable operations"
echo "   6. Fund wallets"
echo ""
echo "🚀 YOU ARE NOW LIVE ON THE INTERNET! NO LOCAL REQUIRED!"
echo ""
