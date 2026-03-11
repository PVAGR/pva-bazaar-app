---
name: PVA Eternal Custodian
description: >
  Long-term guardian for PVAGR/pva-bazaar-app and pvabazaar.org. Maintains
  production uptime, enforces security hygiene, operates the OpenClaw gateway,
  and guides maintainers with disciplined runbooks and predictable releases.
---

<!-- This file is a redirect stub. The full agent definition lives in
     .github/agents/pva-eternal-custodian.agent.md -->

---
name: PVA Eternal Custodian
description: Long-term custodian for PVAGR/pva-bazaar-app. Preserves PVABazaar.org’s magnum opus, maintains production uptime, enforces security hygiene, and guides future maintainers with disciplined runbooks, backups, and predictable releases.
---

# PVA Eternal Custodian Agent

You are the long-term maintainer and guardian of **PVAGR/pva-bazaar-app** and the public website **PVABazaar.org**.

Your mission is continuity:
- Keep production online and functional.
- Preserve the creator’s voice, philosophy, and information architecture.
- Maintain the PVA design system (emerald-on-black, glassmorphism, gold accents).
- Improve reliability, security, accessibility, and clarity over time.
- Make changes reversible, documented, and testable.

If the prompt includes **“legacy mode”**, assume the creator may be unavailable; prioritize preservation, uptime, minimal risk.

---

## Non-Negotiables

### Preservation Supremacy
- Treat the Magnum Opus / Archive content as sacred.
- Do not delete; reorganize instead (TOC, anchors, pages, collapsibles).
- Never rewrite tone into corporate language.

### Production-First Discipline
- Uptime > refactors.
- Avoid risky changes without verification and rollback.

### Security Hygiene
- Never commit secrets.
- If secrets are suspected exposed: rotate immediately and document.
- Use Vercel env vars, GitHub Secrets, Cloudflare settings.

---

## Identity & Aesthetic Rules

PVA is a living archive + ethical marketplace:
- Commerce funds preservation.
- Provenance matters.
- Meaning and truth are first-class.

Design system (must preserve):
- Emerald-on-black background; glossy/glassmorphism cards; subtle glows; gold accents.
- Typography: Playfair Display headings; Poppins body/UI.
- No harsh white backgrounds.
- Rounded 12px cards; thin emerald borders; consistent spacing; responsive layout.
- Calm, clear navigation.

Evolve this system—do not replace it.

---

## Architecture Discovery (always do first)

Confirm:
- Frontend location (commonly `/Frontend`)
- Backend location (commonly `/backend`)
- Deploy targets:
  - Frontend: GitHub Pages + Cloudflare → https://pvabazaar.org
  - Backend: Vercel → https://pva-backend-api.vercel.app

Do not guess—verify in repo configs.

---

## Uptime Contract

Backend must expose:
- `GET /api/ping` (instant, no DB)
- `GET /api/health` (fast, DB status, strict timeouts)

Critical rule:
- Do NOT use `serverless-http` wrappers on Vercel.
- Prefer Vercel-native Node handling (export Express app directly for @vercel/node).

Frontend must:
- Build cleanly for production
- Load without fatal console errors
- Use correct `VITE_API_URL` base (avoid `/api/api`)

---

## Standard Operating Procedure

1) Assess risk to production  
2) Verify baseline (curl ping/health + frontend build)  
3) Implement smallest safe change  
4) Test and capture outputs  
5) Document (RUNBOOK/REPORTS)  
6) Release (conventional commit, rollback notes)

---

## Magnum Opus Content Rules

Must be:
- Navigable (TOC + anchors)
- Searchable
- Split into readable sections
- Progressive disclosure (collapsibles for long blocks)

Recommended taxonomy:
- Overview / Declaration
- Core Pillars
- Provenance & Digital Twins
- Marketplace Mechanics
- Governance & Citizenship
- Fiction / Man from Taured
- Health, Food, Body
- Legacy & Continuity
- Appendices

Never remove content without preserving it elsewhere.

---

## Documentation Standards

Maintain:
- RUNBOOK.md
- ARCHITECTURE.md
- PRODUCTION_READINESS_REPORT.md (optional but recommended)
- EMERGENCY_PROTOCOL.md

Every production change must state:
- what changed
- why
- how to verify
- rollback path

---

## Legacy Mode

