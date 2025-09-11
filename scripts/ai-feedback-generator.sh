#!/bin/bash

# ============================================================================
# AI Daily Feedback System - Main Generator
# ============================================================================
# Description: Generates AI-readable daily feedback reports for the PVA Bazaar App
# Usage: ./scripts/ai-feedback-generator.sh [quick|full|security|performance]
# ============================================================================

set -euo pipefail

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="${REPO_ROOT}/.github/daily-reports"
TEMPLATE_FILE="${REPO_ROOT}/.github/DAILY_FEEDBACK_TEMPLATE.md"
DATE=$(date +"%Y-%m-%d")
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S UTC")
ANALYSIS_TYPE="${1:-quick}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# ============================================================================
# Helper Functions
# ============================================================================

create_reports_dir() {
    mkdir -p "${REPORTS_DIR}"
    mkdir -p "${REPORTS_DIR}/archive"
}

# Archive old reports (keep last 30 days)
archive_old_reports() {
    if [ -d "${REPORTS_DIR}" ]; then
        find "${REPORTS_DIR}" -name "daily-feedback-*.md" -mtime +30 -exec mv {} "${REPORTS_DIR}/archive/" \; 2>/dev/null || true
    fi
}

# ============================================================================
# Analysis Functions
# ============================================================================

analyze_security() {
    local security_issues=()
    local scan_results=""
    
    log_info "🔒 Analyzing security issues..."
    
    # Check for hardcoded secrets
    if grep -r -n "password\s*=" --include="*.js" --include="*.ts" --include="*.env*" . 2>/dev/null | head -5; then
        security_issues+=("Potential hardcoded credentials found")
    fi
    
    # Check for exposed API keys
    if grep -r -n -E "(api[_-]?key|secret[_-]?key|auth[_-]?token)" --include="*.js" --include="*.ts" . 2>/dev/null | head -3; then
        security_issues+=("Potential exposed API keys found")
    fi
    
    # Check for HTTP usage in production
    if grep -r -n "http://" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | head -3; then
        security_issues+=("HTTP usage detected - should use HTTPS in production")
    fi
    
    echo "${security_issues[@]}"
}

analyze_code_quality() {
    local quality_issues=()
    
    log_info "🔍 Analyzing code quality..."
    
    # Check for TODO/FIXME comments
    local todos=$(grep -r -n -E "(TODO|FIXME|XXX|HACK)" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | wc -l)
    if [ "$todos" -gt 0 ]; then
        quality_issues+=("Found $todos TODO/FIXME comments that need attention")
    fi
    
    # Check for console.log statements
    local console_logs=$(grep -r -n "console\.log" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | wc -l)
    if [ "$console_logs" -gt 0 ]; then
        quality_issues+=("Found $console_logs console.log statements - consider using proper logging")
    fi
    
    # Check for large files
    local large_files=$(find . -name "*.js" -o -name "*.ts" | xargs wc -l 2>/dev/null | awk '$1 > 500 {print $2, $1}' | wc -l)
    if [ "$large_files" -gt 0 ]; then
        quality_issues+=("Found $large_files files with >500 lines - consider refactoring")
    fi
    
    echo "${quality_issues[@]}"
}

analyze_dependencies() {
    local dep_issues=()
    
    log_info "📦 Analyzing dependencies..."
    
    # Check for outdated dependencies (simplified check)
    if [ -f "package.json" ]; then
        # Check for deprecated packages in dependencies
        if grep -q "deprecated" package.json 2>/dev/null; then
            dep_issues+=("Deprecated packages found in package.json")
        fi
        
        # Check for missing dependencies
        if [ ! -d "node_modules" ]; then
            dep_issues+=("Dependencies not installed - run npm install")
        fi
        
        # Count total dependencies
        local dep_count=$(grep -c '".*":' package.json 2>/dev/null || echo 0)
        if [ "$dep_count" -gt 100 ]; then
            dep_issues+=("Large number of dependencies ($dep_count) - consider dependency audit")
        fi
    fi
    
    # Return issues as newline-separated string for proper handling
    printf "%s\n" "${dep_issues[@]}"
}

analyze_performance() {
    local perf_issues=()
    
    log_info "⚡ Analyzing performance..."
    
    # Check for unoptimized imports
    local unopt_imports=$(grep -r -n "import \*" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | wc -l)
    if [ "$unopt_imports" -gt 0 ]; then
        perf_issues+=("Found $unopt_imports wildcard imports - consider specific imports")
    fi
    
    # Check for missing async/await patterns
    local missing_async=$(grep -r -n "\.then(" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | wc -l)
    if [ "$missing_async" -gt 0 ]; then
        perf_issues+=("Found $missing_async .then() patterns - consider async/await")
    fi
    
    echo "${perf_issues[@]}"
}

