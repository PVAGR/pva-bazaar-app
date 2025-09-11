#!/bin/bash

# PVA Bazaar Quality Orchestrator
# This script coordinates all quality checks and provides a unified interface

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
QUALITY_CONFIG="qa/config/quality.yml"
REPORTS_DIR="qa/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to run quality check with error handling
run_check() {
    local check_name="$1"
    local command="$2"
    local required="${3:-true}"
    
    log "Running $check_name..."
    
    if eval "$command"; then
        success "$check_name passed"
        return 0
    else
        if [ "$required" = "true" ]; then
            error "$check_name failed (required)"
            return 1
        else
            warning "$check_name failed (optional)"
            return 0
        fi
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if pnpm is available
    if ! command -v pnpm &> /dev/null; then
        error "pnpm is not installed"
        exit 1
    fi
    
    # Check if quality config exists
    if [ ! -f "$QUALITY_CONFIG" ]; then
        error "Quality configuration file not found: $QUALITY_CONFIG"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Function to start required services
start_services() {
    log "Starting required services..."
    
    # Start development servers in background
    pnpm dev > /dev/null 2>&1 &
    DEV_PID=$!
    
    # Wait for servers to be ready
    sleep 30
    
    # Check if services are running
    if curl -s http://localhost:3000 > /dev/null && curl -s http://localhost:3001 > /dev/null; then
        success "Services started successfully"
    else
        error "Failed to start services"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    log "Stopping services..."
    if [ ! -z "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null || true
    fi
    # Kill any remaining node processes
    pkill -f "node.*3000\|node.*3001" 2>/dev/null || true
}

# Function to run unit and integration tests
run_unit_integration_tests() {
    log "Running unit and integration tests..."
    
    # Run tests for each application
    run_check "Web Com Tests" "pnpm --filter=web-com test" true
    run_check "Web Org Tests" "pnpm --filter=web-org test" true
    run_check "API Tests" "pnpm --filter=api-tests test" true
    run_check "Contract Tests" "pnpm --filter=contracts test" true
    
    # Run integration tests
    run_check "Integration Tests" "pnpm --filter=api-tests test:integration" true
}

# Function to run end-to-end tests
run_e2e_tests() {
    log "Running end-to-end tests..."
    
    # Install playwright if needed
    if [ ! -d "node_modules/@playwright" ]; then
        pnpm dlx playwright install --with-deps
    fi
    
    # Run Playwright tests
    run_check "E2E Tests (Chromium)" "pnpm dlx playwright test --project=chromium" true
    run_check "E2E Tests (Firefox)" "pnpm dlx playwright test --project=firefox" false
    run_check "E2E Tests (Safari)" "pnpm dlx playwright test --project=webkit" false
    run_check "E2E Tests (Mobile)" "pnpm dlx playwright test --project=mobile" false
}

# Function to run visual regression tests
run_visual_tests() {
    log "Running visual regression tests..."
    
    run_check "BackstopJS Visual Tests" "pnpm qa:backstop:test" false
    run_check "Brand Compliance Check" "pnpm qa:brand:check" true
}

# Function to run accessibility tests
run_accessibility_tests() {
    log "Running accessibility tests..."
    
    run_check "Axe-core Accessibility" "pnpm qa:axe" true
    run_check "Pa11y Accessibility" "pnpm qa:pa11y" false
}

# Function to run performance tests
run_performance_tests() {
    log "Running performance tests..."
    
    run_check "Lighthouse Performance" "pnpm qa:lighthouse" true
    
    # Only run load tests if specifically requested
    if [ "$RUN_LOAD_TESTS" = "true" ]; then
        run_check "Artillery Load Tests" "pnpm qa:artillery" false
    fi
}

# Function to run security tests
run_security_tests() {
    log "Running security tests..."
    
    run_check "NPM Audit" "pnpm audit --audit-level moderate" false
    run_check "Secret Scan" "pnpm qa:secrets:scan" true
    
    # Smart contract security (if contracts exist)
    if [ -d "apps/contracts" ]; then
        run_check "Contract Security (Slither)" "cd apps/contracts && slither ." false
    fi
}

# Function to run smart contract tests
run_contract_tests() {
    if [ ! -d "apps/contracts" ]; then
        warning "No smart contracts found, skipping contract tests"
        return 0
    fi
    
    log "Running smart contract tests..."
    
    cd apps/contracts
    
    run_check "Contract Compilation" "forge build" true
    run_check "Contract Tests" "forge test" true
    run_check "Gas Report" "forge test --gas-report" false
    run_check "Coverage Report" "forge coverage" false
    
    cd - > /dev/null
}

# Function to generate quality report
generate_report() {
    log "Generating quality report..."
    
    local report_file="$REPORTS_DIR/quality-report-$TIMESTAMP.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>PVA Bazaar Quality Report</title>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; margin: 40px; }
        .header { background: #1c5a45; color: white; padding: 20px; border-radius: 8px; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #4ef8a3; }
        .pass { color: #2bb673; }
        .fail { color: #d32f2f; }
        .warn { color: #f57c00; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏛️ PVA Bazaar Quality Report</h1>
        <p>Generated: $(date)</p>
        <p>Commit: $(git rev-parse HEAD)</p>
    </div>
    
    <div class="section">
        <h2>📊 Quality Metrics Summary</h2>
        <!-- Metrics will be populated by individual test tools -->
    </div>
    
    <div class="section">
        <h2>🧪 Test Results</h2>
        <p>Detailed test results are available in individual test reports.</p>
    </div>
    
    <div class="section">
        <h2>🎨 Visual & Brand Compliance</h2>
        <p>Brand color compliance and visual regression test results.</p>
    </div>
    
    <div class="section">
        <h2>♿ Accessibility</h2>
        <p>WCAG 2.1 AA compliance test results.</p>
    </div>
    
    <div class="section">
        <h2>⚡ Performance</h2>
        <p>Lighthouse and load testing results.</p>
    </div>
    
    <div class="section">
        <h2>🔐 Security</h2>
        <p>Security scan and vulnerability assessment results.</p>
    </div>
</body>
</html>
EOF
    
    success "Quality report generated: $report_file"
}

# Main function
main() {
    local mode="${1:-full}"
    
    echo "🏛️ PVA Bazaar Quality Orchestrator"
    echo "=================================="
    
    # Trap to ensure cleanup
    trap stop_services EXIT
    
    check_prerequisites
    
    case "$mode" in
        "quick")
            log "Running quick quality checks..."
            run_unit_integration_tests
            run_check "Type Check" "pnpm typecheck" true
            run_check "Lint Check" "pnpm lint" true
            ;;
        "full")
            log "Running full quality suite..."
            start_services
            run_unit_integration_tests
            run_e2e_tests
            run_visual_tests
            run_accessibility_tests
            run_performance_tests
            run_security_tests
            run_contract_tests
            generate_report
            ;;
        "ci")
            log "Running CI quality checks..."
            # Optimized for CI environment
            run_unit_integration_tests
            run_accessibility_tests
            run_security_tests
            run_contract_tests
            ;;
        "performance")
            log "Running performance tests..."
            start_services
            run_performance_tests
            ;;
        "security")
            log "Running security tests..."
            run_security_tests
            ;;
        "accessibility")
            log "Running accessibility tests..."
            start_services
            run_accessibility_tests
            ;;
        "visual")
            log "Running visual tests..."
            start_services
            run_visual_tests
            ;;
        *)
            error "Unknown mode: $mode"
            echo "Usage: $0 [quick|full|ci|performance|security|accessibility|visual]"
            exit 1
            ;;
    esac
    
    success "Quality orchestration completed!"
}

# Run main function with all arguments
main "$@"
