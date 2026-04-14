#!/bin/bash
# ONE COMMAND DEPLOYMENT FOR PVA BAZAAR
# Usage: bash scripts/one-command-deploy.sh

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║           PVA BAZAAR - ONE COMMAND DEPLOYMENT (INTERACTIVE)                ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "${BLUE}Choose your deployment platform:${NC}"
echo ""
echo "1) 🟠 Railway.app (RECOMMENDED - $5/mo credits, easiest)"
echo "2) 🟢 Render.com (FREE tier, slight limitations)"
echo "3) 🔵 Fly.io (FREE tier, best reliability)"
echo "4) 🐳 Docker Compose (Local/dev testing)"
echo ""
read -p "Enter choice (1-4): " CHOICE

case $CHOICE in
  1)
    echo ""
    echo "${GREEN}Starting Railway.app deployment...${NC}"
    bash scripts/deploy-railway.sh
    ;;
  2)
    echo ""
    echo "${GREEN}Starting Render.com deployment...${NC}"
    bash scripts/deploy-render.sh
    ;;
  3)
    echo ""
    echo "${GREEN}Starting Fly.io deployment...${NC}"
    bash scripts/deploy-flyio.sh
    ;;
  4)
    echo ""
    echo "${GREEN}Starting Docker Compose...${NC}"
    echo ""
    echo "Starting all services (MongoDB, Redis, API, Frontend, Email)..."
    echo ""
    npm run docker:compose:up
    echo ""
    echo "${GREEN}✓ All services running!${NC}"
    echo ""
    echo "Access points:"
    echo "  API:           http://localhost:5001"
    echo "  Frontend:      http://localhost:3000"
    echo "  API Docs:      http://localhost:5001/api/docs"
    echo "  MongoDB:       localhost:27017"
    echo "  Redis:         localhost:6379"
    echo "  Email Test UI: http://localhost:8025"
    echo ""
    echo "Viewing logs:"
    echo "  npm run docker:compose:logs"
    echo ""
    echo "Stop all services:"
    echo "  npm run docker:compose:down"
    ;;
  *)
    echo "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo "${BLUE}📝 Next steps:${NC}"
echo ""
echo "1. Seed database:"
echo "   ${BLUE}npm run seed:db${NC}"
echo ""
echo "2. Test endpoints:"
echo "   ${BLUE}npm run deploy:verify${NC}"
echo ""
echo "3. Monitor in production:"
echo "   ${BLUE}npm run monitor:prod${NC}"
echo ""
echo "${GREEN}All done! 🎉${NC}"
echo ""
