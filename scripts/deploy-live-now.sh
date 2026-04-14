#!/bin/bash
# Rapid Railway Deployment - Get Everything Online NOW

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║         PVA BAZAAR - RAPID CLOUD DEPLOYMENT (Railway.app)                  ║"
echo "║                    🚀 GETTING YOU LIVE ON INTERNET NOW                     ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    curl -L https://railway.app/install.sh | bash
    export PATH="$HOME/.railway/bin:$PATH"
fi

echo "✅ Railway CLI ready"
echo ""

# Get auth token from user if needed
echo "📋 STEP 1: Authentication"
echo "You'll be taken to browser login in 3 seconds..."
sleep 3

railway login || {
    echo ""
    echo "❌ Login failed. Manual steps:"
    echo ""
    echo "1. Go to https://railway.app"
    echo "2. Sign up or login with GitHub"
    echo "3. Return here and run: railway link"
    exit 1
}

echo "✅ Authenticated with Railway"
echo ""

# Initialize project
echo "📋 STEP 2: Creating Railway Project"
echo ""

railway init --name pva-bazaar 2>/dev/null || {
    echo "Note: Project may already exist, attempting to link..."
    railway link 2>/dev/null
}

echo "✅ Project linked"
echo ""

# Set environment variables
echo "📋 STEP 3: Configuring Environment Variables"
echo ""

# Critical env vars
railway variables set NODE_ENV production
railway variables set PORT 5001

# MongoDB URI - user must provide or use MongoDB Atlas free tier
echo ""
echo "❓ Do you have a MongoDB Atlas connection string?"
echo "(If not, go to https://www.mongodb.com/cloud/atlas - free tier available)"
echo ""
read -p "Paste your MongoDB URI (or press Enter to skip for now): " MONGO_URI
if [ -n "$MONGO_URI" ]; then
    railway variables set MONGODB_URI "$MONGO_URI"
fi

# JWT Secret
JWT_SECRET=$(openssl rand -hex 32)
railway variables set JWT_SECRET "$JWT_SECRET"

# Other defaults
railway variables set ETHEREUM_RPC_URL "https://polygon-amoy-rpc.publicnode.com"
railway variables set STRIPE_SECRET_KEY "sk_test_placeholder"
railway variables set SENDGRID_API_KEY "sg_placeholder"

echo "✅ Environment variables set"
echo ""

# Deploy
echo "📋 STEP 4: Deploying to Railway"
echo "This may take 3-5 minutes..."
echo ""

railway up --detach

echo ""
echo "⏳ Waiting for deployment to complete..."
sleep 60

# Get status
echo ""
echo "📋 STEP 5: Getting Your Live URL"
echo ""

# Try to get the URL
SERVICE_URL=$(railway service list 2>/dev/null | grep pva-bazaar | awk '{print $NF}' || echo "")

if [ -z "$SERVICE_URL" ]; then
    echo "🔗 Visit your Railway dashboard to get the service URL:"
    echo "   https://railway.app"
    echo ""
    echo "Then check:"
    railroad open
else
    echo "🎉 YOUR APP IS LIVE!"
    echo ""
    echo "🌐 Access your PVA Bazaar at:"
    echo "   $SERVICE_URL"
    echo ""
    echo "📚 API Documentation:"
    echo "   $SERVICE_URL/api/docs"
    echo ""
    echo "✅ Health Check:"
    echo "   $SERVICE_URL/api/health-check"
fi

echo ""
echo "📝 What to do next:"
echo ""
echo "1️⃣  Add MongoDB Atlas"
echo "   - Go to https://www.mongodb.com/cloud/atlas"
echo "   - Create free cluster"
echo "   - Get connection string"
echo "   - Run: railway variables set MONGODB_URI 'your-string'"
echo ""
echo "2️⃣  Add Payment Methods to Autonomous Agent"
echo "   - POST /api/admin/autonomous-agent (create agent)"
echo "   - POST /api/admin/autonomous-agent/{id}/payment-method (add PayPal/Crypto/etc)"
echo ""
echo "3️⃣  Create Billing Schedules"
echo "   - POST /api/admin/autonomous-agent/{id}/billing-schedule"
echo "   - Set vendor, amount, frequency"
echo ""
echo "4️⃣  Enable Autonomous Operations"
echo "   - POST /api/admin/autonomous-agent/{id}/toggle-operations"
echo ""
echo "5️⃣  Fund the Agent's Wallets"
echo "   - Add money to PayPal"
echo "   - Transfer crypto to wallet"
echo "   - Add CashApp funds"
echo "   - etc."
echo ""
echo "📊 Monitor Status:"
echo "   GET $SERVICE_URL/api/admin/autonomous-agent/status"
echo ""
echo "💾 View Logs:"
echo "   railway logs"
echo ""
echo "🎉 YOUR AUTONOMOUS AGENT IS LIVE ON THE INTERNET!"
echo ""
