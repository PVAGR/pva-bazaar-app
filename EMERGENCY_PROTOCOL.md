# PVA Bazaar Emergency Protocol

## Severity

- **Critical:** frontend or backend unavailable, deploy parity fails, or continuity monitor fails repeatedly
- **High:** stale OpenClaw queue, degraded decentralized readiness, or major crawler surface loss
- **Medium:** latency target breach, preview drift, or isolated route regression

## Immediate Response

1. Freeze new production deploys.
2. Open the latest status page and continuity monitor run.
3. Verify frontend, backend, and fallback backend reachability.
4. If the live release is bad, redeploy the last known-good ref.

## Recovery Sequence

1. Check `https://pvabazaar.org/status.html`
2. Check `https://api.pvabazaar.org/api/health`
3. Check `https://api.pvabazaar.org/api/version`
4. Check `https://api.pvabazaar.org/api/openclaw/status`
5. Confirm runtime `api-base.json` still points to the canonical API base
6. If primary backend is unavailable, validate fallback backend and route restoration

## Rollback Rules

- Use workflow dispatch `ref_to_deploy` for rollback-by-ref
- Always include a `rollback_reason`
- Do not resume forward deploys until strict readiness and parity pass

## Post-Restore Verification

- `verify:live:strict`
- `verify:routes:live`
- `verify:prod:wait`
- Confirm `llms.txt`, `readable-site.json`, and `sitemap.xml`
- Confirm cache headers still exist on home and main asset

## Follow-up

- Log the incident cause and duration
- Rotate credentials if compromise is suspected
- Update the runbook or live map if a source-of-truth mismatch caused the outage
