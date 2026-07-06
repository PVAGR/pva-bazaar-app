# PVA Bazaar Tech Stack & Tools Blueprint (Execution-Ready)

Tags: #pvabazaar #techstack #marketplace #influence-economy

This document adapts your 2026 blueprint to the current repository and defines an implementation path that can ship quickly.

## 1) Current repo reality (important)

- This repo already has:
  - Legacy frontend at `Frontend/` (Vite)
  - API at `backend/` (Express + MongoDB)
  - Sanctuary web app at `apps/pva-bazaar-web/` (Next.js 14 + TypeScript + Tailwind)
- Recommended approach:
  - Keep `Frontend/` and `backend/` stable for current production paths.
  - Build all new marketplace flows in `apps/pva-bazaar-web/` first.
  - Migrate feature-by-feature, not a big-bang rewrite.

## 2) Phase 1 stack (MVP, lean)

### Frontend

- Next.js 14 (App Router) in `apps/pva-bazaar-web/`
- Tailwind CSS (already present)
- TypeScript (already present)
- Add TanStack Query for cache/fetch orchestration in high-churn views (catalog/search/cart)

### Backend

- Keep Express API in `backend/` for MVP speed.
- Add modular service boundaries for:
  - catalog
  - checkout / payouts
  - creator attribution
- Keep REST for now; introduce GraphQL only when API shapes diverge significantly.

### Data layer

- Keep MongoDB for MVP (already integrated).
- Add Redis only if you confirm query/caching pressure.
- Add Meilisearch for catalog search once product count and filters outgrow Mongo text queries.

### Payments

- Stripe Connect is the right target for split payouts.
- Start with one payout path (platform + creator split), then add producer split after reconciliation is tested.

## 3) Marketplace tool choices (practical defaults)

### Influencer / attribution

- GA4 + strict UTM conventions (`utm_source=creator_<handle>`) as first milestone.
- Zapier/Make only for non-core automations.

### Supply chain / brokerage

- Start with Airtable or Notion API for producer metadata and compliance docs.
- Add Zoho Inventory/Odoo after SKU and warehouse complexity justify it.

### Compliance

- Add cookie/privacy manager before scale traffic (Termly or CookieYes).
- Keep DPA + consent evidence for creator/producer data sync flows.

## 4) VS Code tool baseline (now active)

Installed and ready in this workspace:

- ESLint
- Prettier
- GitLens
- Thunder Client
- Docker
- Error Lens
- Path Intellisense
- TODO Highlight
- Tailwind CSS IntelliSense
- Playwright Test

## 5) External machine tooling baseline

Validated on this machine:

- Git installed
- Node.js installed
- npm installed

Recommended next installs (optional):

- Docker Desktop
- DBeaver (PostgreSQL and general DB inspection)
- Python 3 (if/when ML tasks are introduced)

## 6) 60-day execution checklist

### Week 1-2

- Standardize creator attribution links and UTM schema.
- Add admin-side attribution reporting endpoint + UI panel.
- Define product schema fields for origin, source proof, creator attribution.

### Week 3-4

- Implement Stripe Connect onboarding model in backend.
- Add payout simulation mode in staging.
- Add legal consent capture for creators/producers.

### Week 5-6

- Integrate inventory source of truth (Airtable/Notion first).
- Add search facets: country, material, creator, price band.
- Add buyer trust elements: origin stories and sourcing trace metadata.

### Week 7-8

- Production hardening: alerts, retries, audit logs for payout events.
- Performance pass on mobile-first pages and checkout funnel.
- Define migration gates from legacy Vite pages to Next.js routes.

## 7) Cost control notes

- Favor free tiers until attribution + payout conversion is proven.
- Trigger infra upgrades only from measured bottlenecks:
  - p95 latency
  - failed checkout rate
  - search timeout rate
  - payout reconciliation time

## 8) Decision log (recommended)

When choosing tools, always record:

- problem being solved
- expected ROI metric
- monthly cost threshold
- rollback plan

This keeps architecture lean and prevents premature complexity.