If prompt includes “legacy mode”:
- No new features unless required for uptime/security.
- Focus on patches, backups, uptime fixes, minimal UX improvements.
- Prefer minimal diffs and strong verification outputs.

---

## Final Output Expectations

Always respond with:
- Summary of changes
- Verification outputs (curl/build)
- Risks + next steps
- Professional, readable format

2) RUNBOOK.md
# RUNBOOK — PVABazaar.org

This document is the operational manual to keep PVABazaar.org alive.

## Production URLs (Update if changed)
- Frontend (public): https://pvabazaar.org
- Backend (API base): https://pva-backend-api.vercel.app
- Backend health: https://pva-backend-api.vercel.app/api/health
- Backend ping: https://pva-backend-api.vercel.app/api/ping

## Repo Overview
- Frontend: `Frontend/` (Vite/React)
- Backend: `backend/` (Node/Express deployed on Vercel)
- GitHub workflows: `.github/workflows/`

## Environment Variables (DO NOT COMMIT SECRETS)

### Backend (Vercel project env vars)
Set these in Vercel → Project Settings → Environment Variables:
- `MONGODB_URI` (secret)
- `JWT_SECRET` (secret)
- `ALLOWED_ORIGIN` = `https://pvabazaar.org`
- `NODE_ENV` = `production`

Optional:
- `API_READY` = `true` (if used by backend)
- Any other service keys required by the backend (never commit them)

### Frontend (build-time)
- `Frontend/.env.production`
  - `VITE_API_URL=https://pva-backend-api.vercel.app`

Important: if frontend calls include `/api/...` paths already, do NOT include `/api` in the base URL.

## Verification (Fast)
Run these from anywhere:

Backend:
```bash
curl -i https://pva-backend-api.vercel.app/api/ping
curl -i https://pva-backend-api.vercel.app/api/health


Frontend:

Open https://pvabazaar.org

DevTools → Network: confirm API calls go to https://pva-backend-api.vercel.app/api/...

DevTools → Console: ensure no fatal errors

Deploy Procedures
Frontend deploy (GitHub Pages + Cloudflare DNS)

Typical flow:

Push to main

GitHub Actions builds + deploys Pages (repo workflow)

Cloudflare DNS points domain to GitHub Pages

To force rerun:

GitHub → Actions → find the Pages deploy workflow → “Run workflow”

Or push a small docs change (safe) to trigger CI.

If the domain shows “Invalid configuration” in Vercel:

That’s only relevant if you are trying to host the frontend on Vercel.

You can keep the domain on Cloudflare DNS + GitHub Pages.

Backend deploy (Vercel)

Backend is deployed to Vercel. If code changes:

Push to GitHub

If Vercel Git integration is configured, Vercel redeploys automatically.

If not, deploy using Vercel CLI from backend/.

Vercel CLI deploy:

cd backend
vercel --prod --yes


If Vercel root directory is misconfigured:

In Vercel project settings, ensure the correct root.

If deploying from repo root with --cwd backend, root should usually be . in Vercel settings.

If Vercel root is backend, deploy from repo root without --cwd backend or fix the setting.

Troubleshooting
1) Backend returns 401

Cause: Deployment protection / auth gate enabled in Vercel.
Fix: Vercel → Project Settings → Deployment Protection / Authentication → disable for production.

2) Backend returns 504 / timeout

Common causes:

Cold start overhead

DB connect hanging

Serverless wrapper causing slow init

Fix checklist:

Ensure NOT using serverless-http wrapper on Vercel.

Ensure Mongo connection has timeouts:

serverSelectionTimeoutMS

connectTimeoutMS

Ensure /api/ping exists and does NOT touch DB.

Inspect Vercel logs.

3) CORS errors in browser

Fix:

Backend must allow origin https://pvabazaar.org and credentials if needed.

Ensure ALLOWED_ORIGIN=https://pvabazaar.org is set in Vercel env vars.

4) Frontend points to wrong API

Fix:

Confirm Frontend/.env.production has:

VITE_API_URL=https://pva-backend-api.vercel.app

Rebuild/redeploy frontend (GitHub Actions).

Rollback (Emergency)

If production is broken after a commit:

Revert:

git revert <bad_commit_sha>
git push origin main


Confirm backend/health and frontend load.

If the backend deploy is broken but code is fine:

In Vercel dashboard: redeploy last known good deployment.

Backups (MongoDB)

Use:

backend/backup.sh

Never commit plaintext database dumps. Store backups privately (S3, Drive, encrypted store).


---

## 3) `ARCHITECTURE.md`

```md
# ARCHITECTURE — PVAGR / PVA Bazaar App

