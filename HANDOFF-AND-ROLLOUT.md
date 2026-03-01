# PVA Bazaar — Full Handoff & Rollout Guide

This document is the **single source of truth for execution**: what was built, what you need to provide, and how to commit and roll it out. Give it to the LLM coder (or human) who will execute the rollout and ongoing builds.

**Stack (do not assume Next.js):** Frontend = **Vite + React** (HashRouter). Backend = **Express + MongoDB**. Hosting = **Vercel**. Payments = **Stripe**. Verification = **Python script + GitHub Actions**; results in **MongoDB** (optional Supabase in `/supabase/`). For the **philosophical mandate** and how it maps to this codebase, see **`ARCHITECTURAL-MANDATE-AND-CURRENT-BUILD.md`**.

---

## Part 1: What Exists (Inventory of Everything Built)

### A. Philosophy & Mission (Task 1 add-ons)

| What | Where | Purpose |
|------|--------|--------|
| Mission constants | `Frontend/src/lib/philosophy.js` | `MISSION_STATEMENT`, `VERIFICATION_STANDARD`, `SITE_TAGLINE`, `ANTI_DRUJ` — single source for site copy |
| Shared layout | All routes wrapped in `<Layout>` in `Frontend/src/App.jsx` | Every page gets same nav and footer |
| New nav items | `Frontend/src/components/Layout.jsx` | **Archive**, **Verification**, **Manifesto**, **Cart** (plus existing Marketplace, Oracle, About) |
| New pages | `Frontend/src/pages/VerificationPage.jsx`, `ManifestoPage.jsx`, `CartPage.jsx` | Placeholder content; Verification/Manifesto use `philosophy.js` |
| Optional dark theme | `Frontend/src/styles/alchemical-theme.css` | Add class `alchemical` to a parent (e.g. `<html>`) to enable dark + gold |

**Routes added:** `/#/verification`, `/#/manifesto`, `/#/cart`

---

### B. AI-Verified Artifact Hashing (Task 2)

| What | Where | Purpose |
|------|--------|--------|
| Python verifier | `scripts/verify_artifact.py` | Reads a file, SHA-256, compares to trusted JSON; returns `is_authentic`, `confidence_score`; exit 0 = verified |
| Trusted hash DB | `scripts/trusted_hashes.json` | JSON list of known-good hashes (e.g. from Archive.org). One placeholder entry; **you add real entries.** |
| GitHub Action | `.github/workflows/verify.yml` | On push/PR when `artifacts/**` or script/DB change: finds `.iso`/`.bin`/`.cue` under `artifacts/`, runs verifier. Optional: POST results to API if secrets set. |
| Backend verification API | `backend/models/VerificationResult.js`, `backend/routes/verification.js` | **POST /api/verification** — store result, get back `certificateId`. **GET /api/verification/artifact/:idOrSlug** — latest verification (for badge). **GET /api/verification/certificate/:certificateId** |
| Verification badge | `Frontend/src/components/VerificationBadge.jsx` (+ CSS) | Shows **AI-Verified** / **Integrity Compromised** / **Unverified** by fetching verification for an item |
| Verification hash block | `Frontend/src/components/VerificationHashBlock.jsx` (+ CSS) | Expandable partial hash/certificate ID on artifact page |
| Docs | `scripts/README-verification.md`, `docs/VERIFICATION-SYSTEM.md` | How to run script, add hashes, CI, API, badge |

**Backend:** Verification routes mounted in `backend/api/index.js` at `/api/verification` (no legacy gate).

---

### C. Alchemical Digital Storefront (Task 3)

