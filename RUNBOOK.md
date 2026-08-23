# Runbook

Release and continuity operations for PVA Bazaar.
Truth sources: CANONICAL_MAP.md (map), STATUS.md (state), Frontend/public/live-map.json (routing).

## Deploy paths

| Surface | Workflow | Trigger |
|---|---|---|
| Frontend (GitHub Pages + Vercel preview) | `.github/workflows/deploy-frontend.yml` | push to main touching `Frontend/**`; supports manual rollback input |
| Backend (Vercel) | `.github/workflows/deploy-backend-live.yml` | push to main touching `backend/**` |

Manual dispatch with rollback ref is available on deploy-frontend (`ref_to_deploy`).

## Pre-merge checks (required status checks)

Pushing to main requires green: frontend tests workflow, backend tests workflow, secret scan.
Locally approximate with:

```bash
npm run lint:check
npm run typecheck
npm --prefix Frontend run build
npm run test:ci        # vitest suite
npm run e2e            # playwright (optional, slower)
```

## Post-deploy verification

```bash
npm run verify:prod:wait   # wait for prod deploy
npm run verify:live        # readiness against live URLs
npm run test:smoke         # OpenClaw bridge smoke
```

Manual: check https://pva-backend-api.vercel.app/api/health (mode mongo, readyState 1, real SHA)
and the public bookshelf endpoint returning Mongo-backed records only (see STATUS.md).

## Rollback

1. Frontend: re-run `deploy-frontend.yml` via workflow_dispatch with `ref_to_deploy` = last good SHA.
2. Backend: redeploy previous production deployment from Vercel dashboard, or revert the offending
   commit on main and let `deploy-backend-live.yml` rebuild.

## Continuity rules

- Never introduce new entry points without updating `Frontend/public/live-map.json`.
- MongoDB is the only record store; Cloudinary stores media only.
- If the site or API drifts from live-map.json, fix the drift before shipping features.
