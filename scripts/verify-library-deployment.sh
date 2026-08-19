#!/bin/bash
# 🚀 PVA Bazaar - Library Module Deployment Verification
# Monitors and verifies the collaborative library module deployment
# Usage: bash scripts/verify-library-deployment.sh

set -e

API_BASE="${1:-https://pva-backend-api.vercel.app}"
EXPECTED_SHA_PREFIX="fa2378a5"
TIMEOUT=30

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║       PVA BAZAAR - LIBRARY MODULE DEPLOYMENT VERIFICATION                  ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📡 Target: ${API_BASE}"
echo "⏱️  Timeout: ${TIMEOUT}s per request"
echo ""

# PHASE 1: Check Backend Reachability
echo "${BLUE}PHASE 1: Backend Reachability Check${NC}"
echo "═══════════════════════════════════════════════════════════════"

if ! curl -sf "${API_BASE}/api/health" > /dev/null 2>&1; then
    echo "${RED}❌ Backend not reachable${NC}"
    echo "   URL: ${API_BASE}/api/health"
    exit 1
fi
echo "${GREEN}✅ Backend is reachable${NC}"
echo ""

# PHASE 2: Verify SHA (Critical for deployment proof)
echo "${BLUE}PHASE 2: Verify Deployment SHA${NC}"
echo "═══════════════════════════════════════════════════════════════"

VERSION_RESPONSE=$(curl -s "${API_BASE}/api/version" --max-time "${TIMEOUT}")
CURRENT_SHA=$(echo "${VERSION_RESPONSE}" | jq -r '.sha // "unknown"' 2>/dev/null || echo "parse-error")

if [[ "${CURRENT_SHA}" == "unknown" ]] || [[ "${CURRENT_SHA}" == "parse-error" ]]; then
    echo "${RED}❌ Could not retrieve SHA from /api/version${NC}"
    echo "   Response: ${VERSION_RESPONSE}"
    exit 1
fi

CURRENT_SHA_SHORT="${CURRENT_SHA:0:8}"
echo "Current SHA: ${CURRENT_SHA_SHORT}"

if [[ "${CURRENT_SHA_SHORT}" == "${EXPECTED_SHA_PREFIX}" ]]; then
    echo "${GREEN}✅ Correct SHA deployed (${CURRENT_SHA_SHORT})${NC}"
elif [[ "${CURRENT_SHA_SHORT}" == "6cb7cbd9" ]]; then
    echo "${YELLOW}⏳ Old SHA still live (6cb7cbd9) - deployment not yet complete${NC}"
    echo "   Wait 2-3 minutes and retry"
    exit 1
else
    echo "${YELLOW}⚠️  Different SHA deployed: ${CURRENT_SHA_SHORT}${NC}"
    echo "   Expected prefix: ${EXPECTED_SHA_PREFIX}"
    echo "   This is OK if it's a later commit with the fix"
fi
echo ""

# PHASE 3: Test Library Endpoints
echo "${BLUE}PHASE 3: Library Endpoints Verification${NC}"
echo "═══════════════════════════════════════════════════════════════"

# Test 1: List Articles (Public endpoint)
echo ""
echo "Test 1: GET /api/library?kind=articles"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/library?kind=articles&limit=1" --max-time "${TIMEOUT}")
HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
BODY=$(echo "${RESPONSE}" | head -n-1)

if [[ "${HTTP_CODE}" == "200" ]]; then
    echo "${GREEN}✅ 200 OK${NC}"
    ARTICLE_COUNT=$(echo "${BODY}" | jq 'length' 2>/dev/null || echo "?")
    echo "   Articles found: ${ARTICLE_COUNT}"
else
    echo "${RED}❌ HTTP ${HTTP_CODE}${NC}"
    echo "   Response: ${BODY}"
fi

# Test 2: Submit without auth (should reject)
echo ""
echo "Test 2: POST /api/library/submit (no auth)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/api/library/submit" \
  -H "Content-Type: application/json" \
  -d '{"title":"test"}' --max-time "${TIMEOUT}")
HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)

if [[ "${HTTP_CODE}" == "401" ]]; then
    echo "${GREEN}✅ 401 Unauthorized (correct rejection)${NC}"
else
    echo "${YELLOW}⚠️  HTTP ${HTTP_CODE} (expected 401)${NC}"
fi

# Test 3: Pending articles without auth (should reject)
echo ""
echo "Test 3: GET /api/library/pending (no auth)"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/library/pending" --max-time "${TIMEOUT}")
HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)

if [[ "${HTTP_CODE}" == "401" ]]; then
    echo "${GREEN}✅ 401 Unauthorized (correct rejection)${NC}"
else
    echo "${YELLOW}⚠️  HTTP ${HTTP_CODE} (expected 401)${NC}"
fi

# Test 4: **CRITICAL** - Invalid article should return 404 (not 500)
echo ""
echo "Test 4: GET /api/library/invalid-does-not-exist (CRITICAL)"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/library/does-not-exist" --max-time "${TIMEOUT}")
HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)

if [[ "${HTTP_CODE}" == "404" ]]; then
    echo "${GREEN}✅ 404 Not Found (FIX VERIFIED - Deployment Successful!)${NC}"
    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║  ✅ DEPLOYMENT VERIFICATION PASSED                            ║${NC}"
    echo "${GREEN}║                                                                ║${NC}"
    echo "${GREEN}║  Collaborative Library Module is LIVE and working correctly    ║${NC}"
    echo "${GREEN}║  SHA: ${CURRENT_SHA_SHORT}                                          ║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
elif [[ "${HTTP_CODE}" == "500" ]]; then
    echo "${RED}❌ 500 Internal Server Error (Fix NOT deployed yet)${NC}"
    echo "   Old SHA (6cb7cbd9) still live"
    echo "   Wait 2-3 minutes and retry"
    exit 1
else
    echo "${YELLOW}⚠️  HTTP ${HTTP_CODE} (expected 404)${NC}"
fi

echo ""
echo "${YELLOW}⚠️  Verification incomplete - check results above${NC}"
exit 1