| What | Where | Purpose |
|------|--------|--------|
| Artifact product page | `Frontend/src/pages/ArtifactDetailPage.jsx` (+ CSS) | Dark “Alchemical” product view: high-res image, Scarcity Index, Verification Hash (expandable), Lore, “Initiate Acquisition” CTA |
| Route | `/#/artifact/:slug` | Dynamic artifact by slug; added in `Frontend/src/App.jsx` |
| Framer Motion | `Frontend/package.json` (dependency `framer-motion`) | Fade-in and hover on artifact page |
| VerificationBadge theme | `VerificationBadge.jsx` + CSS | `theme="alchemical"` for dark/gold styling |
| Link from marketplace | `Frontend/src/pages/MarketplaceItemPage.jsx` | “Preserve history →” links to `/#/artifact/:slug` |
| Backend for artifact page | `backend/lib/itemNormalize.js` | `toPublicItem` now exposes `stockQty`, `lore` for scarcity and lore section |
| Backend verification | `backend/routes/verification.js` | GET artifact response now includes `computed_hash` for hash block |

**Dependency:** Frontend needs `npm install` (or equivalent) so `framer-motion` is installed.

---

### D. Automated Fulfillment & Deployment (Task 4)

| What | Where | Purpose |
|------|--------|--------|
| Stripe webhook (extended) | `backend/routes/webhooksStripe.js` | On **checkout.session.completed**: update order, grant download (token), insert **PhysicalFulfillment** row, log to **FulfillmentTransactionLog**, send confirmation email with download link + Certificate link. On **payment failed/expired**: release reservation, send “payment failed” email, log. |
| Physical fulfillment model | `backend/models/PhysicalFulfillment.js` | One row per paid order for disc burn queue (orderId, itemId, customerEmail, status, etc.) |
| Fulfillment audit log | `backend/models/FulfillmentTransactionLog.js` | Immutable log: eventId, orderId, action, payload, success, errorMessage |
| Order fields | `backend/models/Order.js` | Added: `downloadGrantedAt`, `downloadToken`, `certificateId`, `reservationId` |
| Artifact download URL | `backend/models/Artifact.js` | Added `downloadUrl` for digital fulfillment |
| Email: fulfillment + failure | `backend/service/emailService.js` | `sendFulfillmentConfirmationEmail`, `sendPaymentFailedEmail` |
| Download endpoint | `backend/routes/checkout.js` | **GET /api/checkout/download?order_id=...&token=...** — validates token, redirects to artifact `downloadUrl` or returns JSON message |
| Optional Supabase webhook | `supabase/functions/stripe-webhook/index.ts` | Edge Function: verify Stripe, insert into Supabase `physical_fulfillment` and `fulfillment_transaction_log` |
| Deployment doc | `docs/DEPLOYMENT.md` | Vercel auto-deploy, Stripe webhook URL, optional Supabase |
| Ritual of Addition | `docs/RITUAL-OF-ADDITION.md` | How to add new artifacts (data, verification hash, optional Stripe) |
| Supabase fulfillment README | `supabase/README-Fulfillment.md` | SQL for Supabase tables + deploy steps for Stripe Edge Function |

**Checkout metadata:** `backend/routes/checkout.js` now sends `itemName` in Stripe session metadata (for failure email and Supabase).

---

## Part 2: What You (Human) Must Provide

### Required for the app to run

1. **Environment variables (backend / Vercel)**  
   - `MONGODB_URI` — MongoDB connection string  
   - `JWT_SECRET` — Auth  
   - `PUBLIC_SITE_URL` — e.g. `https://pvabazaar.org` (emails and redirects)  
   - `STRIPE_SECRET_KEY` — Stripe API key  
   - `STRIPE_WEBHOOK_SECRET` — From Stripe Dashboard after creating the webhook endpoint  

2. **Stripe webhook**  
   - In Stripe: Developers → Webhooks → Add endpoint  
   - URL: `https://<your-domain>/api/webhooks/stripe`  
   - Events: at least `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed` (add refund events if you use them)  
   - Copy the “Signing secret” into `STRIPE_WEBHOOK_SECRET`  

3. **Email (optional but recommended for fulfillment)**  
   - SMTP: `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_HOST`, `SMTP_PORT`  
   - If not set: fulfillment still runs (download grant, physical row, logs), but no confirmation or payment-failed emails  

