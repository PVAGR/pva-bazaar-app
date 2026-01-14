#!/bin/bash
# Quick Backend Deployment Script for Vercel
# Run this to deploy your backend to Vercel

set -e  # Exit on any error

echo "🚀 PVA Bazaar Backend Deployment Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/server.js" ]; then
    echo "❌ Error: Please run this from the root of pva-bazaar-app"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "📂 Moving to backend directory..."
cd backend

echo ""
echo "⚠️  IMPORTANT: Before proceeding, make sure you have:"
echo "   1. A MongoDB Atlas URI ready"
echo "   2. A JWT secret (or we'll generate one)"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Generate JWT secret if needed
echo ""
echo "🔐 Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "   Generated: $JWT_SECRET"
echo "   (You can use this or provide your own in Vercel dashboard)"
echo ""

echo "🌐 Deploying to Vercel..."
echo "   This will open a browser for authentication if needed."
echo ""

# Deploy to production
vercel --prod

echo ""
echo "✅ Deployment command executed!"
echo ""
echo "📝 NEXT STEPS:"
echo ""
echo "1. Copy the deployment URL that Vercel showed above"
echo "   (It looks like: https://backend-xyz123.vercel.app)"
echo ""
echo "2. Add environment variables in Vercel Dashboard:"
echo "   → Go to: https://vercel.com/dashboard"
echo "   → Select your backend project"
echo "   → Settings → Environment Variables"
echo "   → Add these variables for 'Production':"
echo ""
echo "   MONGODB_URI=your-mongodb-atlas-connection-string"
echo "   JWT_SECRET=$JWT_SECRET"
echo "   NODE_ENV=production"
echo "   ALLOWED_ORIGIN=https://pvabazaar.org"
echo "   ALLOW_ALL_ORIGINS=false"
echo ""
echo "3. Update Frontend/.env.production with the real backend URL:"
echo "   VITE_API_URL=https://your-actual-backend-url.vercel.app"
echo ""
echo "4. Test the health endpoint:"
echo "   curl https://your-actual-backend-url.vercel.app/api/health"
echo ""
echo "5. Rebuild and deploy frontend with updated env vars"
echo ""
echo "🎉 Done! Follow the steps above to complete the deployment."
