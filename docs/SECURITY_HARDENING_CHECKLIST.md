# Security Hardening Checklist

Last updated: 2026-05-18
Priority: Critical

## Immediate actions

- [ ] Revoke all previously exposed tokens.
- [ ] Rotate GitHub PATs and use least privilege scopes.
- [ ] Rotate JWT secrets and API keys.
- [ ] Rotate OpenClaw bridge secret and webhook secrets.
- [ ] Remove hardcoded credentials from docs and scripts.
- [ ] Remove test auth tokens from deploy guides.

## Repository hygiene

- [ ] Verify `.env` files are ignored and not committed.
- [ ] Run gitleaks scan and review output.
- [ ] Enable branch protection on `main`.
- [ ] Require PR review for production changes.
- [ ] Require CI checks before merge.

## Production controls

- [ ] Enforce HTTPS only.
- [ ] Enable rate limiting on auth and critical APIs.
- [ ] Add strict CORS allow-list.
- [ ] Add security headers (CSP, HSTS, X-Frame-Options).
- [ ] Enforce strong admin password policy + MFA.

## Audit trail

Format: `YYYY-MM-DD | Control | Status | Evidence`

- 2026-05-18 | Checklist created | In Progress | docs/SECURITY_HARDENING_CHECKLIST.md
