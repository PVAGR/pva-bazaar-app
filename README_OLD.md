# 🛍️ PVA Bazaar - Sacred Marketplace for Authentic Artifacts

[![Production Status](https://img.shields.io/badge/status-production%20ready-brightgreen)](https://pvabazaar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-success)](https://www.mongodb.com/)
[![Secret Scan](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml)

> A full-stack marketplace for authentic artifacts with real-time inventory, secure payments, and admin controls. Built with React, Express, MongoDB, and Stripe.

**[🚀 Live Demo](https://pvabazaar.org)** | **[📖 Full Documentation](./PRODUCTION_DEPLOYMENT_GUIDE.md)** | **[🐛 Report Issues](https://github.com/PVAGR/pva-bazaar-app/issues)**

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

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

### GitHub Pages (Frontend) + Vercel (Backend) Setup

This project uses **GitHub Pages** for the static frontend and **Vercel** for the backend API.

#### ✅ Pre-Deployment Verification

Run the verification script to ensure all configurations are correct:

```bash
./verify-fixes.sh
```

All checks should pass ✅ before proceeding with deployment.

### GitHub Pages Deployment Options

**Option 1: GitHub Actions (RECOMMENDED)**

This repo includes a GitHub Actions workflow that automatically builds and deploys the frontend:

- **What it does:** Automatically builds `Frontend/dist` and deploys to `gh-pages` branch
- **When it runs:** On every push to `main` that changes `Frontend/**`
- **How to use:** Just push your changes! No manual steps needed.
- **Workflow file:** `.github/workflows/deploy-frontend.yml`

**Benefits:**
- ✅ Automatic builds on every push
- ✅ No manual build/deploy steps
- ✅ Ensures consistent production builds
- ✅ Uses proper Node.js version (20)
- ✅ Injects VITE_API_URL from GitHub secrets

**To use GitHub Actions deployment:**
1. Push your changes to `main` branch
2. Check Actions tab on GitHub for deployment status
3. Visit https://pvabazaar.org after deployment completes (2-5 minutes)

**Option 2: Manual GitHub Pages Deploy**

Only use this if you need to bypass Actions:

1. **Build the frontend:**
   ```bash
   cd Frontend
   npm install
   npm run build
   ```
   The `dist` folder contains your static files.

2. **Deploy to GitHub Pages:**
   
   **Option A - Using GitHub Settings:**
   - Go to your repo on GitHub: Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/Frontend/dist`
   - Save and wait for deployment
   
   **Option B - Using gh-pages package:**
   ```bash
   cd Frontend
   npm install -D gh-pages
   # Add to package.json scripts: "deploy": "gh-pages -d dist"
   npm run deploy
   ```

3. **Set up custom domain:**
   - In GitHub Pages settings, add custom domain: `pvabazaar.org`
   - In your DNS provider, add a CNAME record pointing to `<username>.github.io`
   - Wait for DNS propagation (can take up to 48 hours)

#### Backend Deployment to Vercel

**IMPORTANT:** The backend is a Node.js Express API, NOT a static site. Configure correctly to avoid deployment failures.

1. **Create new Vercel project:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - **Set Root Directory to `backend`** ⚠️ CRITICAL
   - Framework Preset: **Other** (not Next.js, not Create React App)
   - Build Command: Leave empty or `npm install` (no build needed)
   - Output Directory: **Leave empty** (Node.js serverless function, not static)

2. **Verify vercel.json configuration:**
   The `backend/vercel.json` should already be configured correctly:
   ```json
   {
     "version": 2,
     "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
     "routes": [{ "src": "/(.*)", "dest": "api/index.js" }]
   }
   ```
   This tells Vercel to deploy as a Node.js serverless function, NOT generate a `dist` folder.

3. **Add environment variables in Vercel dashboard:**
   Go to Project Settings → Environment Variables and add:
   ```
   MONGODB_URI=<your-production-mongodb-connection-string>
   JWT_SECRET=<strong-random-secret-minimum-32-chars>
   NODE_ENV=production
   ALLOWED_ORIGIN=https://pvabazaar.org
   USE_MEMORY_DB=false
   ETHEREUM_RPC_URL=https://mainnet.base.org
   ADMIN_WALLET_PUBLIC=<your-wallet-address>
   ```

4. **Deploy:**
   - Click "Deploy"
   - Note your backend URL (e.g., `https://pva-bazaar-backend.vercel.app`)
   - **Ignore any warnings about "dist" not found** - Node.js APIs don't create dist folders

5. **Test backend deployment:**
   ```bash
   curl https://your-backend-url.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

6. **Update frontend API URL:**
   - Edit `Frontend/.env.production`
   - Set `VITE_API_URL=https://your-backend-url.vercel.app/api`
   - Rebuild and redeploy frontend

#### Local Testing Before Deployment

Always test locally first:

```bash
./test-app.sh
```

This starts backend on port 5001 and frontend on port 3000.

#### Troubleshooting Deployment

**Issue: Blank white screen on pvabazaar.org**
- Open browser DevTools (F12) → Console tab
- Look for errors:
  - **404 on assets:** Base path might be wrong in `vite.config.js` (should be `'/'`)
  - **CORS errors:** Check `ALLOWED_ORIGIN` in Vercel backend environment variables
  - **Failed to fetch API:** Verify `VITE_API_URL` in `.env.production` matches your Vercel backend URL
- Check Network tab for failed requests

**Issue: GitHub Actions deployment succeeds but site still blank**
1. Check gh-pages branch content:
   ```bash
   git fetch origin gh-pages
   git ls-tree -r origin/gh-pages --name-only
   ```
2. **Expected:** Should show `index.html`, `assets/`, etc. at root (NOT `src/`, `public/`)
3. **If wrong:** Workflow may be deploying source instead of built files
4. Go to: https://github.com/PVAGR/pva-bazaar-app/actions
5. Check latest "Deploy Frontend to GitHub Pages" workflow logs
6. Verify "Deploy to GitHub Pages" step shows `Frontend/dist` folder being deployed

**Post-Deploy Verification**
After GitHub Actions completes:
1. **Download build artifact** from Actions run:
   - Go to: https://github.com/PVAGR/pva-bazaar-app/actions
   - Click latest "Deploy Frontend to GitHub Pages" run
   - Scroll to "Artifacts" section at bottom
   - Download `build-dist.zip` to verify built files locally
   - Should contain: `index.html`, `assets/`, NOT `src/` or `public/`
   
2. **Run local verification:**
   ```bash
   ./verify-fixes.sh
   ```
   Should show: "✅ gh-pages has index.html at root" and "✅ No source directories"

3. **Force redeploy if needed:**
   - Go to: https://github.com/PVAGR/pva-bazaar-app/actions
   - Click "Deploy Frontend to GitHub Pages" workflow
   - Click "Run workflow" button (top right)
   - Select main branch → Run workflow
   - This forces a fresh deployment with `force: true` and `clean: true`

4. **Check GitHub Pages settings:**
   - Go to: https://github.com/PVAGR/pva-bazaar-app/settings/pages
   - Source: Should be "gh-pages" branch, "/ (root)" folder
   - Custom domain: Should show `pvabazaar.org` (if configured)

**Issue: After push, check Actions logs for build/deploy steps**
1. Visit: https://github.com/PVAGR/pva-bazaar-app/actions
2. Click latest workflow run
3. Expand "Install and Build" step - should show successful Vite build
4. Expand "Deploy to GitHub Pages" step - should show files being deployed
5. Common errors:
   - **Build fails:** Check for missing dependencies or build errors
   - **Deploy fails:** Check branch permissions (needs `contents: write`)

**Issue: Clear browser cache if site doesn't update**
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or open DevTools (F12) → Network tab → check "Disable cache"
- Or try incognito/private browsing mode

**Issue: API connection errors**
- Verify backend is deployed and running on Vercel
- Check Vercel logs: Project → Deployments → Click deployment → View Function Logs
- Ensure `MONGODB_URI` and `JWT_SECRET` are set in Vercel environment variables
- Test backend directly: `curl https://your-backend.vercel.app/api/health`

**Issue: GitHub Pages shows 404**
- Ensure GitHub Pages is enabled: Settings → Pages → Source: gh-pages branch
- Custom domain should be set to `pvabazaar.org` in GitHub Pages settings
- Check DNS: CNAME record should point to `pvagr.github.io`
- Wait 5-10 minutes after first deployment for DNS propagation

**Issue: Database connection fails**
- Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0) for serverless
- Check MongoDB connection string format includes `?retryWrites=true&w=majority`
- Ensure MongoDB user has read/write permissions

**Verifying Deployment Status:**
```bash
# Check if site loads
curl -I https://pvabazaar.org

# Check gh-pages branch content
git fetch origin gh-pages && git ls-tree -r origin/gh-pages --name-only | head -20

# Check if backend is up
curl https://your-backend.vercel.app/api/health

# Should return: {"ok":true,"message":"API is healthy"}
```

For detailed deployment information, see [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md).

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