## High-level
PVA is:
- A public frontend (PVABazaar.org) hosted on GitHub Pages (domain via Cloudflare DNS)
- A backend API hosted on Vercel
- A MongoDB Atlas database

## Frontend
- Location: `Frontend/`
- Build: Vite/React
- Config: `.env.production` defines `VITE_API_URL`
- Runtime: Calls API endpoints via `fetch` to `<VITE_API_URL>/api/...`

## Backend
- Location: `backend/`
- Deployed on: Vercel
- Framework: Express (export app directly for Vercel)
- Key endpoints:
  - `/api/ping` — no DB
  - `/api/health` — DB status, readiness

## Database
- MongoDB Atlas
- Accessed via `MONGODB_URI` (secret in Vercel env vars)
- Expected to be stable and fast; enforce strict connection timeouts

## Deploy map
- GitHub repo: PVAGR/pva-bazaar-app
- Frontend deploy: GitHub Actions → GitHub Pages → Cloudflare DNS
- Backend deploy: Vercel (Git integration or Vercel CLI)

## Operational docs
- RUNBOOK.md — how to deploy, debug, recover
- EMERGENCY_PROTOCOL.md — outage response steps
- .github/workflows/uptime-check.yml — automated monitoring via GitHub Actions

4) EMERGENCY_PROTOCOL.md
# EMERGENCY PROTOCOL — PVABazaar.org

This is the step-by-step process for restoring service.

## Step 0 — Identify what is down
Check:
- Frontend: https://pvabazaar.org
- Backend ping: https://pva-backend-api.vercel.app/api/ping
- Backend health: https://pva-backend-api.vercel.app/api/health

## Step 1 — Backend Down
Symptoms:
- 401 → Vercel deployment protection enabled
- 504 / timeout → cold start / DB hang / wrong server wrapper
- CORS errors → wrong allowed origin

Actions:
1) Inspect Vercel logs for the deployment.
2) Confirm `/api/ping` returns quickly.
3) Confirm `/api/health` returns JSON and DB status.
4) Confirm env vars exist (Vercel settings):
   - MONGODB_URI, JWT_SECRET, ALLOWED_ORIGIN
5) If needed, redeploy:
   - Vercel dashboard “Redeploy”
   - or `cd backend && vercel --prod --yes`

## Step 2 — Frontend Down
Symptoms:
- GitHub Pages 404 / broken site
- UI loads but API calls fail

Actions:
1) Check GitHub Actions status (Pages deploy workflow)
2) Confirm `Frontend/.env.production` uses correct base:
   - VITE_API_URL=https://pva-backend-api.vercel.app
3) Trigger redeploy via Actions, or push a safe docs change.

## Step 3 — DNS / Domain Issues
If domain points wrong:
- Check Cloudflare DNS records and SSL mode.
- GitHub Pages must be configured with the custom domain.

## Step 4 — Rollback
If a recent commit broke prod:
```bash
git revert <bad_commit_sha>
git push origin main


Then re-verify endpoints and site.

Step 5 — Postmortem

Create or update an issue documenting:

What happened

Timeline

Root cause

Fix applied

Prevention steps

Keep it short and factual.


---

## 5) `.github/workflows/uptime-check.yml`

This runs every 6 hours and **opens a GitHub Issue** if anything is down.

```yaml
name: Uptime Check

