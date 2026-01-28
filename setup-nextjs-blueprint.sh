#!/bin/bash
# PVABazaar Next.js Blueprint - Automated Setup (Unix/Linux/Mac)
# Run this script to set up your Next.js livestreaming platform

set -e

echo "======================================"
echo "PVABazaar Next.js Blueprint v1 Setup"
echo "======================================"
echo ""

# Step 1: Check Node.js version
echo "[1/6] Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js $(node --version) detected. Please upgrade to Node.js 18+"
    exit 1
fi
echo "✅ Node.js $(node --version) detected"

# Step 2: Create Next.js project
echo ""
echo "[2/6] Creating Next.js project..."
PROJECT_NAME="pvabazaar-livestream"

if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  Directory '$PROJECT_NAME' already exists. Skipping project creation."
else
    echo "Creating Next.js app with TypeScript, Tailwind, and App Router..."
    npx create-next-app@latest "$PROJECT_NAME" --typescript --tailwind --app-router --eslint --no-src-dir --import-alias "@/*"
    echo "✅ Next.js project created"
fi

# Step 3: Navigate to project and install dependencies
echo ""
echo "[3/6] Installing dependencies..."
cd "$PROJECT_NAME"

echo "Installing production dependencies..."
npm install mongoose next-auth @pinata/sdk hls.js axios dotenv bcryptjs form-data

echo "Installing dev dependencies..."
npm install --save-dev @types/bcryptjs

echo "✅ All dependencies installed"

# Step 4: Create folder structure
echo ""
echo "[4/6] Creating folder structure..."

mkdir -p lib
mkdir -p models
mkdir -p components/ui
mkdir -p app/api/auth/\[...nextauth\]
mkdir -p app/api/auth/signup
mkdir -p app/api/streams
mkdir -p app/api/journals
mkdir -p app/api/webhooks/twitch
mkdir -p app/api/users/export
mkdir -p app/dashboard/streams
mkdir -p app/dashboard/journals
mkdir -p app/dashboard/settings
mkdir -p app/auth/signin
mkdir -p app/auth/signup
mkdir -p public

echo "✅ Folder structure created"

# Step 5: Create .env.local template
echo ""
echo "[5/6] Creating .env.local template..."

if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Skipping..."
else
    cat > .env.local << 'EOF'
# ===== DATABASE =====
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/pvabazaar?retryWrites=true&w=majority

# ===== AUTHENTICATION =====
NEXTAUTH_SECRET=your_secret_here_generate_with_openssl_rand_hex_32
NEXTAUTH_URL=http://localhost:3000

# ===== PINATA (IPFS) =====
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret
PINATA_API_JWT=your_jwt_from_pinata

# ===== STREAMING PLATFORMS (OPTIONAL FOR v1) =====
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_secret
LIVEPEER_API_KEY=your_livepeer_key
EOF
    echo "✅ .env.local template created"
fi

# Step 6: Generate NEXTAUTH_SECRET
echo ""
echo "[6/6] Generating NEXTAUTH_SECRET..."

if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -hex 32)
    echo "✅ Generated NEXTAUTH_SECRET:"
    echo "   $SECRET"
    echo ""
    echo "📋 Copy this and paste it into .env.local"
else
    echo "⚠️  openssl not found. Generate your secret with:"
    echo "   openssl rand -hex 32"
fi

# Final summary
echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Configure .env.local with your credentials:"
echo "   - Get MongoDB URI from https://mongodb.com/atlas"
echo "   - Get Pinata keys from https://pinata.cloud"
echo "   - Paste the NEXTAUTH_SECRET shown above"
echo ""
echo "2. Copy the code from COPY_PASTE_BUILD_GUIDE.md:"
echo "   - Follow Steps 4-12 to create all files"
echo "   - Each step shows the exact file location"
echo ""
echo "3. Run the development server:"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Full documentation: COPY_PASTE_BUILD_GUIDE.md"
echo ""
echo "🚀 Ready to build your decentralized livestreaming platform!"
echo ""
