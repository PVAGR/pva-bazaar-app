# CI/CD Setup Instructions

## 1. GitHub Repository Setup

### Enable GitHub Actions
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Under "Actions permissions", select **Allow all actions and reusable workflows**
4. Save the settings

### Add Repository Secrets
Go to **Settings** → **Secrets and variables** → **Actions** and add:

```
VERCEL_TOKEN
VERCEL_ORG_ID  
VERCEL_BACKEND_PROJECT_ID
VERCEL_COM_PROJECT_ID
VERCEL_ORG_PROJECT_ID
BASE_SEPOLIA_RPC
BASE_MAINNET_RPC
DEPLOYER_PRIVATE_KEY
SNYK_TOKEN
SLACK_WEBHOOK
```

## 2. Vercel Setup

### Create Vercel Projects
```bash
# Install Vercel CLI
npm i -g vercel

# Create backend project
cd backend
vercel --confirm

# Create web-com project  
cd ../apps/web-com
vercel --confirm

# Create web-org project
cd ../apps/web-org
vercel --confirm
```

### Get Project IDs
```bash
# List your projects and copy the IDs
vercel ls
```

### Get Organization ID
```bash
# Get your org ID
vercel teams ls
```

## 3. Snyk Security Setup

1. Sign up at [snyk.io](https://snyk.io)
2. Go to **Settings** → **General** → **Auth Token**
3. Copy the token and add as `SNYK_TOKEN` secret

## 4. Slack Notifications (Optional)

1. Create a Slack webhook:
   - Go to your Slack workspace
   - Navigate to **Apps** → **Incoming Webhooks**
   - Create a new webhook for #deployments channel
2. Add webhook URL as `SLACK_WEBHOOK` secret

## 5. Local Development Setup

### Install Dependencies
```bash
pnpm install
```

### Setup Git Hooks
```bash
# Husky hooks are automatically installed
# Verify they work:
git add .
git commit -m "test: verify git hooks"
```

### Test Quality Pipeline Locally
```bash
# Quick checks
./qa/scripts/orchestrator.sh quick

# Full quality suite
./qa/scripts/orchestrator.sh full
```

## 6. Enable Branch Protection

### Main Branch Protection
Go to **Settings** → **Branches** → **Add rule** for `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Required checks: `Quality Gate Summary`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Restrict pushes that create files

### Develop Branch Protection  
Go to **Settings** → **Branches** → **Add rule** for `develop`:

- ✅ Require status checks to pass before merging
  - Required checks: `unit_integration`, `security_audit`
- ✅ Require branches to be up to date before merging

## 7. Workflow Testing

### Test Quality Gates
1. Create a feature branch
2. Make some changes
3. Create pull request to `develop`
4. Verify all quality checks run and pass

### Test Deployment
1. Merge PR to `main` branch
2. Verify deployment workflow runs
3. Check that sites deploy successfully

## 8. Monitoring Setup

### GitHub Insights
- **Actions**: Monitor workflow success rates
- **Security**: Review dependency alerts
- **Insights**: Track code frequency and deployment frequency

### Vercel Analytics
- Enable analytics on Vercel projects
- Monitor performance and usage

## 9. Team Onboarding

### Developer Setup Checklist
- [ ] Clone repository
- [ ] Run `pnpm install`
- [ ] Verify git hooks work
- [ ] Run quality checks locally
- [ ] Create test pull request
- [ ] Review CI/CD documentation

### Code Review Guidelines
- [ ] All quality gates must pass
- [ ] Brand compliance verified
- [ ] Accessibility tested
- [ ] Performance impact assessed
- [ ] Security implications reviewed

## 10. Troubleshooting

### Common Issues

**Workflow not triggering:**
- Check repository permissions
- Verify workflow files are in `.github/workflows/`
- Check branch protection rules

**Secrets not available:**
- Verify secret names match exactly
- Check organization vs repository secrets
- Ensure secrets are not expired

**Vercel deployment failing:**
- Verify project IDs are correct
- Check build commands in vercel.json
- Review environment variables

**Quality checks failing:**
- Run locally first to debug
- Check Node.js version compatibility
- Review individual test outputs

### Getting Help
1. Check GitHub Actions logs
2. Review quality reports in artifacts
3. Run tests locally for debugging
4. Consult team documentation
5. Create issue for persistent problems

## 11. Maintenance

### Regular Tasks
- [ ] Weekly: Review security audit results
- [ ] Monthly: Update dependencies  
- [ ] Quarterly: Review and update quality thresholds
- [ ] Annually: Security audit and penetration testing

### Updates and Upgrades
- Monitor for new versions of testing tools
- Update browser versions for Playwright
- Keep Foundry updated for contract testing
- Review and update security scanning tools

This completes your CI/CD setup! Your PVA Bazaar project now has comprehensive quality gates, automated deployment, and security monitoring.
