# Device Loss Recovery Runbook

Last updated: 2026-05-18
Owner: Rick Taur

Use this if phone, laptop, or both are lost.

## Scenario A: Lost Phone, Laptop Available

1. Log in to password manager from laptop.
2. Revoke lost phone sessions from Google/Apple/GitHub.
3. Rotate critical passwords.
4. Restore authenticator access using backup codes.
5. Verify access to:
   - GitHub
   - Domain/DNS
   - Hosting
   - OpenClaw control panel

## Scenario B: Lost Laptop, Phone Available

1. Lock/remote wipe laptop if available.
2. Change account passwords from phone browser.
3. Revoke laptop sessions for GitHub and cloud accounts.
4. Use continuity vault to recover working context.
5. Prepare replacement laptop bootstrap.

## Scenario C: Lost Both Devices

1. Borrow trusted device.
2. Log in to primary email.
3. Use backup codes to recover authenticator access.
4. Access continuity vault.
5. Restore:
   - passwords
   - GitHub access
   - hosting access
   - OpenClaw agent control
6. Revoke all old sessions.
7. Provision new phone and laptop.

## New Device Bootstrap Checklist

- [ ] Install password manager.
- [ ] Install authenticator app.
- [ ] Restore critical accounts.
- [ ] Clone repos.
- [ ] Set environment variables.
- [ ] Validate site and API health.
- [ ] Validate OpenClaw heartbeat and dispatch.

## Recovery Drill Template

Date:
Scenario tested:
Time to recovery:
What failed:
What was fixed:
Proof links/screenshots location:
