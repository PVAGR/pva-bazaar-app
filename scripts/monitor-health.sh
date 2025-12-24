#!/bin/bash

##############################################################################
# PVA Bazaar Health Monitoring Script
# 
# Purpose: Monitors application health and reports detailed status
# Usage: ./scripts/monitor-health.sh [API_URL] [OPTIONS]
#
# Options:
#   --verbose    : Show detailed output
#   --json       : Output in JSON format
#   --slack URL  : Send alerts to Slack webhook
#   --email ADDR : Send alerts to email address
##############################################################################

set -e

# Configuration
API_URL="${1:-http://localhost:5001}"
VERBOSE=false
JSON_OUTPUT=false
SLACK_WEBHOOK=""
EMAIL_ADDRESS=""
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/../logs"
LOG_FILE="${LOG_DIR}/health-monitor-$(date +%Y%m%d).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
shift || true
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose)
      VERBOSE=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    --slack)
      SLACK_WEBHOOK="$2"
      shift 2
      ;;
    --email)
      EMAIL_ADDRESS="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
  echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
  local status=$1
  local message=$2
  if [ "$status" = "success" ]; then
    echo -e "${GREEN}✅ ${message}${NC}"
  elif [ "$status" = "warning" ]; then
    echo -e "${YELLOW}⚠️  ${message}${NC}"
  elif [ "$status" = "error" ]; then
    echo -e "${RED}❌ ${message}${NC}"
  else
    echo -e "${BLUE}ℹ️  ${message}${NC}"
  fi
}

# Function to send Slack notification
send_slack_alert() {
  local message=$1
  local status=$2
  
  if [ -n "$SLACK_WEBHOOK" ]; then
    local color="good"
    [ "$status" = "warning" ] && color="warning"
    [ "$status" = "error" ] && color="danger"
    
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{
        \"attachments\": [{
          \"color\": \"$color\",
          \"title\": \"PVA Bazaar Health Alert\",
          \"text\": \"$message\",
          \"footer\": \"Health Monitor\",
          \"ts\": $(date +%s)
        }]
      }" 2>/dev/null || true
  fi
}

# Initialize results
OVERALL_STATUS="healthy"
HEALTH_RESULTS=""
ISSUES=()

log "==================== Health Check Started ===================="
log "Monitoring API: $API_URL"

if [ "$JSON_OUTPUT" = false ]; then
  echo ""
  print_status "info" "🏥 PVA Bazaar Health Monitor"
  print_status "info" "Target: $API_URL"
  print_status "info" "Time: $TIMESTAMP"
  echo "─────────────────────────────────────────────────────────"
  echo ""
fi

##############################################################################
# 1. Basic Connectivity Check
##############################################################################
if [ "$VERBOSE" = true ]; then
  print_status "info" "Testing basic connectivity..."
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${API_URL}/api/health/ping" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  print_status "success" "Basic connectivity: OK"
  log "✅ Basic connectivity check passed"
else
  print_status "error" "Basic connectivity: FAILED (HTTP $HTTP_CODE)"
  log "❌ Basic connectivity check failed - HTTP $HTTP_CODE"
  OVERALL_STATUS="unhealthy"
  ISSUES+=("API not responding")
fi

##############################################################################
# 2. Detailed Health Check
##############################################################################
if [ "$VERBOSE" = true ]; then
  print_status "info" "Fetching detailed health status..."
fi

HEALTH_RESPONSE=$(curl -s --max-time 10 "${API_URL}/api/health" 2>/dev/null || echo '{"ok":false,"error":"Connection failed"}')
HEALTH_OK=$(echo "$HEALTH_RESPONSE" | grep -o '"ok":[^,}]*' | cut -d':' -f2 | tr -d ' ')

if [ "$HEALTH_OK" = "true" ]; then
  print_status "success" "Health endpoint: HEALTHY"
  log "✅ Health check passed"
  
  # Extract detailed information
  if command -v jq >/dev/null 2>&1; then
    DB_CONNECTED=$(echo "$HEALTH_RESPONSE" | jq -r '.database.connected // "unknown"')
    UPTIME=$(echo "$HEALTH_RESPONSE" | jq -r '.uptime // "unknown"')
    MEMORY=$(echo "$HEALTH_RESPONSE" | jq -r '.memory.heapUsed // "unknown"')
    RESPONSE_TIME=$(echo "$HEALTH_RESPONSE" | jq -r '.responseTime // "unknown"')
    
    if [ "$VERBOSE" = true ]; then
      echo "  └─ Database: $DB_CONNECTED"
      echo "  └─ Uptime: ${UPTIME}s"
      echo "  └─ Memory: $MEMORY"
      echo "  └─ Response: $RESPONSE_TIME"
    fi
    
    log "  Database: $DB_CONNECTED | Uptime: ${UPTIME}s | Memory: $MEMORY | Response: $RESPONSE_TIME"
    
    # Check for warnings
    if [ "$DB_CONNECTED" != "true" ]; then
      print_status "warning" "Database not connected"
      ISSUES+=("Database connectivity issue")
      OVERALL_STATUS="degraded"
    fi
  fi
else
  print_status "error" "Health endpoint: UNHEALTHY"
  log "❌ Health check failed"
  OVERALL_STATUS="unhealthy"
  ISSUES+=("Health check failed")
fi

##############################################################################
# 3. Readiness Check
##############################################################################
if [ "$VERBOSE" = true ]; then
  print_status "info" "Checking service readiness..."
fi

READY_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${API_URL}/api/health/ready" 2>/dev/null || echo "000")

if [ "$READY_CODE" = "200" ]; then
  print_status "success" "Service readiness: READY"
  log "✅ Service is ready to handle traffic"
else
  print_status "warning" "Service readiness: NOT READY (HTTP $READY_CODE)"
  log "⚠️  Service not ready - HTTP $READY_CODE"
  [ "$OVERALL_STATUS" = "healthy" ] && OVERALL_STATUS="degraded"
  ISSUES+=("Service not ready")
fi

##############################################################################
# 4. API Endpoints Check
##############################################################################
if [ "$VERBOSE" = true ]; then
  print_status "info" "Testing critical endpoints..."
fi

# Test artifacts endpoint
ARTIFACTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${API_URL}/api/artifacts" 2>/dev/null || echo "000")

if [ "$ARTIFACTS_CODE" = "200" ]; then
  print_status "success" "Artifacts API: OK"
  log "✅ Artifacts endpoint responding"
else
  print_status "warning" "Artifacts API: Issue (HTTP $ARTIFACTS_CODE)"
  log "⚠️  Artifacts endpoint issue - HTTP $ARTIFACTS_CODE"
  [ "$OVERALL_STATUS" = "healthy" ] && OVERALL_STATUS="degraded"
  ISSUES+=("Artifacts endpoint issue")
fi

##############################################################################
# 5. Performance Metrics
##############################################################################
if [ "$VERBOSE" = true ]; then
  print_status "info" "Measuring response time..."
fi

START_TIME=$(date +%s%N)
curl -s --max-time 10 "${API_URL}/api/health/ping" > /dev/null 2>&1
END_TIME=$(date +%s%N)
RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$RESPONSE_TIME_MS" -lt 1000 ]; then
  print_status "success" "Response time: ${RESPONSE_TIME_MS}ms (Excellent)"
  log "✅ Response time: ${RESPONSE_TIME_MS}ms"
elif [ "$RESPONSE_TIME_MS" -lt 3000 ]; then
  print_status "success" "Response time: ${RESPONSE_TIME_MS}ms (Good)"
  log "✅ Response time: ${RESPONSE_TIME_MS}ms"
else
  print_status "warning" "Response time: ${RESPONSE_TIME_MS}ms (Slow)"
  log "⚠️  Response time: ${RESPONSE_TIME_MS}ms (performance degraded)"
  [ "$OVERALL_STATUS" = "healthy" ] && OVERALL_STATUS="degraded"
  ISSUES+=("Slow response time")
fi

##############################################################################
# Summary
##############################################################################
echo ""
echo "─────────────────────────────────────────────────────────"

if [ "$OVERALL_STATUS" = "healthy" ]; then
  print_status "success" "Overall Status: HEALTHY ✨"
  log "✅ Overall status: HEALTHY"
  EXIT_CODE=0
elif [ "$OVERALL_STATUS" = "degraded" ]; then
  print_status "warning" "Overall Status: DEGRADED ⚠️"
  log "⚠️  Overall status: DEGRADED"
  EXIT_CODE=1
  
  echo ""
  echo "Issues detected:"
  for issue in "${ISSUES[@]}"; do
    echo "  • $issue"
  done
  
  # Send alert
  ALERT_MSG="PVA Bazaar health check detected issues: ${ISSUES[*]}"
  send_slack_alert "$ALERT_MSG" "warning"
else
  print_status "error" "Overall Status: UNHEALTHY ❌"
  log "❌ Overall status: UNHEALTHY"
  EXIT_CODE=2
  
  echo ""
  echo "Critical issues:"
  for issue in "${ISSUES[@]}"; do
    echo "  • $issue"
  done
  
  # Send alert
  ALERT_MSG="🚨 PVA Bazaar is UNHEALTHY: ${ISSUES[*]}"
  send_slack_alert "$ALERT_MSG" "error"
fi

echo ""
log "==================== Health Check Completed ===================="

# JSON output if requested
if [ "$JSON_OUTPUT" = true ]; then
  cat << EOF
{
  "timestamp": "$TIMESTAMP",
  "target": "$API_URL",
  "status": "$OVERALL_STATUS",
  "checks": {
    "connectivity": $([ "$HTTP_CODE" = "200" ] && echo "true" || echo "false"),
    "health": $([ "$HEALTH_OK" = "true" ] && echo "true" || echo "false"),
    "readiness": $([ "$READY_CODE" = "200" ] && echo "true" || echo "false"),
    "artifacts": $([ "$ARTIFACTS_CODE" = "200" ] && echo "true" || echo "false")
  },
  "metrics": {
    "responseTimeMs": $RESPONSE_TIME_MS
  },
  "issues": [$(printf '"%s",' "${ISSUES[@]}" | sed 's/,$//')],
  "logFile": "$LOG_FILE"
}
EOF
fi

exit $EXIT_CODE
