# Status

One page for current state: what is live, what the rules are, how to verify, what is open.
Supersedes CURRENT_STATUS.md, ACTIVE_STATUS.md and AGENT_HANDOFF.md (kept in docs/history/).

Updated: 2026-08-23

## What is live

| Surface | URL | Source |
|---|---|---|
| Public site | https://pvabazaar.org | GitHub Pages, built from `Frontend/` (`deploy-frontend.yml`) |
| Backend API | https://pva-backend-api.vercel.app | `backend/server.js` + root `api/[...path].js` on Vercel |
| Database | MongoDB Atlas | source of truth for records |
| Media | Cloudinary | covers/media only, never records |

Other apps in-repo (not part of the canonical path above):

- `apps/pva-bazaar-web` - Next.js "sanctuary" layer (archive, manifesto, cart). Has its own deploy workflows; treat as secondary surface.
- `apps/web-com` - small Vite/React experiment; only consumer of `packages/ui` + `packages/oracle-engine`.

## Architecture rules (do not break)

1. MongoDB is the sole source of truth for book/record data.
2. Cloudinary is media storage only - never a record database.
3. GitHub, Vercel filesystem, and browser localStorage are NOT persistence layers.
4. Data flow: Frontend (Pages) -> API (Vercel) -> MongoDB (Atlas) -> Cloudinary (media).
5. The live routing map `Frontend/public/live-map.json` wins over any doc.

## Verification policy

No task counts as done until verified from production:

1. `GET /api/health` - mode `mongo`, readyState 1, real deployed SHA, branch main.
2. `GET /api/book-publishing/public` - Mongo-backed books only; no webHtml/manuscriptMarkdown blobs.
3. Cache-busted repeat of (2) must return identical totals and IDs.

Local equivalents: `npm run verify:live` (readiness), `npm run test:smoke` (OpenClaw bridge).

## Recent changes (2026-07 window)

- Serverless catchall widened: `/api/archive`, `/api/search/text`, `/api/deals`, `/api/bounties`, `/api/users/profile`, `/api/streams`, `/api/oauth/*`, `/api/openclaw/*` answer without forcing DB boot.
- Book publishing hardened: account-only publish, Cloudinary cover uploads from browser, 4 MB payload guard, Cloudinary raw fallback when Mongo Atlas hits quota.
- Listing stewardship: claim codes, QR manage links, creator-only deletion, consignment split defaults.
- Public shell rebuilt: clean primary nav, static no-JS fallbacks, trust/legal/support pages, institutional hub.

## Open items

- Final cross-device spot check of public bookshelf after latest deploy propagates.
- Static fallback pages intentionally mirror SPA content; consolidate to one canonical route per page later.
- New listings should populate knowledge-profile fields (history, classification, uses, safety).
- Pipeline consolidation among backend/deploy workflows needs repo-admin decisions in GitHub settings.

## Repo declutter (2026-08-23)

Executed per `docs/CLEANUP-PLAN.md` on branch `chore/repo-declutter`: dead backends/configs removed,
content unified under `content/`, legacy surfaces archived under `_archive/`, docs collapsed to
README + CANONICAL_MAP + ARCHITECTURE + RUNBOOK + this file (+ docs/history/).
