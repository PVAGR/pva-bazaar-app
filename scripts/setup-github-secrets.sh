#!/bin/bash

# Script to help you set GitHub Secrets for PVA Bazaar deployment
# Usage: bash scripts/setup-github-secrets.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== PVA Bazaar GitHub Secrets Setup ===${NC}\n"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI not found. Please install it:${NC}"
    echo "https://github.com/cli/cli#installation"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Not authenticated with GitHub. Running: gh auth login${NC}"
    gh auth login
fi

REPO="PVAGR/pva-bazaar-app"

echo -e "${YELLOW}Setting up secrets for: ${REPO}${NC}\n"

# 1. Vercel Token
echo -e "${YELLOW}1. Vercel API Token${NC}"
echo "   Get it from: https://vercel.com/account/tokens"
read -p "   Enter VERCEL_TOKEN: " VERCEL_TOKEN
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" --repo "$REPO"
echo -e "${GREEN}   ✓ VERCEL_TOKEN set${NC}\n"

# 2. Vercel Organization ID
echo -e "${YELLOW}2. Vercel Organization ID${NC}"
echo "   Run in terminal: vercel env list"
echo "   Or check .vercel/project.json after 'vercel link'"
read -p "   Enter VERCEL_ORG_ID: " VERCEL_ORG_ID
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" --repo "$REPO"
echo -e "${GREEN}   ✓ VERCEL_ORG_ID set${NC}\n"

# 3. Backend Project ID
echo -e "${YELLOW}3. Backend Vercel Project ID${NC}"
echo "   From: .vercel/project.json (in backend folder)"
read -p "   Enter VERCEL_BACKEND_PROJECT_ID: " VERCEL_BACKEND_PROJECT_ID
gh secret set VERCEL_BACKEND_PROJECT_ID --body "$VERCEL_BACKEND_PROJECT_ID" --repo "$REPO"
echo -e "${GREEN}   ✓ VERCEL_BACKEND_PROJECT_ID set${NC}\n"

# 4. Frontend Project ID
echo -e "${YELLOW}4. Frontend Vercel Project ID (optional)${NC}"
echo "   From: .vercel/project.json (in Frontend folder)"
read -p "   Enter VERCEL_FRONTEND_PROJECT_ID (leave blank to skip): " VERCEL_FRONTEND_PROJECT_ID
if [ -n "$VERCEL_FRONTEND_PROJECT_ID" ]; then
    gh secret set VERCEL_FRONTEND_PROJECT_ID --body "$VERCEL_FRONTEND_PROJECT_ID" --repo "$REPO"
    echo -e "${GREEN}   ✓ VERCEL_FRONTEND_PROJECT_ID set${NC}\n"
fi

# 5. MongoDB URI
echo -e "${YELLOW}5. MongoDB Connection URI${NC}"
echo "   Format: mongodb+srv://user:password@cluster.mongodb.net/dbname"
read -sp "   Enter MONGODB_URI: " MONGODB_URI
echo ""
gh secret set MONGODB_URI --body "$MONGODB_URI" --repo "$REPO"
echo -e "${GREEN}   ✓ MONGODB_URI set${NC}\n"

# 6. JWT Secret
echo -e "${YELLOW}6. JWT Signing Secret${NC}"
echo "   Generate: openssl rand -base64 32"
read -sp "   Enter JWT_SECRET: " JWT_SECRET
echo ""
gh secret set JWT_SECRET --body "$JWT_SECRET" --repo "$REPO"
echo -e "${GREEN}   ✓ JWT_SECRET set${NC}\n"

# 7. API URL
echo -e "${YELLOW}7. Frontend API URL${NC}"
echo "   Format: https://your-backend.vercel.app"
read -p "   Enter VITE_API_URL: " VITE_API_URL
gh secret set VITE_API_URL --body "$VITE_API_URL" --repo "$REPO"
echo -e "${GREEN}   ✓ VITE_API_URL set${NC}\n"

echo -e "${GREEN}=== All secrets configured! ===${NC}\n"
echo "Verify secrets at:"
echo "https://github.com/$REPO/settings/secrets/actions"
