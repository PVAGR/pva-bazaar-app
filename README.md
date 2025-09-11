# PVA Bazaar - Artisan Marketplace with Blockchain Provenance

[![Secret Scan](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml)

A blockchain-powered marketplace for artisan goods with provenance tracking and fractional ownership.

## 🚀 Quick Start (Local Docker)

I added a Docker-based test setup so you can run the full stack on a personal server before deploying to Vercel.

Files added for local testing:
- `backend/Dockerfile` — runs the Node API
- `Frontend/Dockerfile` — builds the Vite app and serves with nginx
- `docker-compose.yml` — brings up MongoDB, backend (port 5001) and frontend (port 3000)
- `.env.docker` — local environment values for Docker (do NOT use in production)

Quickstart (on your server):

1. Build and start the stack:

```bash
docker compose up -d --build
```

2. Wait a few seconds, then check health:

```bash
curl http://localhost:5001/api/health
```

3. Visit the frontend in a browser:

http://<server-ip-or-hostname>:3000

Notes:
- The backend will auto-seed an admin user (`admin@pvabazaar.org` / `admin123`) when running with `DEV_AUTO_SEED=true`.
- This is for local testing only. Do not use `.env.docker` or these secrets in production.

## 📱 Available Pages (local dev)

- **Portfolio**: http://localhost:3000/pages/portfolio.html
- **Product Showcase**: http://localhost:3000/pages/productshowcase.html?id=[artifact_id]
- **Provenance**: http://localhost:3000/pages/provenance.html?id=[artifact_id]
- **Dashboard**: http://localhost:3000/pages/pvadashboard.html

## 👤 Dev Login

- Email: admin@pvabazaar.org
- Password: admin123

## 🔧 Development (commands)

### Backend

```bash
cd backend
npm install

# Start with in-memory database (no MongoDB needed)
PORT=5001 NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true npm run dev
```

### Frontend

```bash
cd Frontend
npm install

VITE_API_URL=http://localhost:5001/api npm run dev
```

## 🧩 Features Implemented

- ✅ User authentication with JWT
- ✅ Artifact listing and details
- ✅ Fractional ownership capabilities
- ✅ Provenance verification
- ✅ Dashboard with key metrics
- ✅ MongoDB with in-memory fallback for development

## 🔒 Security & Secret Scanning

This repository uses automated secret scanning to prevent accidental exposure of sensitive information:

- **CI Secret Scanning**: Automated scans run on every push, pull request, and daily via GitHub Actions
- **Pre-commit Hooks**: Local scanning with gitleaks before commits
- **SARIF Integration**: Findings are automatically uploaded to GitHub's Code Scanning alerts
- **Configuration**: See `gitleaks.toml` for scan configuration and allowlist

### Running Secret Scans Locally

```bash
# Install gitleaks (if not already installed)
curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/install.sh | bash

# Run scan on staged files (pre-commit)
./scripts/secret-scan.sh

# Run full repository scan
gitleaks detect --config=gitleaks.toml --redact
```

**⚠️ Important**: Never commit real secrets or credentials. Use environment variables and `.env` files (which are gitignored) for sensitive configuration.

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
