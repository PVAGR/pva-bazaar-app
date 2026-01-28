#!/bin/bash

# Blueprint v1 Setup Script
# Automated setup for PVA Bazaar Decentralized Platform

set -e  # Exit on error

echo "🌊 PVA Bazaar Blueprint v1 Setup"
echo "=================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected. Blueprint v1 requires Node.js 18+"
    echo "   Please upgrade: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../Frontend
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Check for environment files
cd ..
echo "🔧 Checking environment configuration..."

if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found"
    echo "   Copying template from .env.example.blueprint"
    cp .env.example.blueprint backend/.env
    echo "   ⚠️  IMPORTANT: Edit backend/.env with your actual credentials:"
    echo "      - MONGODB_URI (get from mongodb.com/atlas)"
    echo "      - JWT_SECRET (generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
    echo "      - PINATA_API_KEY & PINATA_API_SECRET (get from pinata.cloud)"
    echo ""
fi

if [ ! -f "Frontend/.env.development" ]; then
    echo "⚠️  Frontend/.env.development not found"
    echo "   Creating default configuration..."
    echo "VITE_API_URL=http://localhost:5001/api" > Frontend/.env.development
    echo "✅ Frontend/.env.development created"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 Next Steps:"
echo "   1. Configure backend/.env with your credentials (MongoDB, Pinata)"
echo "   2. Start backend:  cd backend && npm run dev"
echo "   3. Start frontend: cd Frontend && npm run dev"
echo "   4. Open http://localhost:5173/dashboard.html"
echo ""
echo "📚 Documentation:"
echo "   • Quick Start: QUICKSTART.md"
echo "   • Full Docs:   BLUEPRINT_V1_README.md"
echo "   • Architecture: ARCHITECTURE.md"
echo ""
echo "🤝 Need help? https://github.com/yourusername/pva-bazaar-app/discussions"
echo ""
