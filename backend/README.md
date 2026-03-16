# Backend Service

## Environment Setup

Create a local `.env` file based on `.env.example`:

```
cp backend/.env.example backend/.env
```

Fill in the required values:

```
MONGODB_URI=your-mongodb-uri
JWT_SECRET=change-me
```

Optional (development helpers):

```
USE_MEMORY_DB=true        # fallback to in-memory Mongo if no MONGODB_URI
DEV_AUTO_SEED=true        # seed sample data when using memory DB
ADMIN_SECRET_CODE=dev-secret
```

## Running Locally

```
npm run dev:backend
```

API Base: `http://localhost:5000/api`

## Security Notes

Never commit `.env`. The root `pva-bazaar-app.env` is a stub only.

# Backend setup

1. Environment

- Copy `.env.example` to `.env` and set real values.
- Required keys: `MONGODB_URI`, `JWT_SECRET`.
- Do NOT commit `.env`.

2. Start the API (local dev)

- With in-memory Mongo: `PORT=5000 NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true npm run dev`


## CORS / Allowed Origins

This API is consumed by:
- Frontend (Vite) in dev: `http://localhost:5173` (sometimes `http://localhost:3000`)
- Frontend (production): `https://pvabazaar.org` and `https://www.pvabazaar.org`

### Configuration
CORS is configured in `index.js` using the `cors` middleware with an allowlist.

Allowed origins include:
- `http://localhost:5173`
- `http://localhost:3000`
- `https://pvabazaar.org`
- `https://www.pvabazaar.org`
- Any additional origins in `ALLOWED_ORIGIN` (comma-separated)

Example:
ALLOWED_ORIGIN="https://pvabazaar.org,https://www.pvabazaar.org,https://pvagr.github.io"

### Notes
- `ALLOWED_ORIGIN` supports comma-separated values (it is split + trimmed in code).
- Preflight requests are supported via `app.options("*", cors(corsOptions))`.
- CORS headers are added on all responses (including errors), so browser errors don’t appear as “Failed to fetch” without context.

### Troubleshooting
If the frontend shows “Failed to fetch”:
1) Confirm the frontend is calling the correct backend base URL (VITE_API_URL).
2) Confirm the exact frontend origin is included in `ALLOWED_ORIGIN`.
3) Redeploy backend after changing env vars.

## Sentry Observability

- `SENTRY_DSN` – Sentry DSN for backend
- `SENTRY_RELEASE` – Release version (set to git SHA or Vercel build ID)
- `SENTRY_ENVIRONMENT` – Environment name (optional, defaults to NODE_ENV)
- Sentry is initialized in `api/index.js` with release, environment, and beforeSend scrubber for PII/tokens/admin codes.
- For full Release Health and tracing, set these env vars in CI/CD.
- See also: Frontend/SENTRY.md for frontend setup and tracing propagation.