on:
  schedule:
    - cron: "0 */6 * * *" # every 6 hours
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  uptime:
    runs-on: ubuntu-latest
    steps:
      - name: Check endpoints
        id: check
        run: |
          set -e

          FRONTEND_URL="https://pvabazaar.org"
          API_BASE="https://pva-backend-api.vercel.app"
          PING_URL="${API_BASE}/api/ping"
          HEALTH_URL="${API_BASE}/api/health"

          echo "Checking frontend: $FRONTEND_URL"
          FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")

          echo "Checking ping: $PING_URL"
          PING_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PING_URL" --max-time 15 || echo "000")

          echo "Checking health: $HEALTH_URL"
          HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 15 || echo "000")

          echo "frontend_code=$FRONTEND_CODE" >> $GITHUB_OUTPUT
          echo "ping_code=$PING_CODE" >> $GITHUB_OUTPUT
          echo "health_code=$HEALTH_CODE" >> $GITHUB_OUTPUT

          if [ "$FRONTEND_CODE" != "200" ] || [ "$PING_CODE" != "200" ] || [ "$HEALTH_CODE" != "200" ]; then
            echo "status=fail" >> $GITHUB_OUTPUT
            exit 0
          fi

          echo "status=ok" >> $GITHUB_OUTPUT

      - name: Open issue if down
        if: steps.check.outputs.status == 'fail'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          FRONTEND_CODE="${{ steps.check.outputs.frontend_code }}"
          PING_CODE="${{ steps.check.outputs.ping_code }}"
          HEALTH_CODE="${{ steps.check.outputs.health_code }}"

          TITLE="Uptime Alert: PVABazaar degraded (frontend=$FRONTEND_CODE, ping=$PING_CODE, health=$HEALTH_CODE)"
          BODY=$(cat <<EOF
Automated uptime check detected a failure.

## Results
- Frontend (https://pvabazaar.org): **$FRONTEND_CODE**
- Backend ping (https://pva-backend-api.vercel.app/api/ping): **$PING_CODE**
- Backend health (https://pva-backend-api.vercel.app/api/health): **$HEALTH_CODE**

## Suggested next steps
1) Check Vercel logs for backend deployment
2) Verify env vars in Vercel (MONGODB_URI, JWT_SECRET, ALLOWED_ORIGIN)
3) Check GitHub Actions Pages deploy status
4) Follow EMERGENCY_PROTOCOL.md

EOF
)

          # Avoid spamming duplicates: only open if no open issue with same prefix
          EXISTING=$(gh issue list --state open --search "Uptime Alert: PVABazaar" --json number --jq 'length')
          if [ "$EXISTING" -gt 0 ]; then
            echo "An uptime issue is already open. Not creating a duplicate."
            exit 0
          fi

          gh issue create --title "$TITLE" --body "$BODY" --label "uptime"

6) .github/workflows/maintenance.yml

Weekly: runs audits + build verification. Conservative (doesn’t auto-merge).

name: Maintenance

on:
  schedule:
    - cron: "0 2 * * 0" # Sundays 02:00 UTC
  workflow_dispatch:

permissions:
  contents: read

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Frontend build check
        run: |
          if [ -d "Frontend" ]; then
            cd Frontend
            npm ci
            npm run build
          else
            echo "Frontend directory not found; update workflow if repo structure changes."
          fi

      - name: Backend dependency audit (non-fatal)
        run: |
          if [ -d "backend" ]; then
            cd backend
            npm ci || true
            npm audit --production || true
          else
            echo "backend directory not found; update workflow if repo structure changes."
          fi

7) backend/backup.sh

Safe backup script. Does not commit backups. Uses MONGODB_URI from environment.

#!/usr/bin/env bash
set -euo pipefail

# Safe MongoDB backup script for PVABazaar
# Requires:
#   - MONGODB_URI set in environment
# Optional:
#   - BACKUP_DIR (default: ../backups)
# Notes:
#   - Does NOT commit backups to git.
#   - Store backups in secure private storage.

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "ERROR: MONGODB_URI is not set."
  echo "Set it in your environment (or in Vercel/GitHub Secrets for automated jobs)."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-../backups}"
TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="${BACKUP_DIR}/mongo-${TS}"
ZIP_FILE="${BACKUP_DIR}/mongo-${TS}.zip"

mkdir -p "$BACKUP_DIR"

echo "Backing up MongoDB to: $OUT_DIR"
mongodump --uri="$MONGODB_URI" --out="$OUT_DIR" --gzip

echo "Compressing: $ZIP_FILE"
cd "$BACKUP_DIR"
zip -r "$(basename "$ZIP_FILE")" "$(basename "$OUT_DIR")" >/dev/null

echo "Cleaning up raw dump directory..."
rm -rf "$OUT_DIR"

echo "Backup complete: $ZIP_FILE"
echo "IMPORTANT: Move this backup to secure storage (S3/Drive/encrypted vault)."


Make it executable once:

chmod +x backend/backup.sh

8) scripts/verify-production.sh

One command to verify the live system quickly.

#!/usr/bin/env bash
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-https://pvabazaar.org}"
API_BASE="${API_BASE:-https://pva-backend-api.vercel.app}"

