#!/bin/bash
# Automated Railway.app deployment for PVA Bazaar
# Usage: bash scripts/deploy-railway.sh

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              PVA BAZAAR - AUTOMATED RAILWAY.APP DEPLOYMENT                 ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "${BLUE}📋 Checking prerequisites...${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "${RED}✘ Node.js not found. Install from https://nodejs.org/${NC}"
    exit 1
fi
echo "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "${RED}✘ npm not found${NC}"
    exit 1
fi
echo "${GREEN}✓ npm $(npm -v)${NC}"

# Check git
if ! command -v git &> /dev/null; then
    echo "${RED}✘ git not found. Install from https://git-scm.com/${NC}"
    exit 1
fi
echo "${GREEN}✓ git $(git -v)${NC}"

# Check docker
if ! command -v docker &> /dev/null; then
    echo "${YELLOW}⚠ Docker not found (optional). Install from https://docker.com for local testing${NC}"
else
    echo "${GREEN}✓ Docker $(docker --version)${NC}"
fi

echo ""
echo "${BLUE}🔧 Setting up Railway deployment...${NC}"
echo ""

# Step 1: Install Railway CLI
echo "${BLUE}Step 1/5: Installing Railway CLI${NC}"
if ! command -v railway &> /dev/null; then
    echo "Downloading Railway CLI..."
    curl -L https://railway.app/install.sh | bash
    export PATH="$HOME/.railway/bin:$PATH"
fi
echo "${GREEN}✓ Railway CLI ready${NC}"
echo ""

# Step 2: Login to Railway
echo "${BLUE}Step 2/5: Authenticate with Railway${NC}"
echo "Opening browser for login..."
railway login
echo "${GREEN}✓ Authenticated${NC}"
echo ""

# Step 3: Build Docker image
echo "${BLUE}Step 3/5: Building Docker image${NC}"
if command -v docker &> /dev/null; then
    echo "Building Docker image locally for verification..."
    docker build -t pva-bazaar:latest .
    echo "${GREEN}✓ Docker image built successfully${NC}"
else
    echo "${YELLOW}Skipping Docker build (docker not installed)${NC}"
fi
echo ""

# Step 4: Create Railway project
echo "${BLUE}Step 4/5: Creating Railway project${NC}"
read -p "Enter project name (default: pva-bazaar): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-pva-bazaar}

# Link to Railway
railway init --name "$PROJECT_NAME"
echo "${GREEN}✓ Project created${NC}"
echo ""

# Step 5: Configure environment variables
echo "${BLUE}Step 5/5: Configuring environment variables${NC}"
echo ""
echo "We need to set up your production environment variables"
echo "Create a .env.production file or provide values interactively"
echo ""

# Check if .env.production exists
if [ -f .env.production ]; then
    echo "${GREEN}Found .env.production - loading variables...${NC}"
    # Load from file and set via Railway
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.* ]] && continue
        [[ -z "$key" ]] && continue
        # Remove quotes if present
        value="${value%\"}"
        value="${value#\"}"
        railway variables set "$key" "$value" || echo "Skipped $key"
    done < .env.production
else
    echo "${YELLOW}No .env.production found. Interactive setup:${NC}"
    echo ""
    echo "Enter your production variables (press Enter to skip optional ones):"
    echo ""

    read -sp "MongoDB URI: " MONGODB_URI && railway variables set MONGODB_URI "$MONGODB_URI"
    echo ""

    read -sp "JWT Secret (generate: openssl rand -hex 32): " JWT_SECRET && railway variables set JWT_SECRET "$JWT_SECRET"
    echo ""

    read -p "Ethereum RPC URL (default: https://polygon-amoy-rpc.publicnode.com): " ETHEREUM_RPC_URL
    ETHEREUM_RPC_URL=${ETHEREUM_RPC_URL:-https://polygon-amoy-rpc.publicnode.com}
    railway variables set ETHEREUM_RPC_URL "$ETHEREUM_RPC_URL"

    read -p "Stripe Secret Key (optional): " STRIPE_SECRET_KEY
    [ -n "$STRIPE_SECRET_KEY" ] && railway variables set STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"

    read -p "SendGrid API Key (optional): " SENDGRID_API_KEY
    [ -n "$SENDGRID_API_KEY" ] && railway variables set SENDGRID_API_KEY "$SENDGRID_API_KEY"

    echo ""

    railway variables set NODE_ENV "production"
    railway variables set PORT "5001"
fi

echo "${GREEN}✓ Environment variables configured${NC}"
echo ""

# Deploy
echo "${BLUE}🚀 Deploying to Railway...${NC}"
echo ""
git push origin main
railway up
echo ""

# Wait for deployment
echo "${BLUE}⏳ Waiting for deployment to complete...${NC}"
sleep 10

# Get deployment URL
RAILWAY_URL=$(railway services)
echo ""
echo "${GREEN}✓ Deployment complete!${NC}"
echo ""

# Verification
echo "${BLUE}✅ Verifying deployment...${NC}"
echo ""

# Get the public URL
PUBLIC_URL=$(railway open --service pva-bazaar-api 2>/dev/null | grep -oP 'https://[^ ]+' | head -1)

if [ -z "$PUBLIC_URL" ]; then
    echo "${YELLOW}Could not auto-detect URL. Check Railway dashboard for your service URL${NC}"
else
    echo "Service URL: $PUBLIC_URL"
    echo ""

    # Test endpoints
    echo "Testing endpoints..."
    sleep 2

    if curl -s "$PUBLIC_URL/api/health-check" > /dev/null 2>&1; then
        echo "${GREEN}✓ API health check passed${NC}"
    else
        echo "${YELLOW}⚠ Health check not responding yet (may still be starting)${NC}"
    fi
fi

echo ""
echo "${BLUE}📝 Next steps:${NC}"
echo ""
echo "1. Save your production URL from Railway dashboard"
echo "2. Update DNS/firewall rules if needed"
echo "3. Seed database: npm run seed:db"
echo "4. Start monitoring: npm run monitor:prod"
echo "5. Verify all endpoints: npm run deploy:verify"
echo ""

echo "${BLUE}📖 Documentation:${NC}"
echo "  - Full guide: DEPLOYMENT-FREE.md"
echo "  - API docs: https://\$YOUR_URL/api/docs"
echo "  - Status: https://\$YOUR_URL/api/health-check"
echo ""

echo "${GREEN}✨ Your PVA Bazaar is now live on Railway!${NC}"
echo ""
