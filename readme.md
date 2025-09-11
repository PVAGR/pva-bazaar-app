<<<<<<< HEAD
# PVA Bazaar - Artisan Marketplace with Blockchain Provenance

[![Secret Scan (gitleaks)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml)

A blockchain-powered marketplace for artisan goods with provenance tracking and fractional ownership.

## 🚀 Quick Start

```bash
# Run the application
./test-app.sh
```

## 📱 Available Pages

- **Portfolio**: http://localhost:3000/pages/portfolio.html
- **Product Showcase**: http://localhost:3000/pages/productshowcase.html?id=[artifact_id]
- **Provenance**: http://localhost:3000/pages/provenance.html?id=[artifact_id]
- **Dashboard**: http://localhost:3000/pages/pvadashboard.html

## 👤 Dev Login

- Email: admin@pvabazaar.org
- Password: admin123

## 🧩 Features Implemented

- ✅ User authentication with JWT
- ✅ Artifact listing and details
- ✅ Fractional ownership capabilities
- ✅ Provenance verification
- ✅ Dashboard with key metrics
- ✅ MongoDB with in-memory fallback for development

## 🔧 Development

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

# Connect to backend on port 5001
# PVA Bazaar - Artisan Marketplace with Blockchain Provenance

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

# Connect to backend on port 5001
VITE_API_URL=http://localhost:5001/api npm run dev
```

## 🧩 Features Implemented

- ✅ User authentication with JWT
- ✅ Artifact listing and details
- ✅ Fractional ownership capabilities
- ✅ Provenance verification
- ✅ Dashboard with key metrics
- ✅ MongoDB with in-memory fallback for development

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
