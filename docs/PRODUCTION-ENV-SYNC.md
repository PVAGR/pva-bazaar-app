# Production Environment Sync (pvabazaar.org)

This doc records the **environment variable names** used in production (Vercel) so the codebase and deployment stay aligned. **Never put real secret values in the repo or this file.**

## Variables now active in Vercel (names only)

- `MONGODB_URI`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional for frontend Stripe.js; checkout uses server redirect)
- `PUBLIC_SITE_URL` (e.g. `https://pvabazaar.org`)
- `NODE_ENV` (production)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SECRET_CODE`
- `ALLOWED_ORIGIN` (e.g. `https://pvabazaar.org`)
- `ETHEREUM_RPC_URL`

## You still need to add in Vercel

- **`STRIPE_WEBHOOK_SECRET`** — Create a webhook in Stripe (Developers → Webhooks): URL `https://pvabazaar.org/api/webhooks/stripe`, events `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`. Copy the **Signing secret** and set it in Vercel as `STRIPE_WEBHOOK_SECRET`. Without this, payment success will not trigger fulfillment (download grant, physical_fulfillment row, confirmation email).

## Optional

- **SMTP\_\*** — For fulfillment confirmation and payment-failed emails.
- **VERIFY_API_URL** / **VERIFY_API_SECRET** — For GitHub Actions to POST verification results so the badge shows “AI-Verified.”

## Codebase alignment

- **Backend** reads: `MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_SITE_URL`, `ADMIN_*`, `ALLOWED_ORIGIN`, `ETHEREUM_RPC_URL`, `NODE_ENV`. See `backend/.env.example`.
- **CORS** in `backend/api/index.js` allows `https://pvabazaar.org` and `https://www.pvabazaar.org`; no code change needed if you use those origins.
