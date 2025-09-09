#!/bin/bash
# PVA Bazaar Simple Deployment Script

echo "🚀 PVA Bazaar Deployment Script"
echo "==============================="
echo ""
echo "This script will deploy your PVA Bazaar app to production."
echo "It assumes you have a single static page on pvabazaar.org currently."
echo ""

# Verify we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "Frontend" ]; then
    echo "❌ Error: This script must be run from the pva-bazaar-app root directory"
    echo "Current directory: $(pwd)"
    echo "Expected files: package.json, backend/, Frontend/"
    exit 1
fi

echo "✅ Verified project structure"

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy backend
echo "📦 Deploying backend API..."
cd "$(dirname "$0")/backend"

# Check for required environment variables
echo "Checking environment variables..."
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: No .env file found in backend directory"
    echo "For production deployment, you'll need to set environment variables in Vercel dashboard:"
    echo "  - MONGODB_URI (required for database connection)"
    echo "  - JWT_SECRET (required for authentication)"
    echo ""
fi

# Verify vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found in backend directory"
    echo "This file is required for Vercel deployment"
    exit 1
fi

echo "✅ Backend deployment configuration verified"

# Login and deploy
echo "Please login to Vercel if prompted..."
vercel login
BACKEND_URL=$(vercel --prod)
echo "✅ Backend deployed to: $BACKEND_URL"

# Update frontend config
echo ""
echo "Updating frontend configuration..."
cd "$(dirname "$0")/Frontend"

# Prompt for API URL confirmation
echo "Is this your backend API URL? $BACKEND_URL"
read -p "Enter 'y' to confirm or paste the correct URL: " API_CONFIRM
if [ "$API_CONFIRM" != "y" ]; then
    BACKEND_URL=$API_CONFIRM
fi

# Update config.js
cat > config.js << EOF
// Frontend configuration for PVA Bazaar
// Production configuration - automatically generated during deployment
const config = {
  apiUrl: '${BACKEND_URL}/api'
};

// Expose API URL globally for runtime access
if (typeof window !== 'undefined') {
  window.__VERCEL_API_URL__ = '${BACKEND_URL}';
}

export default config;
EOF
echo "✅ Updated frontend configuration"

# Build frontend
echo ""
echo "📦 Building frontend..."
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in Frontend directory"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo "❌ Error: Frontend dependency installation failed"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: Frontend build failed"
    exit 1
fi

echo "✅ Frontend built successfully"

# Deploy frontend
echo ""
echo "🚀 Deploying frontend..."
vercel --prod
echo "✅ Frontend deployed!"

# Deployment instructions
echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📋 Next steps:"
echo "1. Add environment variables in Vercel dashboard for your backend:"
echo "   - MONGODB_URI: Your MongoDB connection string"
echo "   - JWT_SECRET: A secure random string for JWT signing"
echo ""
echo "2. Configure custom domain:"
echo "   - Go to your frontend project in Vercel dashboard"
echo "   - Add 'pvabazaar.org' as a custom domain"
echo "   - Update your DNS settings as instructed by Vercel"
echo ""
echo "3. Verify deployment:"
echo "   - API health: ${BACKEND_URL}/api/health"
echo "   - Frontend: Check your Vercel frontend URL"
echo ""
echo "4. Test the connection between frontend and backend"
echo ""
echo "✅ Your PVA Bazaar app is now deployed to Vercel!"
