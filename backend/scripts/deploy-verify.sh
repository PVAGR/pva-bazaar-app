#!/bin/bash
# backend/scripts/deploy-verify.sh - Production deployment verification

set -e

echo "🚀 PVA Bazaar Deployment Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:5001}"
TIMEOUT=10

check_endpoint() {
  local endpoint=$1
  local description=$2

  echo -n "🔍 Checking $description... "

  if response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$API_URL$endpoint" 2>/dev/null); then
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
      echo -e "${GREEN}✅ ($status)${NC}"
      return 0
    else
      echo -e "${RED}❌ ($status)${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ (No response)${NC}"
    return 1
  fi
}

echo "🌐 API URL: $API_URL"
echo ""
echo "📋 Running Health Checks:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"

passed=0
failed=0

# Core endpoints
check_endpoint "/api/health" "API Health" && ((passed++)) || ((failed++))
check_endpoint "/api/express-ping" "Express Ping" && ((passed++)) || ((failed++))
check_endpoint "/api/version" "Version Info" && ((passed++)) || ((failed++))

# Health check system
check_endpoint "/api/health-check" "Full Health Check" && ((passed++)) || ((failed++))
check_endpoint "/api/health-check/endpoints" "Endpoint List" && ((passed++)) || ((failed++))
check_endpoint "/api/health-check/test" "Integration Tests" && ((passed++)) || ((failed++))

# Documentation
check_endpoint "/api/openapi.json" "OpenAPI Spec" && ((passed++)) || ((failed++))
check_endpoint "/api/docs" "Swagger UI" && ((passed++)) || ((failed++))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: ${GREEN}$passed passed${NC}, ${RED}$failed failed${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed! System is ready for production.${NC}"
  echo ""
  echo "📚 Documentation:"
  echo "   • Swagger UI: $API_URL/api/docs"
  echo "   • OpenAPI Spec: $API_URL/api/openapi.json"
  echo "   • Health Status: $API_URL/api/health-check"
  echo ""
  exit 0
else
  echo -e "${RED}⚠️  Some checks failed. System may not be ready.${NC}"
  exit 1
fi
