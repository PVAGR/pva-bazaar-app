#!/bin/bash

# ============================================================================
# AI Daily Feedback System - Simplified Generator  
# ============================================================================
# Description: Generates AI-readable daily feedback reports for the PVA Bazaar App
# Usage: ./scripts/ai-feedback-simple.sh [quick|full]
# ============================================================================

set -euo pipefail

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="${REPO_ROOT}/.github/daily-reports"
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

# Create reports directory
mkdir -p "${REPORTS_DIR}"

# Report file
REPORT_FILE="${REPORTS_DIR}/daily-feedback-${DATE}.md"

log_info "🚀 Starting AI Daily Feedback System"
log_info "Analysis Type: ${ANALYSIS_TYPE}"

# ============================================================================
# Analysis Functions
# ============================================================================

analyze_security() {
    local issues=()
    
    # Check for hardcoded secrets
    if grep -r -l "password\s*=" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | head -1 >/dev/null; then
        issues+=("Potential hardcoded passwords found in source code")
    fi
    
    # Check for API keys
    if grep -r -l "api[_-]key" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | head -1 >/dev/null; then
        issues+=("Potential API keys found in source code")  
    fi
    
    # Check for .env files in git
    if [ -f "pva-bazaar-app.env" ]; then
        issues+=("Environment file 'pva-bazaar-app.env' found - should not be committed")
    fi
    
    printf "%s\n" "${issues[@]}"
}

analyze_code_quality() {
    local issues=()
    
    # Check for TODO/FIXME comments
    local todo_count=$(grep -r -c "TODO\|FIXME\|XXX" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | awk -F: '{sum += $2} END {print sum+0}')
    if [ "$todo_count" -gt 0 ]; then
        issues+=("Found $todo_count TODO/FIXME comments that need attention")
    fi
    
    # Check for console.log statements
    local console_count=$(grep -r -c "console\.log" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | awk -F: '{sum += $2} END {print sum+0}')
    if [ "$console_count" -gt 0 ]; then
        issues+=("Found $console_count console.log statements - consider proper logging")
    fi
    
    # Check for large files (>500 lines)
    local large_files=$(find . -name "*.js" -o -name "*.ts" | grep -v node_modules | xargs wc -l 2>/dev/null | awk '$1 > 500 {count++} END {print count+0}')
    if [ "$large_files" -gt 0 ]; then
        issues+=("Found $large_files files with >500 lines - consider refactoring")
    fi
    
    printf "%s\n" "${issues[@]}"
}

analyze_testing() {
    local issues=()
    
    # Check for test files
    local test_files=$(find . -name "*.test.js" -o -name "*.test.ts" -o -name "*.spec.js" -o -name "*.spec.ts" 2>/dev/null | wc -l)
    if [ "$test_files" -eq 0 ]; then
        issues+=("No test files found - comprehensive testing needed")
    else
        issues+=("Found $test_files test files - review coverage")
    fi
    
    printf "%s\n" "${issues[@]}"
}

analyze_documentation() {
    local issues=()
    
    # Check for README
    if [ ! -f "README.md" ]; then
        issues+=("Missing README.md file")
    fi
    
    # Check for API documentation
    if [ ! -f "API.md" ] && [ ! -d "docs" ]; then
        issues+=("Missing API documentation")
    fi
    
    printf "%s\n" "${issues[@]}"
}

# ============================================================================
# Report Generation
# ============================================================================

generate_copilot_prompt() {
    local issue="$1"
    
    case "$issue" in
        *"hardcoded"*|*"password"*)
            echo "Fix hardcoded credentials by moving them to environment variables and updating .env.example"
            ;;
        *"console.log"*)
            echo "Replace console.log statements with proper logging framework"
            ;;
        *"TODO"*|*"FIXME"*)
            echo "Review and resolve TODO/FIXME comments by implementing solutions"
            ;;
        *"test"*)
            echo "Implement comprehensive test suite with unit and integration tests"
            ;;
        *"documentation"*)
            echo "Create comprehensive documentation including setup and API guides"
            ;;
        *)
            echo "Analyze and resolve: $issue"
            ;;
    esac
}

