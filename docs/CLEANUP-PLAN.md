# Repo Declutter Plan

> **Execution status (2026-08-23):** Phases 1, 2 (partial), 3, 4 (documented), 5 and 6 are done on
> branch `chore/repo-declutter`. Deferred items are marked inline. `main` is a protected branch -
> merge this branch via PR so the three required status checks run.

Goal: make the repo feel like one product instead of ten, without breaking the live site.
Rule for every phase: separate branch + separate commit/PR per phase, so anything can be reverted alone.

Live surfaces that must keep working (the "do not break" list):

- GitHub Pages site from `Frontend/dist` (`.github/workflows/deploy-frontend.yml`, `deploy-to-github-pages.yml`)
- Backend API on Vercel (`vercel-backend.json` -> `backend/server.js`; repo-root `api/[...path].js` catchall from `vercel.json`)
- Contracts (`contracts/`, wired to `npm run contracts:*`)
- QA harness (`qa/`, wired to `npm run qa:*`)

---

## Phase 1 - Zero-risk deletions (no behavior change)

These are dead, duplicated, or artifacts. Git history keeps them forever anyway.

| Item | Why safe |
|---|---|
| `index.html`, `magnum-opus.html` (repo root) | Stale leftovers from the old "Pages from repo root" era; Pages now publishes `Frontend/dist` |
| `404.html`, `status.html`, `sitemap.xml`, `robots.txt`, `llms.txt`, `readable-site.json` (root) | Canonical copies live in `Frontend/public/` and ship in the build |
| `CNAME` (root) | VERIFY FIRST: confirm custom domain is set in repo Settings > Pages, or add CNAME to `Frontend/public/`, then delete |
| `server/` | Entire second Express backend; zero references anywhere (checked backend, Frontend, vercel configs, docker-compose) |
| `demo/` | `gateway.ts` + package.json, zero references |
| `services/api` | 3-file TS stub, never imported; remove from workspaces too |
| `agent-core/` | Python script + requirements, nothing wires it up; delete or move to `_archive/` if sentimental |
| `tools/screenshot.js` | Single file; move into `scripts/` if still useful, else delete |
| `bin/gitleaks.exe` | Committed Windows binary; `scripts/secret-scan.sh` can use PATH-installed gitleaks / the secret-scan workflow instead |
| `gitleaks-report.json` | Scan output artifact, should never have been committed |
| `pnpm-workspace.yaml` | Repo operates on npm workspaces + lockfile; pnpm workspace file just confuses tooling |
| `commitlint.config.js` OR `.cjs` | Keep one |
| `prettier.config.js` OR `.cjs` | Keep one |
| `.eslintrc.js` OR `eslint.config.mjs` | Two competing ESLint configs; keep flat config (`eslint.config.mjs`) if lint passes without the old one |
| `.github/workflows/nextjs-scaffold.yml` | A workflow that scaffolds folders inside `pvabazaar-livestream/` at runtime - experimental relic |

Verify after: `npm run build:frontend`, backend boots locally, `npm run lint:check`.

## Phase 2 - Fix the quietly-broken CI

> DONE (partial): phantom suites removed from quality-gates matrix; load tests now boot the real
> backend package; nextjs-scaffold workflow deleted in Phase 1.
> DEFERRED: merging backend/deploy pipeline duplicates and pausing OpenClaw crons - these crons do
> real production monitoring (uptime watchdog aligns with live-map.json intervals), so disabling
> them needs an owner decision in GitHub Actions settings, not a drive-by commit.

- `quality-gates.yml`: test matrix lists `web-org`, which doesn't exist. Remove it from the matrix (or restore the app - you almost certainly want removal).
- Audit the other 30 workflows. Suggested triage:
  - Keep: `deploy-frontend`, `deploy-backend-live`, `secret-scan`, `security-audit`, `quality-gates`, `live-readiness`
  - Merge/dedupe: `backend.yml` + `deploy-backend.yml` + `deploy-backend-live.yml` (three backends pipelines); `main.yml` + `deploy.yml` + `frontend.yml` (vague names, likely overlap); `deploy-to-github-pages.yml` + `deploy-frontend.yml` both publish Pages
  - Disable (set to `workflow_dispatch` only, delete later): the 7 `openclaw-*` cron jobs running every 5-30 min unless they're doing real production work you'd miss
  - Decide: `bounty-money-run*.yml`, `telegram-send-now.yml`, `ipfs-publish.yml`, `auto-merge.yml`

## Phase 3 - Content & legacy consolidation

Root-level single-page microsites from the old era - verify each is not linked from the live nav, then move under `_archive/sites/<name>/`:
- `novel/`, `biography/`, `get-started/`, `recovery/` (each just an `index.html`)
- Note: real equivalents already exist in `Frontend/public/` (`get-started.html`, `recovery.html`, `writings.html`)

