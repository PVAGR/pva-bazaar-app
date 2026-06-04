# PVA Bazaar Continuity Runbook

## Canonical Live Map

- Source of truth: `/tmp/workspace/PVAGR/pva-bazaar-app/Frontend/public/live-map.json`
- Frontend: `https://pvabazaar.org`
- Backend: `https://api.pvabazaar.org`
- API base: `https://api.pvabazaar.org/api`
- Status page: `https://pvabazaar.org/status.html`
- Fallback backend: `https://pva-bazaar-app-1.onrender.com`

## Release Gate

Every production deploy must pass:

1. Baseline `verify:live`
2. Production build
3. Strict post-deploy `verify:live:strict`
4. Live route sweep `verify:routes:live`
5. Backend parity wait `verify:prod:wait`

## Reliability Targets

- Frontend availability: 99.95%
- Backend availability: 99.9%
- `/api/ping` target: p95 under 500ms
- `/api/health` target: p95 under 1500ms
- Frontend home target: under 2500ms from CI checks
- Main asset propagation: within 10 minutes
- Live SHA parity: within 10 minutes
- Rollback start: within 15 minutes
- Service restore after rollback: within 30 minutes

## Monitoring Cadence

- Every 10 minutes: continuity monitor and OpenClaw checks
- Daily: review status page, alerts, and latest deploy verification
- Weekly: run live route sweep and accessibility smoke checks
- Monthly: rollback drill and recovery rehearsal
- Quarterly: dependency, secret, DNS/TLS, and runbook audit

## Rollback Procedure

1. Identify the last known-good ref.
2. Run the production deployment workflow with `ref_to_deploy`.
3. Record the reason in `rollback_reason`.
4. Wait for strict readiness and parity verification to pass.
5. Confirm `status.html`, `llms.txt`, `readable-site.json`, and `sitemap.xml` are reachable.

## Global Reach Checklist

- Frontend home reachable over HTTPS
- Status page reachable over HTTPS
- Backend health, ping, version, OpenClaw, and decentralized endpoints reachable
- Runtime `api-base.json` matches the live map
- Cache headers present on home page and main asset
- Crawl resources remain reachable
