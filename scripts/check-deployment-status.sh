#!/bin/bash

# Deployment Status & Verification Script
# This checks if your deployment is properly configured

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ PVA Bazaar - Deployment Status Check      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper functions
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $1"
        ((CHECKS_FAILED++))
    fi
}

section() {
    echo -e "\n${YELLOW}$1${NC}"
    echo "─────────────────────────────────────────────"
}

# 1. Git Repository
section "1️⃣  Git Repository"

git rev-parse --git-dir > /dev/null 2>&1
check_status "Git repository initialized"

git remote get-url origin | grep -q "pva-bazaar-app" && true
check_status "Remote is correct: github.com/PVAGR/pva-bazaar-app"

git branch | grep -q "main" && true
check_status "Main branch exists"

# 2. GitHub Workflows
section "2️⃣  GitHub Actions Workflows"

[ -f .github/workflows/deploy-to-github-pages.yml ]
check_status "GitHub Pages workflow exists"

[ -f .github/workflows/deploy-backend.yml ]
check_status "Backend deployment workflow exists"

[ -f .github/workflows/deploy-frontend.yml ]
check_status "Frontend deployment workflow exists"

# 3. Backend Configuration
section "3️⃣  Backend Configuration"

[ -f backend/vercel.json ]
check_status "Backend vercel.json exists"

[ -f backend/.env.example ]
check_status "Backend .env.example template exists"

[ -f backend/package.json ]
check_status "Backend package.json exists"

grep -q "mongodb-memory-server" backend/package.json
check_status "Backend has MongoDB support"

# 4. Frontend Configuration
section "4️⃣  Frontend Configuration"

[ -f Frontend/vite.config.js ]
check_status "Frontend vite.config.js exists"

[ -f Frontend/package.json ]
check_status "Frontend package.json exists"

grep -q "vite" Frontend/package.json
check_status "Frontend uses Vite"

# 5. Deployment Documentation
section "5️⃣  Documentation"

[ -f DEPLOYMENT_SETUP.md ]
check_status "DEPLOYMENT_SETUP.md exists"

[ -f QUICK_DEPLOY_GUIDE.md ]
check_status "QUICK_DEPLOY_GUIDE.md exists"

[ -f scripts/setup-github-secrets.sh ]
check_status "setup-github-secrets.sh helper exists"

# 6. Dependencies Check
section "6️⃣  Dependencies"

[ -d backend/node_modules ]
check_status "Backend dependencies installed"

[ -d Frontend/node_modules ]
check_status "Frontend dependencies installed"

# 7. Vercel Configuration
section "7️⃣  Vercel Configuration"

[ -f backend/.vercel/project.json ] 2>/dev/null || true
if [ -f backend/.vercel/project.json ]; then
    echo -e "${GREEN}✓${NC} Backend linked to Vercel"
    ((CHECKS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Backend not yet linked to Vercel (run: cd backend && vercel link)"
    ((CHECKS_FAILED++))
fi

# 8. Environment Variables Check
section "8️⃣  Environment Configuration"

if [ -f backend/.env ]; then
    if grep -q "MONGODB_URI" backend/.env; then
        echo -e "${GREEN}✓${NC} MONGODB_URI configured"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} MONGODB_URI not found in .env"
        ((CHECKS_FAILED++))
    fi
    
    if grep -q "JWT_SECRET" backend/.env; then
        echo -e "${GREEN}✓${NC} JWT_SECRET configured"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} JWT_SECRET not found in .env"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠${NC} backend/.env not created yet"
    ((CHECKS_FAILED++))
fi

# 9. GitHub Secrets Check
section "9️⃣  GitHub Secrets"

if command -v gh &> /dev/null; then
    if gh auth status > /dev/null 2>&1; then
        REPO="PVAGR/pva-bazaar-app"
        
        echo "Checking secrets in: $REPO"
        
        for secret in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_BACKEND_PROJECT_ID MONGODB_URI JWT_SECRET VITE_API_URL; do
            if gh secret list --repo "$REPO" 2>/dev/null | grep -q "^$secret"; then
                echo -e "${GREEN}✓${NC} $secret is set"
                ((CHECKS_PASSED++))
            else
                echo -e "${YELLOW}⚠${NC} $secret not found"
                ((CHECKS_FAILED++))
            fi
        done
    else
        echo -e "${YELLOW}⚠${NC} Not authenticated with GitHub CLI"
        echo "   Run: gh auth login"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠${NC} GitHub CLI not installed"
    echo "   Install from: https://github.com/cli/cli"
    ((CHECKS_FAILED++))
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ Summary                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))

echo -e "Checks passed: ${GREEN}${CHECKS_PASSED}${NC}/${TOTAL}"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "Status: ${GREEN}✓ All systems ready for deployment!${NC}"
    echo -e "\n${GREEN}Next steps:${NC}"
    echo "1. git push origin main"
    echo "2. Check GitHub Actions: https://github.com/PVAGR/pva-bazaar-app/actions"
    echo "3. Check deployments:"
    echo "   - Frontend: https://PVAGR.github.io/pva-bazaar-app/"
    echo "   - Backend:  https://pva-bazaar-api.vercel.app"
    exit 0
else
    echo -e "Checks failed: ${RED}${CHECKS_FAILED}${NC}/${TOTAL}"
    echo -e "\n${YELLOW}Required actions:${NC}"
    echo "1. Follow QUICK_DEPLOY_GUIDE.md"
    echo "2. Set up GitHub secrets"
    echo "3. Link projects to Vercel"
    exit 1
fi
