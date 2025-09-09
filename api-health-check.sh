#!/bin/bash

# Script to check API health and endpoints
echo "🔍 PVA Bazaar API Health Check"
echo "=============================="

# Set the API base URL
API_URL=${1:-"http://localhost:5001"}

# Function to check endpoint
check_endpoint() {
  local endpoint=$1
  local method=${2:-"GET"}
  local data=$3
  local auth_token=$4
  
  echo -n "Testing $method $endpoint... "
  
  # Build curl command
  cmd="curl -s -X $method"
  
  # Add auth header if token provided
  if [ ! -z "$auth_token" ]; then
    cmd="$cmd -H \"Authorization: Bearer $auth_token\""
  fi
  
  # Add data if provided
  if [ ! -z "$data" ]; then
    cmd="$cmd -H \"Content-Type: application/json\" -d '$data'"
  fi
  
  # Add URL
  cmd="$cmd ${API_URL}${endpoint}"
  
  # Execute curl command
  response=$(eval $cmd)
  
  # Check if response has "ok": true
  if echo "$response" | grep -q "\"ok\":true"; then
    echo "✅ Success"
    echo "$response" | grep -o '{.*}' | jq
  else
    echo "❌ Failed"
    echo "$response" | grep -o '{.*}' | jq
  fi
  echo ""
}

# Health check
check_endpoint "/api/health"

# Auth endpoints
echo "🔐 Testing Auth Endpoints"
echo "------------------------"
login_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pvabazaar.org","password":"admin123"}' \
  ${API_URL}/api/auth/login)

# Extract token
token=$(echo $login_response | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$token" ]; then
  echo "✅ Login successful, token obtained"
  echo "Token: ${token:0:20}..."
  
  # Check protected endpoint
  check_endpoint "/api/users/profile" "GET" "" "$token"
else
  echo "❌ Login failed, no token obtained"
  echo "$login_response" | grep -o '{.*}' | jq
fi

# Artifacts endpoints
echo "🖼️ Testing Artifact Endpoints"
echo "----------------------------"
check_endpoint "/api/artifacts"

# Get first artifact ID
artifact_id=$(curl -s ${API_URL}/api/artifacts | jq -r '.artifacts[0]._id')

if [ ! -z "$artifact_id" ]; then
  echo "Found artifact ID: $artifact_id"
  check_endpoint "/api/artifacts/$artifact_id"
else
  echo "❌ No artifacts found"
fi

# Certificates endpoints
echo "📜 Testing Certificate Endpoints"
echo "------------------------------"
if [ ! -z "$artifact_id" ]; then
  check_endpoint "/api/certificates/$artifact_id"
fi

# Summary
echo "🔍 API Health Check Summary"
echo "==========================="
echo "API URL: $API_URL"
echo "Artifact ID for testing: $artifact_id"
echo ""
echo "Frontend URLs:"
echo "- Portfolio: http://localhost:3000/pages/portfolio.html"
echo "- Product: http://localhost:3000/pages/productshowcase.html?id=$artifact_id"
echo "- Provenance: http://localhost:3000/pages/provenance.html?id=$artifact_id"
echo "- Dashboard: http://localhost:3000/pages/pvadashboard.html"
