#!/bin/bash
# Automated Fly.io deployment for PVA Bazaar
# Usage: bash scripts/deploy-flyio.sh

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              PVA BAZAAR - AUTOMATED FLY.IO DEPLOYMENT                      ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo "${BLUE}📋 Checking prerequisites...${NC}"

if ! command -v flyctl &> /dev/null; then
    echo "${YELLOW}Installing Fly CLI...${NC}"
    curl -L https://fly.io/install.sh | bash
    export PATH="$HOME/.fly/bin:$PATH"
fi

echo "${GREEN}✓ Fly CLI ready${NC}"
echo ""

# Login
echo "${BLUE}Step 1/4: Authenticate with Fly.io${NC}"
flyctl auth login
echo "${GREEN}✓ Authenticated${NC}"
echo ""

# Launch app
echo "${BLUE}Step 2/4: Launching app${NC}"
read -p "Enter app name (default: pva-bazaar): " APP_NAME
APP_NAME=${APP_NAME:-pva-bazaar}

flyctl launch \
  --name "$APP_NAME" \
  --dockerfile ./Dockerfile \
  --region iad \
  --auto-confirm

echo "${GREEN}✓ App created${NC}"
echo ""

# Configure environment
echo "${BLUE}Step 3/4: Setting environment variables${NC}"

# Create .env.production if doesn't exist
if [ ! -f .env.production ]; then
    cp .env.production.template .env.production
    echo "${YELLOW}⚠ Edit .env.production with your values${NC}"
    echo "Waiting for you to edit..."
    sleep 5
    read -p "Press Enter when .env.production is ready..."
fi

# Set secrets
echo "Configuring secrets..."
while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.* ]] && continue
    [[ -z "$key" ]] && continue
    value="${value%\"}"
    value="${value#\"}"
    [ -n "$value" ] && flyctl secrets set "$key=$value" 2>/dev/null || true
done < .env.production

echo "${GREEN}✓ Secrets configured${NC}"
echo ""

# Deploy
echo "${BLUE}Step 4/4: Deploying...${NC}"
flyctl deploy --dockerfile ./Dockerfile
echo "${GREEN}✓ Deployment complete${NC}"
echo ""

# Get URL
APP_URL=$(flyctl info -j | grep -oP '"appUrl":"\K[^"]+' 2>/dev/null || echo "https://$APP_NAME.fly.dev")

echo "${BLUE}✅ Your app is live!${NC}"
echo ""
echo "URL: ${GREEN}$APP_URL${NC}"
echo ""

# Test
echo "${BLUE}Testing endpoints...${NC}"
sleep 5

if curl -s "$APP_URL/api/health-check" > /dev/null 2>&1; then
    echo "${GREEN}✓ Health check passed${NC}"
else
    echo "${YELLOW}⚠ Still starting (check again in 30 seconds)${NC}"
fi

echo ""
echo "${BLUE}📝 Next steps:${NC}"
echo ""
echo "1. Seed database: npm run seed:db"
echo "2. Monitor: npm run monitor:prod"
echo "3. Verify: npm run deploy:verify"
echo ""
echo "${BLUE}Useful flyctl commands:${NC}"
echo "  flyctl logs              - View logs"
echo "  flyctl ssh console       - SSH into app"
echo "  flyctl secrets list      - List secrets"
echo "  flyctl monitor           - Real-time monitoring"
echo ""
