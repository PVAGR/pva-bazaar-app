#!/bin/bash

# ============================================================================
# Daily Routine Script - AI Feedback Integration
# ============================================================================
# Description: Run this script as part of your daily development routine
# Usage: ./scripts/daily-routine.sh
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🌅 Starting Daily Development Routine${NC}"
echo "================================================="

# 1. Generate AI Feedback Report
echo -e "\n${BLUE}📊 Generating Daily AI Feedback Report...${NC}"
"${REPO_ROOT}/scripts/ai-feedback-simple.sh" quick

# 2. Show Git Status
echo -e "\n${BLUE}📋 Git Status:${NC}"
git status --short

# 3. Show Recent Changes
echo -e "\n${BLUE}🔄 Recent Commits (last 5):${NC}"
git log --oneline -5

# 4. Check for outdated branches
echo -e "\n${BLUE}🌿 Branch Status:${NC}"
echo "Current branch: $(git branch --show-current)"
echo "Last update: $(git log -1 --format='%cr')"

# 5. Quick Health Check
echo -e "\n${BLUE}🏥 Quick Health Check:${NC}"

# Check if package.json exists and has scripts
if [ -f "package.json" ]; then
    echo "✅ package.json found"
    if grep -q '"scripts"' package.json; then
        echo "✅ npm scripts configured"
    else
        echo "⚠️  No npm scripts found"
    fi
else
    echo "⚠️  No package.json found"
fi

# Check for environment files
if [ -f ".env.example" ]; then
    echo "✅ .env.example found"
else
    echo "⚠️  No .env.example found"
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    echo "✅ .gitignore found"
    if grep -q "node_modules" .gitignore; then
        echo "✅ node_modules ignored"
    else
        echo "⚠️  node_modules not in .gitignore"
    fi
else
    echo "⚠️  No .gitignore found"
fi

# 6. Show today's AI feedback summary
REPORT_FILE="${REPO_ROOT}/.github/daily-reports/daily-feedback-$(date +%Y-%m-%d).md"
if [ -f "$REPORT_FILE" ]; then
    echo -e "\n${BLUE}🎯 Today's Priority Actions:${NC}"
    grep -A 10 "Quick Actions for GitHub Copilot Chat" "$REPORT_FILE" | grep "^-" | head -3
    
    echo -e "\n${GREEN}📄 Full report: $REPORT_FILE${NC}"
else
    echo -e "\n${YELLOW}⚠️  No daily report found. Run: ./scripts/ai-feedback-simple.sh${NC}"
fi

echo -e "\n${GREEN}✨ Daily routine complete! Happy coding! ✨${NC}"
echo "================================================="