## Commit Guide (Local Bypass + Secret Scan)

- Hooks: This repo uses Husky pre-commit checks (formatting, brand, accessibility, typecheck, tests, secret scan).
- Secret scan: `scripts/secret-scan.sh` scans only staged files using `gitleaks`.
  - It prefers a system install but will also use the bundled binary in `bin/`.
  - In CI, missing `gitleaks` fails the job; locally it prints a warning and skips.

Install gitleaks locally (optional):

```
curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/install.sh | bash
```

Local commit bypass options (use sparingly):

```
# Skip all Husky hooks
HUSKY=0 git commit -m "your message"

# Skip quality checks while keeping Husky framework
SKIP_QUALITY_CHECKS=true git commit -m "your message"

# Fast path (equivalent intent)
FAST_COMMIT=1 git commit -m "your message"
```

Notes:

- Keep `.env` files out of Git; they are ignored by default. Never commit secrets.
- If a check fails, prefer fixing the underlying issue, then re-commit.

# PVA Bazaar - Artisan Marketplace with Blockchain Provenance

[![Secret Scan (gitleaks)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml)

A blockchain-powered marketplace for artisan goods with provenance tracking and fractional ownership.

## 🚀 Quick Start

```bash
# One-shot dev run (backend + frontend)
./run-app.sh
```

Or run manually:

```bash
# Backend
cd backend
npm install
PORT=5001 NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true npm run dev

# Frontend (separate terminal)
cd Frontend
npm install
VITE_API_URL=http://localhost:5001 npm run dev
```

## Blogs (Dev)

Quick test end-to-end:

```bash
# Publish a blog (dev quick-publish)
curl -X POST http://localhost:5001/api/blogs/quick-publish \
   -H 'Content-Type: application/json' \
   -d '{"slug":"welcome","title":"Welcome","content":"Hello from PVA"}'

# View in the frontend
# Open http://localhost:3000/public/blog.html?slug=welcome
```

Environment setup:

- Use [backend/.env.example](backend/.env.example) to create `backend/.env` for local dev.
- In production, set secrets via deployment environment. Do not commit real secrets.

## 📱 Available Pages

- Portfolio: http://localhost:3000/pages/portfolio.html
- Product Showcase: http://localhost:3000/pages/productshowcase.html?id=[artifact_id]
- Provenance: http://localhost:3000/pages/provenance.html?id=[artifact_id]
- Dashboard: http://localhost:3000/pages/pvadashboard.html

## 👤 Dev Login

- Email: admin@pvabazaar.org
- Password: admin123

## 🐳 Quick Start (Docker)

```bash
docker compose up -d --build
curl http://localhost:5001/api/health
```

Then visit: http://localhost:3000

## Security & Secret Scanning

We use [gitleaks](https://github.com/gitleaks/gitleaks) locally (pre-commit) and in CI to prevent accidental secret commits.

### Local Scan

Run:

```bash
scripts/secret-scan.sh
```

This is also executed automatically by the pre-commit hook. If prompted, install gitleaks using the provided one-line script.

### CI Scan

Workflow: "Secret Scan (gitleaks)" runs on:

- Pull requests (all branches)
- Pushes to `main`
- Nightly schedule (03:15 UTC)
- Manual dispatch

It uploads a SARIF report to GitHub Code Scanning (Security tab) and fails the build if any leak is detected.

### Allowlist Policy

The allowlist in `gitleaks.toml` is intentionally minimal and only includes specific benign prompt phrases. To request an addition:

1. Justify why the string is not a credential.
2. Provide a narrow exact phrase or tightly scoped regex (no wildcards like `.*secret.*`).
3. Open a PR; requires reviewer approval.

Never allowlist entire files or directories unless absolutely unavoidable.

### False Positive Procedure

Open an issue or PR containing:

- File & line reference
- Detected rule ID / description
- Rationale for allowlisting

### Real Secret Exposure Procedure

1. Rotate the affected credential immediately.
2. (If needed) Purge from git history (e.g., `git filter-repo`).
3. Open an incident issue documenting remediation steps (private if necessary).

---

## 📋 Next Steps

### Priority Implementation Order

1. **Enhanced Authentication UI**
   - Implement proper login/signup modal
   - Add profile management page
   - Add password reset functionality

2. **Shopping Cart**
   - Create cart model in backend
   - Add cart API endpoints
   - Implement cart UI components

3. **Payment Processing**
   - Integrate with payment gateway
   - Implement checkout flow
   - Handle payment confirmations

4. **Enhanced Blockchain Features**
   - Complete smart contract integration
   - Add real-time ownership verification
   - Implement on-chain provenance

5. **Admin Dashboard**
   - Add artifact management tools
   - User management features
   - Sales analytics

## 🚀 Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed deployment instructions.

## 🔍 Troubleshooting

Use the API health check script to verify backend connectivity:

```bash
./api-health-check.sh
```

## 📊 Database Management

Export and import data between environments:

```bash
# Export data
cd backend
node scripts/export-data.js > backup.json

# Import data
cd backend
node scripts/import-data.js backup.json
```
