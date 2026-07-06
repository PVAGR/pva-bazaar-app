# PVA Bazaar Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB Atlas (or compatible) account
- Stripe account
- Vercel account
- Git (GitHub)

## Environment Setup

1. **Copy env template**
   - Root: copy `.env.example` to `.env.local` for local dev.
   - Backend: copy `backend/.env.example` to `backend/.env` if you run the API locally.

2. **Fill variables**
   - Use real values only in `.env.local` / Vercel; never commit them.
   - See [Environment Variables](#environment-variables) below.

3. **Install and run locally**

   ```bash
   npm install
   npm run dev:frontend   # Frontend (Vite) — e.g. port 3000/5173
   npm run dev:backend    # Backend (Express) — e.g. port 5001
   ```

4. **Health check (local)**

   ```bash
   bash api-health-check.sh http://localhost:5001
   ```

   Or: `curl http://localhost:5001/api/health`

5. **Database: richyrichaii user and connection check**
   - Ensure `backend/.env` has `MONGODB_URI` (for Atlas with user `richyrichaii`, encode password `!` as `%21`: `pva123zxc%21`).
   - Set `ADMIN_USERNAME=richyrichaii` and `ADMIN_PASSWORD=pva123zxc!` in `backend/.env` for admin login.
   - Seed the DB (creates user **richyrichaii** with password `pva123zxc!` and sample artifacts):
     ```bash
     npm run db:seed
     ```
   - Verify all vessels are connected:
     ```bash
     npm run db:check
     ```
   - **App login:** username **richyrichaii**, password **pva123zxc!** (same as admin if you set ADMIN\_\* above).

## Environment Variables

All names and purpose are documented in:

- **Root:** `.env.example` (full list)
- **Backend:** `backend/.env.example`
- **Production sync:** `docs/PRODUCTION-ENV-SYNC.md`

Required for production:

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Min 32 chars
- `STRIPE_SECRET_KEY` — Stripe secret key (live or test)
- `STRIPE_WEBHOOK_SECRET` — From Stripe after creating webhook (see below)
- `PUBLIC_SITE_URL` — e.g. `https://pvabazaar.org`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET_CODE`
- `ALLOWED_ORIGIN` — e.g. `https://pvabazaar.org`
- `NODE_ENV` — `production`

Optional: `SMTP_*` (emails), `VERIFY_API_URL` / `VERIFY_API_SECRET`, `ETHEREUM_RPC_URL`.

## Vercel Deployment

1. **Connect repo**
   - Vercel Dashboard → Add New Project → Import Git repository (e.g. GitHub).
   - Use repo root; build is driven by `vercel.json`.

2. **Environment variables**
   - Project → Settings → Environment Variables.
   - Add every variable from `.env.example` (and `backend/.env.example`) for **Production** (and Preview if desired).
   - Do **not** commit real values; set them only in Vercel.

3. **Deploy**
   - Push to `main` (or your production branch). Vercel deploys automatically if Git integration is connected.
   - Or use a [Deploy Hook](https://vercel.com/docs/deployments/deploy-hooks) or the optional GitHub Action (see below).

## Post-Deploy Steps

1. **Stripe webhook**
   - Stripe Dashboard → Developers → Webhooks → **Add endpoint**.
   - **URL:** `https://pvabazaar.org/api/webhooks/stripe` (or your live API base + `/api/webhooks/stripe`).
   - **Events:** `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed` (add refund events if needed).
   - Copy the **Signing secret** (`whsec_...`).
   - In Vercel → Environment Variables, add **`STRIPE_WEBHOOK_SECRET`** with that value.
   - Redeploy so the serverless function gets the new secret.

2. **Test health**

   ```bash
   bash api-health-check.sh https://pvabazaar.org
   ```

   Or: `curl https://pvabazaar.org/api/health`  
   Expect `ok: true`, `mongodb: "connected"`, `stripe: "configured"` when everything is set.

3. **Smoke test**
   - Open site, navigate (Archive, Verification, Manifesto, Cart, Marketplace).
   - Open an artifact page (`/#/artifact/<slug>`).
   - Optional: run a test checkout and confirm fulfillment (order updated, physical_fulfillment row, email if SMTP set).

## Architecture

- **Frontend:** Vite + React (see `Frontend/`). Built to `Frontend/dist`; served by Vercel.
- **Backend:** Express in `backend/`; serverless entry `api/[...path].js`. Uses MongoDB (Mongoose) with connection pooling and singleton for serverless.
- See **ARCHITECTURE.md** (if present) and **ARCHITECTURAL-MANDATE-AND-CURRENT-BUILD.md** for intent and mapping.

## Health Check

- **Endpoint:** `GET /api/health`
- **Response:** `ok`, `timestamp`, `env`, `site`, `mongodb`, `stripe`, `ready`, etc.
- **Script:** `bash api-health-check.sh <API_BASE_URL>`  
  Example: `bash api-health-check.sh https://pvabazaar.org`

## Troubleshooting: "Database connection failed"

If the admin panel or API returns **"Database connection failed"** (503), the server cannot reach MongoDB. Fix in this order:

1. **Vercel → Project → Settings → Environment Variables**
   - Ensure **`MONGODB_URI`** is set for **Production** (and Preview if you use it).
   - Value must be a full connection string, e.g.:
     - Atlas: `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/pvabazaar`
     - Encode special characters in the password: `!` → `%21`, `@` → `%40`, etc.

2. **MongoDB Atlas → Network Access**
   - Vercel serverless runs from many IPs. Add **0.0.0.0/0** (Allow access from anywhere) so the API can connect.
   - Save and wait a minute, then retry.

3. **Redeploy**
   - After changing env vars in Vercel, trigger a new deployment (Redeploy from the Vercel dashboard or push a commit) so the runtime picks up `MONGODB_URI`.

4. **Verify**
   - `curl https://pvabazaar.org/api/health` (or your API URL) — response should show `"mongodb": "connected"`.

## Optional: GitHub Action (Vercel)

If you prefer CI to trigger Vercel (e.g. with `vercel-action`), add secrets in GitHub:

- `VERCEL_TOKEN`
- `ORG_ID`
- `PROJECT_ID`

See `.github/workflows/deploy-web-vercel.yml` or create a workflow that uses `amondnet/vercel-action` with these secrets. Many setups rely on Vercel’s built-in Git integration instead.