Content folders - unify under `content/`:
- `archive/*.md` (Archive Entries - actual Civilization Library content) -> `content/library/entries/` (CHECK: confirm the library sync feature reads from where you move it to; FORK.md mentions `LIBRARY_GIT_BRANCH=content-library`)
- `import/` (same entries plus staging README) -> fold into `content/` or delete once moved
- `writings/` -> `content/writings/`

Decide and likely retire:
- `supabase/` - two edge functions (stripe-webhook, store-verification) that duplicate backend routes (`webhooksStripe.js`, `verification.js`). If Supabase isn't deployed, move to `_archive/supabase/`.
- `pvabazaar-livestream/` - 45-file Next app; if not deployed anywhere, `_archive/` it.

## Phase 4 - The frontend endgame (needs your call)

> DONE via the conservative option: all three documented in CANONICAL_MAP.md "App inventory"
> with explicit canonical/secondary/experiment roles. Revisit if pva-bazaar-web or web-com goes
> dormant - then archive under `_archive/apps/`.

Whichever survive: update `CANONICAL_MAP.md` "Where to edit" to match reality.

## Phase 5 - Docs collapse

> DONE: STATUS.md created (merges CURRENT_STATUS + ACTIVE_STATUS + AGENT_HANDOFF);
> RUNBOOK.md created (was referenced by README/CANONICAL_MAP but never existed);
> ROADMAP/MAGNUM_OPUS/PLAN-multi-format-upload/SELF_HOSTING/FORK and the three old status docs
> moved to docs/history/. README, CANONICAL_MAP, ARCHITECTURE and CLAUDE.md rewritten to match
> the actual repo layout.

Target: 4 root docs + `docs/history/`.

- Keep at root: `README.md` (entry point), `CANONICAL_MAP.md` (truth), `ARCHITECTURE.md` (layout), `RUNBOOK.md` (ops)
- Merge `CURRENT_STATUS.md` + `ACTIVE_STATUS.md` + `AGENT_HANDOFF.md` -> one `STATUS.md` (current state only; history goes to CHANGELOG)
- Move to `docs/history/`: `ROADMAP.md`, `MAGNUM_OPUS.md`, `PLAN-multi-format-upload.md`, `SELF_HOSTING.md`, `FORK.md`, `CHANGELOG.md` (or keep CHANGELOG at root), plus any doc in `docs/` older than your last architecture change
- Update `CLAUDE.md` - it describes an outdated layout (says Next app is "Phase One Kenyan crafts", misses CANONICAL_MAP flow)
- Then sweep `docs/` (28 files) with the same rule: current vs history

Result: a newcomer reads README -> CANONICAL_MAP -> done.

## Phase 6 - Script diet

~95 npm scripts today. Keep only what you actually ran in the last month (check shell history); archive the rest into a `Makefile`-style comment block or `docs/history/scripts.md`. Likely survivors:

```
dev / dev:frontend / dev:backend / dev:web
build:frontend / build:web
test / test:ci / e2e
lint / typecheck / format
seed / db:check
contracts:* (compile + one deploy target you actually use)
qa:full / qa:quick
verify:live (one canonical readiness script, not nine variants)
```

Delete candidates: the five `verify:*` near-duplicates, `deploy:railway/render/flyio` (pick whichever, if any, is real), docker targets if unused, `test:phases-6-8`, one-off `data:onet:download`.

## Phase 7 - Optional, bigger surgery

- Backend route split: ~90 route files spanning marketplace, books, forums, courses, governance, agents, social OAuth. Group into mounted sub-routers by domain (`routes/marketplace/*`, `routes/library/*`, `routes/platform/*`) purely for readability - no URL changes.
- Feature kill-list: routes/pages with no traffic and no roadmap (career quiz? commodities? federation?). Deleting features is the only step that shrinks maintenance for real.

---

## Suggested order & effort

| Phase | Effort | Risk |
|---|---|---|
| 1 Deletions | 1-2 h | Near zero |
| 2 CI fixes | 1-2 h | Low (watch first runs) |
| 3 Content moves | 2-3 h | Low-medium (library sync paths!) |
| 4 Frontend decision | your call | Medium |
| 5 Docs | 2 h | Zero |
| 6 Scripts | 1 h | Low |
| 7 Surgery | ongoing | Medium |

After each phase: `npm run build:frontend`, boot backend, `npm run test:ci`, push, watch the Pages + Vercel workflows go green before starting the next phase.

Success metric: someone new can answer "what is this and where do I edit?" in under 5 minutes using only the README.