### Optional

4. **Verification CI → API**  
   - GitHub repo secrets: `VERIFY_API_URL` (e.g. `https://your-api.com`), optionally `VERIFY_API_SECRET`  
   - Backend env: `VERIFY_API_SECRET` (same value) if you want to protect POST /api/verification  
   - Then the verify workflow will POST each successful verification so the badge has data  

5. **Supabase**  
   - Only if you use Supabase as backend: create project, run SQL from `supabase/README-Verification.md` and `supabase/README-Fulfillment.md`, deploy Edge Functions, point Stripe at the function URL and set its secrets  

6. **Digital downloads**  
   - For each artifact that has a file: set `downloadUrl` on the artifact (e.g. S3/CloudFront signed URL or public URL). If not set, the download link in the email still works but the API will return a “no file URL configured” message instead of redirecting  

---

## Part 3: Commit & Rollout Checklist

Do these in order. The “LLM coder” can do the code/commit steps; you do the secrets and external config.

### Step 1: Install frontend dependency

```bash
cd Frontend
npm install
```

(This pulls in `framer-motion` and ensures build works.)

### Step 2: Commit everything

- Commit all new and modified files (philosophy, verification script + workflow, backend models + routes, frontend pages + components, docs, Supabase functions + READMEs).  
- Push to your main branch (e.g. `main`).  

### Step 3: Vercel

- Ensure the repo is connected to Vercel and that the **production branch** is the one you push to (e.g. `main`).  
- Add all **required** env vars (see Part 2).  
- Trigger a deploy (push again or use “Redeploy” in Vercel).  
- After deploy, note the **live URL** (e.g. `https://pvabazaar.org` or `*.vercel.app`).  

### Step 4: Stripe webhook

- In Stripe Dashboard, add webhook endpoint:  
  - URL: `https://<your-live-domain>/api/webhooks/stripe`  
  - Select events (see above).  
- Set `STRIPE_WEBHOOK_SECRET` in Vercel to the signing secret Stripe shows.  
- Redeploy if needed so the serverless function gets the new secret.  

### Step 5: Smoke checks (human or LLM)

- Open the site: nav shows Archive, Verification, Manifesto, Cart, Marketplace.  
- Open a marketplace item: VerificationBadge appears (or “…” then nothing if no verification yet).  
- Open `/#/artifact/<some-slug>`: Alchemical artifact page loads (or 404 if slug doesn’t exist).  
- Place a test order and pay:  
  - Order is marked paid.  
  - A row appears in **PhysicalFulfillment** (or Supabase `physical_fulfillment` if you use that).  
  - **FulfillmentTransactionLog** (or Supabase log) has entries.  
  - If email is configured: customer gets confirmation with download link and certificate link (if verification exists).  
- If you have an artifact with `downloadUrl`: open the download link from the email and confirm redirect.  

### Step 6: Verification (optional)

- Add a real hash to `scripts/trusted_hashes.json` and (if you use it) put a test file under `artifacts/`, then push.  
- Confirm the verify workflow runs and, if `VERIFY_API_URL` is set, that POST /api/verification is called and the badge shows “AI-Verified” for that item.  

---

## Part 4: File List (Quick Reference for the Coder)

**New files**

