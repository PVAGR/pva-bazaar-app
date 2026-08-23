# PVA Bazaar

PVA Bazaar is a personal website and business suite.
It has one public front door and one canonical live map.

- Frontend: [GitHub Pages](https://pvabazaar.org)
- Backend: [Vercel](https://vercel.com)
- Canonical live routing map: [Frontend/public/live-map.json](Frontend/public/live-map.json)

## Repo map

| Path | What it is |
|---|---|
| `Frontend/` | Public site (vanilla JS + Vite) - deploys to GitHub Pages |
| `backend/` | Express API on Vercel (MongoDB Atlas, Cloudinary media) |
| `api/[...path].js` | Vercel serverless catchall entry |
| `apps/pva-bazaar-web` | Next.js sanctuary layer (secondary surface) |
| `apps/web-com` | Small Vite/React experiment |
| `packages/`, `contracts/`, `qa/`, `scripts/` | Shared packages, smart contracts, QA harness, tooling |
| `content/` | Library content (writings, library data) |
| `_archive/` | Legacy sites and drafts kept for reference |

## Start here

1. [CANONICAL_MAP.md](CANONICAL_MAP.md) for the single source of truth.
2. [RUNBOOK.md](RUNBOOK.md) for release and continuity operations.
3. [ARCHITECTURE.md](ARCHITECTURE.md) for the system layout.
4. [STATUS.md](STATUS.md) for the latest state.
5. [docs/CLEANUP-PLAN.md](docs/CLEANUP-PLAN.md) for how the repo was decluttered.

Historical docs live in [docs/history/](docs/history/); venture and ops guides live in [docs/](docs/README.md).

## Working rule

If a page, workflow, or doc conflicts with the canonical map, follow the canonical map first and treat everything else as support or reference.