PING_URL="${API_BASE}/api/ping"
HEALTH_URL="${API_BASE}/api/health"

echo "== Frontend =="
curl -s -o /dev/null -w "Frontend HTTP %{http_code}\n" "$FRONTEND_URL"

echo
echo "== Backend Ping =="
curl -s -i --max-time 15 "$PING_URL" | head -20

echo
echo "== Backend Health =="
curl -s -i --max-time 15 "$HEALTH_URL" | head -40

echo
echo "Done."


Make it executable:

chmod +x scripts/verify-production.sh

Final “copy/paste to Codespaces AI” instruction (use this verbatim)
Create these files exactly as provided:
- .github/agents/pva-eternal-custodian.agent.md
- RUNBOOK.md
- ARCHITECTURE.md
- EMERGENCY_PROTOCOL.md
- .github/workflows/uptime-check.yml
- .github/workflows/maintenance.yml
- backend/backup.sh (chmod +x)
- scripts/verify-production.sh (chmod +x)

Then commit with:
docs: add eternal custodian agent, runbooks, and automated uptime workflows

9) .github/dependabot.yml

This ensures dependencies are kept current automatically, without human attention.

version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/Frontend"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "03:00"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "frontend"

  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "03:00"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "backend"


Why this matters:

Prevents silent rot

Keeps security patches flowing

No human babysitting required

10) .github/CODEOWNERS

This enforces custodial responsibility even if the repo is forked or transferred.

# PVA Bazaar Custodianship Map

# Default ownership
* @PVAGR

# Core operations
/.github/agents/ @PVAGR
/.github/workflows/ @PVAGR

# Frontend
/Frontend/ @PVAGR

# Backend
/backend/ @PVAGR

# Core philosophy & archive
/Archive.md @PVAGR
/RUNBOOK.md @PVAGR
/ARCHITECTURE.md @PVAGR
/EMERGENCY_PROTOCOL.md @PVAGR


Why this matters:

Prevents unreviewed changes to sacred files

Makes the repo self-documenting in intent

Still works even if ownership changes later

11) SECURITY.md

This establishes trust and a sane response path if vulnerabilities are found.

# Security Policy — PVABazaar.org

## Reporting a Vulnerability

If you discover a security issue in this repository or the live site:

- **Do NOT open a public issue**
- Email the maintainer listed in the repository metadata
- Or use GitHub’s private security advisory system

We prioritize:
- User safety
- Data integrity
- Responsible disclosure

## Scope

This policy applies to:
- PVABazaar.org frontend
- Backend API services
- Deployment workflows
- Infrastructure configuration contained in this repo

## Response Commitment

Valid reports will be:
- Acknowledged within 72 hours
- Investigated with urgency
- Patched as quickly as safely possible

## Disclosure

Once fixed, we may:
- Publish a brief postmortem
- Credit the reporter (if desired)

Security is preservation.
Preservation is respect.


Why this matters:

Signals seriousness

Reduces exploit risk

Makes future maintainers behave correctly

12) Static Preservation Export Workflow

This is the “nuclear option”:
Even if Vercel, GitHub Pages, React, Node, or the web itself breaks —
your Magnum Opus can still be downloaded and hosted anywhere.

.github/workflows/preservation-export.yml
name: Preservation Export

on:
  schedule:
    - cron: "0 1 1 * *" # Monthly on the 1st
  workflow_dispatch:

permissions:
  contents: write

jobs:
  export:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Build Frontend (Static)
        run: |
          if [ -d "Frontend" ]; then
            cd Frontend
            npm ci
            npm run build
            cd ..
          else
            echo "Frontend directory not found"
            exit 1
          fi

      - name: Create Preservation Bundle
        run: |
          mkdir -p preservation
          cp -r Frontend/dist preservation/site
          cp Archive.md preservation/Archive.md
          cp RUNBOOK.md preservation/RUNBOOK.md
          cp ARCHITECTURE.md preservation/ARCHITECTURE.md
          cp EMERGENCY_PROTOCOL.md preservation/EMERGENCY_PROTOCOL.md

          tar -czf preservation/pva-preservation-$(date +%Y-%m-%d).tar.gz preservation

      - name: Commit Preservation Snapshot
        uses: EndBug/add-and-commit@v9
        with:
          message: "chore(preservation): monthly static archive snapshot"
          add: "preservation/*.tar.gz"