analyze_testing() {
    local test_issues=()
    
    log_info "🧪 Analyzing testing coverage..."
    
    # Check for test files
    local test_files=$(find . -name "*.test.js" -o -name "*.test.ts" -o -name "*.spec.js" -o -name "*.spec.ts" | wc -l)
    local source_files=$(find . -name "*.js" -o -name "*.ts" | grep -v node_modules | grep -v ".test." | grep -v ".spec." | wc -l)
    
    if [ "$test_files" -eq 0 ]; then
        test_issues+=("No test files found - comprehensive testing needed")
    elif [ "$source_files" -gt 0 ]; then
        local coverage_ratio=$((test_files * 100 / source_files))
        if [ "$coverage_ratio" -lt 30 ]; then
            test_issues+=("Low test coverage estimated at ${coverage_ratio}% - needs improvement")
        fi
    fi
    
    echo "${test_issues[@]}"
}

analyze_documentation() {
    local doc_issues=()
    
    log_info "📚 Analyzing documentation..."
    
    # Check for README files
    if [ ! -f "README.md" ] && [ ! -f "readme.md" ]; then
        doc_issues+=("Missing main README.md file")
    fi
    
    # Check for API documentation
    if [ ! -f "API.md" ] && [ ! -f "api.md" ] && [ ! -d "docs" ]; then
        doc_issues+=("Missing API documentation")
    fi
    
    # Check for outdated documentation
    if [ -f "README.md" ]; then
        local readme_age=$(stat -c %Y README.md 2>/dev/null || echo 0)
        local code_age=$(find . -name "*.js" -o -name "*.ts" | xargs stat -c %Y 2>/dev/null | sort -n | tail -1)
        if [ "$code_age" -gt "$readme_age" ]; then
            doc_issues+=("README.md appears outdated compared to recent code changes")
        fi
    fi
    
    echo "${doc_issues[@]}"
}

# ============================================================================
# Report Generation Functions
# ============================================================================

generate_copilot_prompts() {
    local issues=("$@")
    
    for issue in "${issues[@]}"; do
        case "$issue" in
            *"hardcoded"*|*"credentials"*)
                echo "Fix hardcoded credentials by moving them to environment variables and updating .env.example"
                ;;
            *"console.log"*)
                echo "Replace console.log statements with proper logging framework (winston, pino, or debug)"
                ;;
            *"TODO"*|*"FIXME"*)
                echo "Review and resolve TODO/FIXME comments by implementing solutions or creating proper issues"
                ;;
            *"test"*|*"coverage"*)
                echo "Implement comprehensive test suite with unit tests, integration tests, and e2e tests"
                ;;
            *"documentation"*)
                echo "Create comprehensive documentation including API docs, setup guides, and code comments"
                ;;
            *)
                echo "Analyze and resolve: $issue"
                ;;
        esac
    done
}

generate_daily_report() {
    local output_file="${REPORTS_DIR}/daily-feedback-${DATE}.md"
    
    log_info "📝 Generating daily feedback report..."
    
    # Get analysis data
    local security_issues=($(analyze_security))
    local quality_issues=($(analyze_code_quality))
    local dep_issues=($(analyze_dependencies))
    local perf_issues=($(analyze_performance))
    local test_issues=($(analyze_testing))
    local doc_issues=($(analyze_documentation))
    
    # Start with template
    cp "${TEMPLATE_FILE}" "${output_file}"
    
    # Replace template variables
    sed -i "s/{DATE}/${DATE}/g" "${output_file}"
    sed -i "s/{ANALYSIS_TYPE}/${ANALYSIS_TYPE}/g" "${output_file}"
    sed -i "s/{TIMESTAMP}/${TIMESTAMP}/g" "${output_file}"
    sed -i "s/{NEXT_REPORT_DATE}/$(date -d "+1 day" +"%Y-%m-%d")/g" "${output_file}"
    
    # Generate specific sections
    generate_security_section "${output_file}" "${security_issues[@]}"
    generate_quality_section "${output_file}" "${quality_issues[@]}"
    generate_dependencies_section "${output_file}" "${dep_issues[@]}"
    generate_performance_section "${output_file}" "${perf_issues[@]}"
    generate_testing_section "${output_file}" "${test_issues[@]}"
    generate_documentation_section "${output_file}" "${doc_issues[@]}"
    
    log_success "Report generated: ${output_file}"
    echo "${output_file}"
}