- `Frontend/src/lib/philosophy.js`  
- `Frontend/src/pages/VerificationPage.jsx`  
- `Frontend/src/pages/ManifestoPage.jsx`  
- `Frontend/src/pages/CartPage.jsx`  
- `Frontend/src/styles/alchemical-theme.css`  
- `scripts/verify_artifact.py`  
- `scripts/trusted_hashes.json`  
- `scripts/README-verification.md`  
- `.github/workflows/verify.yml`  
- `backend/models/VerificationResult.js`  
- `backend/models/PhysicalFulfillment.js`  
- `backend/models/FulfillmentTransactionLog.js`  
- `backend/routes/verification.js`  
- `Frontend/src/components/VerificationBadge.jsx`  
- `Frontend/src/components/VerificationBadge.css`  
- `Frontend/src/components/VerificationHashBlock.jsx`  
- `Frontend/src/components/VerificationHashBlock.css`  
- `Frontend/src/pages/ArtifactDetailPage.jsx`  
- `Frontend/src/pages/ArtifactDetailPage.css`  
- `supabase/functions/store-verification/index.ts`  
- `supabase/functions/stripe-webhook/index.ts`  
- `supabase/README-Verification.md`  
- `supabase/README-Fulfillment.md`  
- `docs/VERIFICATION-SYSTEM.md`  
- `docs/DEPLOYMENT.md`  
- `docs/RITUAL-OF-ADDITION.md`  
- `ARCHITECTURAL-MANDATE-AND-CURRENT-BUILD.md` (mandate ↔ current build map)
- `HANDOFF-AND-ROLLOUT.md` (this file)  

**Modified files**

- `Frontend/src/App.jsx` (Layout wrap, routes: verification, manifesto, cart, artifact)  
- `Frontend/src/components/Layout.jsx` (nav items, tagline from philosophy)  
- `Frontend/src/lib/api.js` (fetchVerificationByArtifact)  
- `Frontend/src/pages/MarketplaceItemPage.jsx` (VerificationBadge, “Preserve history” link)  
- `Frontend/src/pages/MarketplaceItemPage.css` (item-meta flex, badge)  
- `Frontend/src/pages/ListItemPage.jsx` (removed duplicate Layout)  
- `Frontend/src/pages/OracleAssessmentPage.jsx` (removed duplicate Layout)  
- `Frontend/package.json` (framer-motion)  
- `backend/api/index.js` (mount /api/verification)  
- `backend/models/Order.js` (downloadGrantedAt, downloadToken, certificateId, reservationId)  
- `backend/models/Artifact.js` (downloadUrl)  
- `backend/lib/itemNormalize.js` (stockQty, lore in toPublicItem)  
- `backend/routes/verification.js` (computed_hash in GET artifact response; optional X-Verify-Secret)  
- `backend/routes/webhooksStripe.js` (fulfillment: download grant, PhysicalFulfillment, FulfillmentTransactionLog, emails)  
- `backend/routes/checkout.js` (metadata itemName; GET /download)  
- `backend/service/emailService.js` (sendFulfillmentConfirmationEmail, sendPaymentFailedEmail)  
- `README.md` (links to Ritual of Addition and Deployment)  

---

## Part 5: How to Work With the LLM Coder

- **You (human):** Provide env vars, Stripe webhook URL and secret, SMTP if you want email, and any business answers (e.g. “use this Stripe account,” “domain is X”).  
- **LLM coder:** Uses this doc to commit, configure Vercel env, run `npm install` and builds, and follow the checklist. They can also add artifacts (Ritual of Addition), add hashes to `trusted_hashes.json`, and debug logs (FulfillmentTransactionLog, Stripe events).  
- **Single source of truth:** This file + `docs/DEPLOYMENT.md` + `docs/RITUAL-OF-ADDITION.md` + `docs/VERIFICATION-SYSTEM.md`. Point the coder here so they don’t guess.  

---

## Part 6: One-Line Summary

**What you have:** Mission/philosophy constants and nav (Archive, Verification, Manifesto, Cart); Python hash verification + GitHub Action + backend verification API + VerificationBadge and hash block; Alchemical artifact page at `/#/artifact/:slug` with scarcity, lore, “Initiate Acquisition”; Stripe webhook that grants download, enqueues physical fulfillment, logs everything, and sends confirmation (and payment-failed) emails; download endpoint; optional Supabase Edge Functions; and docs for deployment and adding artifacts.  

**What you need:** MongoDB, Stripe (with webhook URL and secret), optional SMTP, optional VERIFY_API_URL/VERIFY_API_SECRET and artifact hashes. Then: install deps, commit, push, set env and webhook, and run the smoke checks above.
