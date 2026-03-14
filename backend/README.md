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

## OpenClaw Bridge (Always-On Assistant)

This backend now exposes OpenClaw bridge endpoints:

- `GET /api/openclaw/status` – reports whether OpenClaw bridge is configured and reachable
- `POST /api/openclaw/dispatch` – forwards events/messages from PVA Bazaar to OpenClaw
- `GET /api/openclaw/watchdog-status` – summarizes recent watchdog health/error/alert state from logs
- `GET /api/openclaw/recent-events?limit=30` – returns structured recent activity log (last N events)

**Enhanced Health Endpoint:**
- `GET /api/health` – now includes `openclaw` field with gateway status summary

### Required env for bridge

- `OPENCLAW_GATEWAY_URL` (optional but recommended)
- `OPENCLAW_WEBHOOK_URL` (required for dispatch)
- `OPENCLAW_HEALTH_URL` (optional override)
- `OPENCLAW_API_KEY` (optional bearer token)
- `OPENCLAW_BRIDGE_SECRET` (optional shared secret; pass via `X-OpenClaw-Secret`)
- `OPENCLAW_WATCHDOG_LOG_PATH` (optional override for watchdog log file path)
- `OPENCLAW_WATCHDOG_ALERT_PATH` (optional override for watchdog alert log file path)

### Frontend Integration

The admin panel includes:
- **Connection status dropdown** with color-coded health badges and auto-refresh
- **OpenClaw summary card** showing state, errors, alerts, and last event timestamp
- **Test dispatch button** for on-demand connectivity verification
- **Recent events viewer** showing last 15 watchdog activities with color-coded levels

See `OPENCLAW_INTEGRATION.md` for complete setup and deployment guide.

### Important architecture note

Vercel serverless is not a persistent daemon host. For true behind-the-scenes always-on behavior, run OpenClaw on a persistent host (Linux VM, Docker host, or similar) and keep this backend as the secure bridge/API layer.

Typical flow:

1. OpenClaw runs continuously on a VM (`openclaw onboard --install-daemon`).
2. PVA backend dispatches jobs/events to OpenClaw through `POST /api/openclaw/dispatch`.
3. OpenClaw handles autonomous agent work via its own gateway/channels/webhooks.

## Marketplace Syndication (eBay / Etsy / Facebook)

The items API supports one-submit multi-channel syndication for seller listings.

### Endpoints

- `POST /api/items/register` (auth required)
	- Accepts `syndication` object in request body:
		- `syndication.facebook` (boolean)
		- `syndication.etsy` (boolean)
		- `syndication.ebay` (boolean)
	- Dispatches selected channels in parallel when connectors are configured.
	- Returns channel job results in `syndication.jobs` and aggregate counts in `syndication.summary`.

- `POST /api/items/:id/syndication/retry` (auth required, creator or admin)
	- Retries channels passed in body:
		- `{ "channels": ["facebook", "etsy", "ebay"] }`
	- If omitted, retries previously requested channels.
	- Updates persisted syndication status on the artifact.

- `POST /api/items/syndication/retry-bulk` (admin)
	- Retries listings currently containing `failed` or `manual_required` jobs.
	- Optional body fields:
		- `limit` (default 50, max 200)
		- `channels` (optional override list)
	- Returns aggregate queue results for operational dashboards.

### Connector env vars

Set these in the backend environment to enable automatic posting:

- `FACEBOOK_MARKETPLACE_WEBHOOK_URL`
- `FACEBOOK_MARKETPLACE_WEBHOOK_TOKEN`
- `ETSY_LISTING_WEBHOOK_URL`
- `ETSY_LISTING_WEBHOOK_TOKEN`
- `EBAY_LISTING_WEBHOOK_URL`
- `EBAY_LISTING_WEBHOOK_TOKEN`

If a connector URL is missing:
- Facebook returns `manual_required`.
- Etsy/eBay return `skipped`.

### Webhook payload contract (outbound)

Each connector receives:

```json
{
	"channel": "etsy",
	"item": {
		"id": "<artifact-id>",
		"slug": "<item-slug>",
		"title": "<title>",
		"description": "<description>",
		"category": "<category>",
		"price": 49.99,
		"currency": "USD",
		"imageUrls": [],
		"materials": [],
		"artisan": "<seller name>",
		"tags": [],
		"condition": "used",
		"measurements": ""
	},
	"seller": {
		"id": "<user-id>",
		"name": "<seller name>",
		"email": "<seller email>"
	},
	"source": "pvabazaar",
	"createdAt": "<iso timestamp>"
}
```

### Connector response contract (inbound)

Connector should return JSON with optional fields:

- `status`: `success | failed | skipped | manual_required`
- `message`: human-readable status detail
- `listingId`: external listing id
- `listingUrl`: external listing URL

If omitted, the backend treats a successful HTTP response as `success`.
