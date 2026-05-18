# OpenClaw Continuity Setup

Last updated: 2026-05-18
Scope: Keep OpenClaw state recoverable and operational across device loss.

## Required environment variables

Set these in production and local secure env storage:

- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_WEBHOOK_URL`
- `OPENCLAW_API_KEY`
- `OPENCLAW_BRIDGE_SECRET`
- `OPENCLAW_EVENT_LOG_PATH`
- `OPENCLAW_HEARTBEAT_INTERVAL_SEC`
- `OPENCLAW_ALERT_CHANNEL`

## Setup checklist

- [ ] Configure all required OpenClaw env vars.
- [ ] Confirm `/api/openclaw/status` returns healthy.
- [ ] Confirm `/api/openclaw/dispatch` accepts authenticated requests.
- [ ] Confirm watchdog endpoint/status flow works.
- [ ] Confirm recent events endpoint is populated.
- [ ] Configure alerting destination (email/Telegram).
- [ ] Configure daily snapshot backup of OpenClaw state.
- [ ] Test restoring OpenClaw state from snapshot.

## Snapshot policy

- Frequency: daily minimum
- Retention: 30 daily + 12 monthly snapshots
- Storage: encrypted offsite storage
- Verification: weekly restore test

## Failure handling

If OpenClaw status fails:

1. Check env vars and secret validity.
2. Check gateway/webhook reachability.
3. Check bridge service logs.
4. Rotate compromised keys if suspected.
5. Restore from latest known-good snapshot.

## Operations log

Format: `YYYY-MM-DD | Action | Result | Follow-up`

- 2026-05-18 | OpenClaw continuity document created | Complete | Populate env vars and verify endpoints
