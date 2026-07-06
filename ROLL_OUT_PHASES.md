# Rollout Phases (No Guesswork)

## Phase A - Core Runtime Stable (done)

- User listing route: `POST /api/items/register`
- Email hooks wired (user + admin, non-blocking)
- Frontend listing wizard: `#/items/new`
- Marketplace CTA + card mapping fixed for `name/media/priceCents`
- Cross-platform root prepare script fixed

## Phase B - Hardening (done)

- Payload/image guard rails:
  - max `6` images
  - max ~`250KB` per image in frontend draft flow
  - backend rejects oversized inline images
- Auth-safe UI access checks (`typeof window !== 'undefined'`)
- Normalize contract fixed so admin item routes map to `Artifact` schema

## Phase C - Rollout Verification (run in order)

1. Install dependencies

```bash
npm install
```

2. Backend load sanity

```bash
node -e "require('./backend/api/index'); console.log('backend-load-ok')"
```

3. Frontend production build

```bash
npm run build --workspace Frontend
```

4. Runtime smoke (manual)

- Login and keep token in localStorage
- Open `#/items/new`
- Submit listing with:
  - title/description/category/price
  - 1 small image (<250KB)
- Confirm success message and redirect to marketplace
- Confirm listing exists (draft state in backend DB)

5. Backend API smoke with token

```bash
curl -X POST http://localhost:5001/api/items/register ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_JWT_TOKEN" ^
  -d "{\"title\":\"Smoke Item\",\"description\":\"Smoke test\",\"price\":49.99,\"category\":\"art\"}"
```

5b) One-command core smoke (auth + listing + oracle + stream webhook)

```bash
cd backend
npm run smoke:core
```

6. Optional email verification

- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Re-submit listing and confirm email logs/sends

## Known Non-Blocking Warnings

- Node version warning (repo expects Node 20; current environment may be newer)
- Sentry auth token warning during frontend build if not configured
- Large vendor chunk warning from Vite build

## Next Work (after rollout)

1. Replace inline image payloads with storage upload URLs (S3/Cloudinary/IPFS)
2. Add integration tests for `/api/items/register` and `/api/oracle/assessment`
3. Finish webhook signature verification TODO in streams/stripe paths
