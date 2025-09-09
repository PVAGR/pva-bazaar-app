#!/bin/bash
# PVA Bazaar Simple Deployment Script

echo "🚀 PVA Bazaar Deployment Script"
echo "==============================="
echo ""
echo "This script will deploy your PVA Bazaar app to production."
echo "It assumes you have a single static page on pvabazaar.org currently."
echo ""

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy backend
echo "📦 Deploying backend API..."
cd /workspaces/pva-bazaar-app/backend

# Ensure vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "Creating vercel.json..."
    cat > vercel.json << EOF
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
fi

# Login and deploy
echo "Please login to Vercel if prompted..."
vercel login
BACKEND_URL=$(vercel --prod)
echo "✅ Backend deployed to: $BACKEND_URL"

# Update frontend config
echo ""
echo "Updating frontend configuration..."
cd /workspaces/pva-bazaar-app/Frontend

# Prompt for API URL confirmation
echo "Is this your backend API URL? $BACKEND_URL"
read -p "Enter 'y' to confirm or paste the correct URL: " API_CONFIRM
if [ "$API_CONFIRM" != "y" ]; then
    BACKEND_URL=$API_CONFIRM
fi

# Update config.js
cat > config.js << EOF
// Production configuration
const config = {
  apiUrl: '${BACKEND_URL}/api'
};

export default config;
EOF
echo "✅ Updated frontend configuration"

# Build frontend
echo ""
echo "📦 Building frontend..."
npm install
npm run build
echo "✅ Frontend built successfully"

# Deploy frontend
echo ""
echo "🚀 Deploying frontend..."
vercel --prod
echo "✅ Frontend deployed!"

# Deployment instructions
echo ""
echo "🔍 Next steps:"
echo "1. In Vercel dashboard, add pvabazaar.org as a custom domain for your frontend"
echo "2. Verify API health at ${BACKEND_URL}/api/health"
echo "3. Check that your frontend can connect to the backend"
echo ""
echo "✅ Deployment completed!"
