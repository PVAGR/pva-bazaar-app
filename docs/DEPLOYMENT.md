# Deployment: Vercel + Automation

**Full guide:** See [DEPLOYMENT.md](../DEPLOYMENT.md) at repo root for prerequisites, environment setup, post-deploy steps (Stripe webhook, health check), and optional GitHub Action.

## Vercel (Frontend + API)

The app is configured to deploy on **Vercel**: frontend static build plus serverless API.

### Auto-deploy on push to `main`

1. **Connect the repo to Vercel** (if not already):
   - [Vercel Dashboard](https://vercel.com/dashboard) → Add New Project → Import Git Repository.
   - Select this repo and connect (GitHub/GitLab/Bitbucket).

2. **Configure build**:
   - **Root Directory:** leave default (repo root).
   - **Framework Preset:** Other (or Vite if detected for Frontend).
   - **Build Command:** Use the monorepo scripts. Typically:
     - Build is driven by `vercel.json`: API uses `api/[...path].js`, Frontend uses `Frontend` with `@vercel/static-build` and `distDir: dist`.
   - **Output Directory:** Not used for root; the Frontend build outputs to `Frontend/dist`.

3. **Environment variables** (Project → Settings → Environment Variables):
   - Set all required env vars for the API (e.g. `MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_SITE_URL`, `SMTP_*` for emails).

4. **Deployment hooks (optional)**
   - Vercel already deploys on every push to the production branch (usually `main`).
   - To trigger deploys from other tools (e.g. CI), add a **Deploy Hook** in Project → Settings → Git → Deploy Hooks: create a hook and call its URL (POST) to trigger a new deployment.

### Stripe webhook URL (current backend)

- **Endpoint:** `https://<your-vercel-domain>/api/webhooks/stripe`  
  (Replace with your actual Vercel domain, e.g. `pvabazaar.org` if API is served there.)
- In **Stripe Dashboard** → Developers → Webhooks → Add endpoint:
  - URL: `https://<your-domain>/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `charge.refunded`, etc.
- Set `STRIPE_WEBHOOK_SECRET` in Vercel to the signing secret Stripe shows after creating the endpoint.

### If you use Supabase for the webhook

- Deploy the Edge Function: `supabase functions deploy stripe-webhook`.
- In Stripe, set the webhook URL to the function’s URL (e.g. `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`).
- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function secrets.

---

## Resilience and audit

- **Payment failures:** Handled in the webhook (`checkout.session.expired`, `checkout.session.async_payment_failed`). The user can be notified by email (see `sendPaymentFailedEmail`) so there are no hidden traps.
- **Immutable logging:** Every fulfillment-related action is logged in `FulfillmentTransactionLog` (MongoDB) or `fulfillment_transaction_log` (Supabase) for future audit.
