# PVA Bazaar CI/CD & Quality Assurance

## 🚀 Quick Start

Run quality checks locally:
```bash
# Quick checks (fastest)
./qa/scripts/orchestrator.sh quick

# Full quality suite
./qa/scripts/orchestrator.sh full

# Specific test suites
./qa/scripts/orchestrator.sh performance
./qa/scripts/orchestrator.sh security
./qa/scripts/orchestrator.sh accessibility
```

## 🏗️ CI/CD Pipeline Overview

### Quality Gates Workflow
- **Trigger**: Pull requests to `develop` or `main`
- **Jobs**: Unit tests, E2E tests, visual regression, accessibility, performance, security
- **Gate**: All critical checks must pass before merge

### Deployment Workflow  
- **Trigger**: Push to `main` branch
- **Steps**: Build → Deploy Backend → Deploy Frontends → Deploy Contracts → Post-deployment tests
- **Environments**: Staging → Production

### Security Audit Workflow
- **Trigger**: Weekly schedule (Monday 2 AM) + manual
- **Scope**: Dependencies, web app, smart contracts, infrastructure, secrets
- **Output**: Security report + GitHub issues for critical findings

## 🔧 Local Development Setup

### Prerequisites
```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm dlx playwright install --with-deps

# Install Foundry (for smart contracts)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Git Hooks Setup
```bash
# Hooks are automatically installed with husky
# Verify they're working:
git add .
git commit -m "test: verify hooks"
```

## 🧪 Testing Framework

### Unit & Integration Tests
- **Framework**: Vitest
- **Coverage**: 80% minimum
- **Location**: `**/tests/` directories

### End-to-End Tests  
- **Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit, Mobile
- **Location**: `tests/e2e/`

### Visual Regression
- **Framework**: BackstopJS
- **Viewports**: Desktop, tablet, mobile
- **Brand**: Automated color compliance checking

### Performance Testing
- **Lighthouse**: Performance, accessibility, SEO, PWA
- **Load Testing**: Artillery for API endpoints
- **Thresholds**: 90% performance, 95% accessibility

### Accessibility Testing
- **Tools**: axe-core, Pa11y
- **Standard**: WCAG 2.1 AA compliance
- **Requirement**: Zero violations

### Security Testing
- **Dependencies**: npm audit, Snyk
- **Web App**: OWASP ZAP scans
- **Contracts**: Slither, Mythril
- **Secrets**: GitLeaks, TruffleHog

## 🎨 Brand Compliance

### Approved Colors
```css
--primary-dark: #0f3b2d;
--primary: #1c5a45; 
--primary-light: #2d7d5a;
--accent: #4ef8a3;
--accent-dark: #2bb673;
--gold: #d4af37;
--text-light: #e8f4f0;
--text-muted: #a8b0b9;
```

### Font Stack
- Primary: Inter
- Fallback: system-ui, Arial, sans-serif

## 📋 Quality Metrics

### Coverage Requirements
- **Statements**: 80%
- **Branches**: 75%  
- **Functions**: 80%
- **Lines**: 80%

### Performance Thresholds
- **Performance**: 90
- **Accessibility**: 95
- **Best Practices**: 90
- **SEO**: 90
- **PWA**: 85

### Security Standards
- **High Severity**: 0 allowed
- **Moderate Severity**: 5 max
- **Low Severity**: 10 max

## 🔄 Git Workflow

### Commit Message Format
```
type(scope): description

feat: add user authentication
fix(api): resolve memory leak
docs: update README
style: format code with prettier
refactor(components): simplify search logic
test: add unit tests for artifact model
chore: update dependencies
```

### Pre-commit Checks
- ✅ Code formatting (Prettier)
- ✅ Linting (ESLint)  
- ✅ Type checking (TypeScript)
- ✅ Unit tests
- ✅ Brand color compliance
- ✅ Basic accessibility checks
- ✅ Secret scanning
- ✅ Smart contract compilation & tests

## 🚀 Deployment

### Environments
- **Development**: Local development servers
- **Staging**: `staging.pvabazaar.com` / `staging.pvabazaar.org`
- **Production**: `pvabazaar.com` / `pvabazaar.org`

### Deployment Steps
1. Pre-deployment validation
2. Backend API deployment (Vercel)
3. Frontend applications deployment
4. Smart contract deployment (if changed)
5. Post-deployment testing
6. Notification to team

### Environment Variables
```bash
# Backend
VERCEL_TOKEN=xxx
VERCEL_ORG_ID=xxx
VERCEL_BACKEND_PROJECT_ID=xxx

# Frontends  
VERCEL_COM_PROJECT_ID=xxx
VERCEL_ORG_PROJECT_ID=xxx

# Blockchain
BASE_SEPOLIA_RPC=xxx
BASE_MAINNET_RPC=xxx
DEPLOYER_PRIVATE_KEY=xxx

# Security
SNYK_TOKEN=xxx
SLACK_WEBHOOK=xxx
```

## 🛠️ Troubleshooting

### Common Issues

**Tests failing locally but passing in CI:**
- Check Node.js version matches CI (v20)
- Ensure all dependencies are installed
- Clear node_modules and reinstall

**Visual regression tests failing:**
- UI changes require baseline updates
- Run `pnpm qa:backstop:approve` to update baselines

**Performance tests failing:**
- Check if development servers are running
- Verify lighthouse thresholds in config
- Consider hardware differences

**Contract tests failing:**
- Ensure Foundry is installed and updated
- Check gas limits and network configuration
- Verify contract dependencies

### Getting Help
- Check GitHub Actions logs for detailed error messages
- Review individual test reports in `qa/reports/`
- Run specific test suites locally to debug
- Consult team for complex issues

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [BackstopJS](https://github.com/garris/BackstopJS)
- [Foundry Book](https://book.getfoundry.sh)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