generate_report() {
    log_info "📝 Generating daily feedback report..."
    
    # Get analysis results
    local security_issues
    local quality_issues  
    local testing_issues
    local doc_issues
    
    log_info "🔒 Analyzing security issues..."
    readarray -t security_issues < <(analyze_security)
    
    log_info "🔍 Analyzing code quality..."
    readarray -t quality_issues < <(analyze_code_quality)
    
    log_info "🧪 Analyzing testing coverage..."
    readarray -t testing_issues < <(analyze_testing)
    
    log_info "📚 Analyzing documentation..."
    readarray -t doc_issues < <(analyze_documentation)
    
    # Generate report
    cat > "$REPORT_FILE" << EOF
# 🤖 AI Daily Feedback Report

## Repository: PVA Bazaar App
**Date:** ${DATE}
**Analysis Type:** ${ANALYSIS_TYPE}
**Generated By:** AI Feedback System v1.0

---

## 🚨 CRITICAL ISSUES TO FIX

EOF

    # Add security issues
    if [ ${#security_issues[@]} -gt 0 ] && [ -n "${security_issues[0]}" ]; then
        echo "### Security Issues" >> "$REPORT_FILE"
        echo '```yaml' >> "$REPORT_FILE"
        echo 'priority: CRITICAL' >> "$REPORT_FILE"
        echo 'type: security' >> "$REPORT_FILE"
        echo 'issues:' >> "$REPORT_FILE"
        
        for issue in "${security_issues[@]}"; do
            if [ -n "$issue" ]; then
                echo "  - issue: \"$issue\"" >> "$REPORT_FILE"
                echo "    severity: \"HIGH\"" >> "$REPORT_FILE"
                echo "    action: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
                echo "    copilot_prompt: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
            fi
        done
        
        echo '```' >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi

    # Add quality issues section
    cat >> "$REPORT_FILE" << EOF
---

## ⚡ HIGH PRIORITY IMPROVEMENTS

### Code Quality Issues
EOF

    if [ ${#quality_issues[@]} -gt 0 ] && [ -n "${quality_issues[0]}" ]; then
        echo '```yaml' >> "$REPORT_FILE"
        echo 'priority: HIGH' >> "$REPORT_FILE"
        echo 'type: code_quality' >> "$REPORT_FILE"
        echo 'improvements:' >> "$REPORT_FILE"
        
        for issue in "${quality_issues[@]}"; do
            if [ -n "$issue" ]; then
                echo "  - area: \"Code Quality\"" >> "$REPORT_FILE"
                echo "    issue: \"$issue\"" >> "$REPORT_FILE"
                echo "    impact: \"MAINTAINABILITY\"" >> "$REPORT_FILE" 
                echo "    action: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
                echo "    copilot_prompt: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
            fi
        done
        
        echo '```' >> "$REPORT_FILE"
    else
        echo "No code quality issues found." >> "$REPORT_FILE"
    fi

    # Add testing section
    cat >> "$REPORT_FILE" << EOF

---

## 🧪 TESTING & QA IMPROVEMENTS

### Test Coverage
EOF

    if [ ${#testing_issues[@]} -gt 0 ] && [ -n "${testing_issues[0]}" ]; then
        echo '```yaml' >> "$REPORT_FILE"
        echo 'type: testing' >> "$REPORT_FILE"
        echo 'improvements:' >> "$REPORT_FILE"
        
        for issue in "${testing_issues[@]}"; do
            if [ -n "$issue" ]; then
                echo "  - area: \"Testing\"" >> "$REPORT_FILE"
                echo "    issue: \"$issue\"" >> "$REPORT_FILE"
                echo "    action: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
                echo "    copilot_prompt: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
            fi
        done
        
        echo '```' >> "$REPORT_FILE"
    else
        echo "Testing coverage appears adequate." >> "$REPORT_FILE"
    fi

    # Add documentation section
    cat >> "$REPORT_FILE" << EOF

---

## 📚 DOCUMENTATION NEEDS

### Documentation Status
EOF

    if [ ${#doc_issues[@]} -gt 0 ] && [ -n "${doc_issues[0]}" ]; then
        echo '```yaml' >> "$REPORT_FILE"
        echo 'type: documentation' >> "$REPORT_FILE"
        echo 'improvements:' >> "$REPORT_FILE"
        
        for issue in "${doc_issues[@]}"; do
            if [ -n "$issue" ]; then
                echo "  - area: \"Documentation\"" >> "$REPORT_FILE"
                echo "    issue: \"$issue\"" >> "$REPORT_FILE"
                echo "    action: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
                echo "    copilot_prompt: \"$(generate_copilot_prompt "$issue")\"" >> "$REPORT_FILE"
            fi
        done
        
        echo '```' >> "$REPORT_FILE"
    else
        echo "Documentation appears complete." >> "$REPORT_FILE"
    fi

    # Add AI prompts section
    cat >> "$REPORT_FILE" << EOF

---

## 🎯 COPY-PASTE PROMPTS FOR AI TOOLS

### Quick Actions for GitHub Copilot Chat
EOF

    # Collect all unique prompts
    local all_prompts=()
    for issue in "${security_issues[@]}" "${quality_issues[@]}" "${testing_issues[@]}" "${doc_issues[@]}"; do
        if [ -n "$issue" ]; then
            all_prompts+=("$(generate_copilot_prompt "$issue")")
        fi
    done
    
    # Remove duplicates and add to report
    printf '%s\n' "${all_prompts[@]}" | sort -u | while read -r prompt; do
        if [ -n "$prompt" ]; then
            echo "- \`@workspace $prompt\`" >> "$REPORT_FILE"
        fi
    done

    cat >> "$REPORT_FILE" << EOF

### For Claude/ChatGPT
\`\`\`
Analyze the PVA Bazaar App repository and help me fix these issues:
$(printf '%s\n' "${security_issues[@]}" "${quality_issues[@]}" "${testing_issues[@]}" "${doc_issues[@]}" | head -5 | sed 's/^/- /')

Please provide specific code examples and implementation steps.
\`\`\`

---

**Generated:** ${TIMESTAMP}
**Next Report:** $(date -d "+1 day" +"%Y-%m-%d")
EOF

    log_success "Report generated: $REPORT_FILE"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    generate_report
    
    log_success "✅ Daily feedback report generated!"
    log_info "📄 Report location: $REPORT_FILE"
    
    # Show preview
    echo -e "\n${BLUE}=== REPORT PREVIEW ===${NC}"
    head -50 "$REPORT_FILE"
    echo -e "\n${BLUE}=== END PREVIEW ===${NC}\n"
    
    log_info "🎯 Next steps:"
    log_info "  1. Review the generated report"
    log_info "  2. Copy-paste AI prompts from the report"
    log_info "  3. Use GitHub Copilot Chat with the provided prompts"
    log_info "  4. Address critical issues first"
}

# Run main function
main "$@"