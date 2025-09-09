# PVA Bazaar — Deployment Checklist

This checklist helps you safely move the app from local testing to production.

1) Protect secrets
  - Create a production `.env` (do NOT commit it).
  - Required environment variables:
    - `MONGODB_URI` — MongoDB connection string for production (do not use local docker URI).
    - `JWT_SECRET` — strong random secret for JWT signing.
    - `VITE_API_BASE` (frontend) — full URL of deployed backend API (e.g. `https://api.example.com/api`).
    - Optional: `PORT` for backend, other provider-specific vars.

2) Remove/secure local secret files
  - Ensure any local env files (for example `pva-bazaar-app.env`) are deleted or moved out of the repo.

3) Production build options
  - Vercel (recommended for quick static + serverless deployments):
    - Frontend: deploy the `Frontend` folder as a static site. Set `VITE_API_BASE` in Vercel Environment Variables to your API base (including `/api` if desired).
    - Backend: deploy `backend/api/index.js` as a Node server or serverless functions. Ensure `MONGODB_URI` and `JWT_SECRET` are set.
    - Note: earlier attempts in this repo encountered an existing misconfigured Vercel project; create a fresh Vercel project if possible.

  - Docker (recommended for single-host container deployments):
    - Build backend image from `backend` and frontend image from `Frontend` (or serve built frontend from any static host).
    - Use a production `docker-compose.yml` or Kubernetes manifest. Ensure `MONGODB_URI` points to production DB and not local container.

4) Sanity checks after deploy
  - GET /api/health → should return ok.
  - GET /api/artifacts → returns artifacts array.
  - Visit main pages (index, marketplace, product pages, checkout, provenance, dashboard) and confirm no 404s and that client modules load (HTTP 200).

5) Post-deploy housekeeping
  - Rotate any demo/admin credentials and create real admin user accounts.
  - Enable HTTPS (required) and configure CORS if frontend and backend domains differ.
  - Monitor logs and configure alerts for errors and high error rates.

Seeded test credentials (local only)
- Email: `admin@pvabazaar.org`
- Password: `admin123`

Notes & Risks
- Do NOT commit `JWT_SECRET` or `MONGODB_URI` to source control. Use environment variables or your host's secret manager.
- If deploying to Vercel, split frontend and backend into separate projects if you prefer; or deploy backend as serverless functions if you adapt the API.

If you want, I can:
- Prepare a production-ready `docker-compose.yml` and small `Dockerfile` adjustments, or
- Create a Vercel deployment plan (split projects, routes, env var list) and try a dry-run deploy to a test project.
