#!/bin/bash
# PVA Bazaar Production Deployment Script

echo "🚀 PVA Bazaar Deployment Script"
echo "==============================="
echo ""
echo "This script will deploy your PVA Bazaar app to production using Vercel."
echo "It will deploy both the backend API and frontend to Vercel."
echo ""

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
fi

echo ""
echo "🔧 Step 1: Deploying Backend API"
echo "================================"

# Deploy backend
cd /workspaces/pva-bazaar-app/backend

# Ensure vercel.json exists for backend
if [ ! -f "vercel.json" ]; then
    echo "Creating backend vercel.json..."
    cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF
    echo "✅ Created backend vercel.json"
fi

# Deploy backend
echo ""
echo "🚀 Deploying backend to Vercel..."
echo "Please login to Vercel when prompted..."

# Run vercel deployment and capture output
vercel --prod
