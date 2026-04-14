#!/bin/bash
# Automated Render.com deployment for PVA Bazaar
# Usage: bash scripts/deploy-render.sh

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              PVA BAZAAR - AUTOMATED RENDER.COM DEPLOYMENT                  ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "${BLUE}📋 Render.com Deployment Guide${NC}"
echo ""
echo "Render uses a GitHub-based deployment. Here's what to do:"
echo ""
echo "1. Go to https://render.com and sign in with GitHub"
echo "2. Click 'New +' → 'Blueprint'"
echo "3. Select your GitHub repo: pvabazaarapp/pva-bazaar-app"
echo "4. Render auto-detects render.yaml and sets up services"
echo ""

echo "${BLUE}Step 1: Create render.yaml${NC}"
if [ -f render.yaml ]; then
    echo "${GREEN}✓ render.yaml exists${NC}"
else
    echo "${RED}✘ render.yaml not found${NC}"
    exit 1
fi
echo ""

echo "${BLUE}Step 2: Create .env.production${NC}"
if [ -f .env.production ]; then
    echo "${GREEN}✓ .env.production exists${NC}"
else
    echo "Creating .env.production from template..."
    if [ -f .env.production.template ]; then
        cp .env.production.template .env.production
        echo "${YELLOW}⚠ Edit .env.production with your production values${NC}"
    fi
fi
echo ""

echo "${BLUE}Step 3: Push to GitHub${NC}"
echo "Commit and push these files:"
echo "  - render.yaml"
echo "  - Dockerfile"
echo "  - .env.production (DO NOT COMMIT - add to .gitignore)"
echo ""
read -p "Press Enter when ready to push..."

echo "Adding files to git..."
git add render.yaml Dockerfile
echo "${GREEN}✓ Files staged${NC}"
echo ""

echo "${BLUE}Step 4: Open Render Dashboard${NC}"
echo "Opening browser..."
open="xdg-open"
[[ "$OSTYPE" == "darwin"* ]] && open="open"
$open "https://dashboard.render.com" || echo "Visit: https://dashboard.render.com"
echo ""

echo "${BLUE}Step 5: Create Blueprint${NC}"
echo "In Render dashboard:"
echo "  1. Click 'New +' → 'Blueprint'"
echo "  2. Select GitHub repo: pvabazaarapp/pva-bazaar-app"
echo "  3. Render reads render.yaml and creates your services"
echo "  4. Configure environment variables"
echo "  5. Click 'Deploy Blueprint'"
echo ""

echo "${GREEN}✨ Your app will deploy automatically!${NC}"
echo ""
echo "After deployment:"
echo "  ${BLUE}npm run deploy:verify${NC} - Check endpoints"
echo "  ${BLUE}npm run monitor:prod${NC} - Monitor health"
echo ""