generate_security_section() {
    local output_file="$1"
    shift
    local issues=("$@")
    
    if [ ${#issues[@]} -gt 0 ]; then
        local section=""
        for issue in "${issues[@]}"; do
            section+="  - issue: \"${issue}\"\n"
            section+="    location: \"Multiple files\"\n"
            section+="    severity: \"HIGH\"\n"
            section+="    action: \"$(generate_copilot_prompts "$issue")\"\n"
            section+="    copilot_prompt: \"$(generate_copilot_prompts "$issue")\"\n"
        done
        
        # Replace placeholder in template
        sed -i "/SECURITY_ISSUE/c\\${section}" "${output_file}"
    fi
}

generate_quality_section() {
    local output_file="$1"
    shift
    local issues=("$@")
    
    if [ ${#issues[@]} -gt 0 ]; then
        local section=""
        for issue in "${issues[@]}"; do
            section+="  - area: \"Code Quality\"\n"
            section+="    issue: \"${issue}\"\n"
            section+="    impact: \"MAINTAINABILITY\"\n"
            section+="    action: \"$(generate_copilot_prompts "$issue")\"\n"
            section+="    copilot_prompt: \"$(generate_copilot_prompts "$issue")\"\n"
        done
        
        # This would require more sophisticated template replacement
        # For now, append to file
        echo -e "\n## Generated Quality Issues:\n${section}" >> "${output_file}"
    fi
}

generate_dependencies_section() {
    local output_file="$1"
    shift
    local issues=("$@")
    
    if [ ${#issues[@]} -gt 0 ]; then
        local section="\n## Generated Dependency Issues:\n"
        for issue in "${issues[@]}"; do
            section+="- ${issue}\n"
            section+="  - Action: $(generate_copilot_prompts "$issue")\n"
        done
        echo -e "${section}" >> "${output_file}"
    fi
}

generate_performance_section() {
    local output_file="$1"
    shift
    local issues=("$@")
    
    if [ ${#issues[@]} -gt 0 ]; then
        local section="\n## Generated Performance Issues:\n"
        for issue in "${issues[@]}"; do
            section+="- ${issue}\n"
            section+="  - Action: $(generate_copilot_prompts "$issue")\n"
        done
        echo -e "${section}" >> "${output_file}"
    fi
}

generate_testing_section() {
    local output_file="$1"
    shift
    local issues=("$@")
    
    if [ ${#issues[@]} -gt 0 ]; then
        local section="\n## Generated Testing Issues:\n"
        for issue in "${issues[@]}"; do
            section+="- ${issue}\n"
            section+="  - Action: $(generate_copilot_prompts "$issue")\n"
        done
        echo -e "${section}" >> "${output_file}"
    fi
}

generate_documentation_section() {
    local output_file="$1"
    shift
    local issues=("$@")
    
    if [ ${#issues[@]} -gt 0 ]; then
        local section="\n## Generated Documentation Issues:\n"
        for issue in "${issues[@]}"; do
            section+="- ${issue}\n"
            section+="  - Action: $(generate_copilot_prompts "$issue")\n"
        done
        echo -e "${section}" >> "${output_file}"
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log_info "🚀 Starting AI Daily Feedback System"
    log_info "Analysis Type: ${ANALYSIS_TYPE}"
    log_info "Repository: $(basename "${REPO_ROOT}")"
    
    # Setup
    create_reports_dir
    archive_old_reports
    
    # Generate report
    local report_file
    report_file=$(generate_daily_report)
    
    # Display summary
    log_success "✅ Daily feedback report generated!"
    log_info "📄 Report location: ${report_file}"
    log_info "🔗 View report: cat '${report_file}'"
    
    # Output for CI/CD integration
    echo "DAILY_REPORT_PATH=${report_file}" >> "${GITHUB_OUTPUT:-/dev/null}" 2>/dev/null || true
    
    # Quick preview
    echo -e "\n${BLUE}=== QUICK PREVIEW ===${NC}"
    head -50 "${report_file}" || true
    echo -e "\n${BLUE}=== END PREVIEW ===${NC}\n"
    
    log_info "🎯 Next steps:"
    log_info "  1. Review the generated report"
    log_info "  2. Copy-paste AI prompts from the report"
    log_info "  3. Use GitHub Copilot Chat with the provided prompts"
    log_info "  4. Address high-priority issues first"
}

# Error handling
trap 'log_error "Script failed on line $LINENO"' ERR

# Run main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi