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

## Rollback

Both deploy pipelines deploy the commit they are given; rolling back means
redeploying a known-good commit. Nothing is mutated in place, so a bad deploy
never destroys the last working version — it just becomes the new "latest"
until you redeploy over it.

### Backend (Vercel)

```bash
# Option A: redeploy an older commit via the deploy workflow (preferred —
# it re-runs env sync + readiness verification).
gh workflow run deploy-backend-live.yml --ref <known-good-sha>

# Option B: Vercel dashboard → Deployments → open the last good deployment
# → "Promote to Production". Instant, no rebuild.
```

### Frontend (GitHub Pages + Vercel)

```bash
# deploy-frontend.yml accepts the ref to deploy + a rollback_reason input.
gh workflow run deploy-frontend.yml --ref <known-good-sha> -f rollback_reason="reverting bad deploy <sha>"
```

For GitHub Pages specifically, the workflow force-pushes the build artifact
to the `gh-pages` branch (or equivalent), so promoting an old deployment in
the Vercel dashboard does NOT fix Pages — rerun the workflow instead.

### Verify which version is live

```bash
curl -s https://pva-backend-api.vercel.app/api/version
# Compare shortSha against git log --oneline
```

### When to roll back vs. roll forward

- **Roll forward** (push a fix) when the bad deploy is a code bug you can
  patch quickly — this is the default.
- **Roll back** when the bad deploy breaks the deploy pipeline itself, or
  you need production healthy while investigating.

---

## Resilience and audit

- **Payment failures:** Handled in the webhook (`checkout.session.expired`, `checkout.session.async_payment_failed`). The user can be notified by email (see `sendPaymentFailedEmail`) so there are no hidden traps.
- **Immutable logging:** Every fulfillment-related action is logged in `FulfillmentTransactionLog` (MongoDB) or `fulfillment_transaction_log` (Supabase) for future audit.
