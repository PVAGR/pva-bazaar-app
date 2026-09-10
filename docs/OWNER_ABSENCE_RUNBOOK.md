# PVA Bazaar — Owner Absence Runbook

**Purpose:** the site (pvabazaar.org + backend) is designed to keep running
with **zero human intervention**. This runbook answers two questions:

1. What happens on its own while you are away?
2. What is actually backed up, and what would you lose in the worst case?

If you are an AI assistant reading this after the owner has been away: run
`npm run verify:live` (read-only) and report. Do not "fix" anything that is
not on fire.

---

## 1. What runs autonomously

| System | Cadence | What it does |
|---|---|---|
| Deploy Backend Live | on push to `main` | Builds + deploys backend to Vercel, syncs env (incl. `OPENCLAW_BRIDGE_SECRET`), verifies strict readiness |
| Deploy Frontend to GitHub Pages & Vercel | on push to `main` | Builds + deploys frontend, verifies routes live |
| Live Readiness | manual / scheduled | Strict post-deploy verification (latency, headers, parity) |
| OpenClaw Agent Responder | cron (if `OPENCLAW_CRON_ENABLED`) | Reads queue, responds via Ollama/GitHub Models, marks messages processed |
| OpenClaw queue self-heal | on every `/api/openclaw/status` poll | Exposes outbound messages pending > 7 days as processed (no worker in serverless) |
| MongoDB Atlas M0 | continuous | Provider-side snapshots per Atlas free-tier policy |

**No human action is required for any of the above.**

---

## 2. Backup reality table (honest)

| Data | Where it lives | Backup | If lost |
|---|---|---|---|
| Users, artifacts, orders, books, referrals | MongoDB Atlas (M0 free tier) | Atlas provider snapshots only. **No repo-stored dumps are authoritative.** | Everything user-generated. This is the single point of failure. |
| Published book media (covers, PDFs) | Cloudinary | Cloudinary account retention | Book assets |
| Frontend + backend code | GitHub repo | Git history (every push) | Nothing — redeploy from any commit |
| Frontend static assets | GitHub Pages + Vercel | Derived from repo | Nothing — rebuilt on deploy |
| Site config / env values | GitHub secrets + Vercel project settings | **Not backed up anywhere.** | Secrets must be re-entered manually. See §4. |
| localStorage drafts | User browsers | None | Drafts vanish (documented; not a backup) |

**The one thing to do before a long absence (optional but recommended):**
run a manual data export so user data exists outside Atlas:

```bash
# From repo root. Needs MONGODB_URI in backend/.env or env.
node backend/scripts/export-data.js > backup.json
```

This writes users (passwords excluded) and artifacts as JSON. Store the file
somewhere safe (not committed to the repo). This is the only user-data
export that exists.

---

## 3. What can break while you are away (and what happens)

| Failure | Automatic behavior | Human needed? |
|---|---|---|
| Backend deploy fails | Workflow retries + fallback Vercel CLI deploy; last good deployment stays live | No — old version keeps serving |
| Frontend deploy fails | Same pattern; GitHub Pages keeps last good build | No |
| OpenClaw queue accumulates stale messages | Self-expiry on status poll (> 7 days) | No |
| Ollama / GitHub Models down | OpenClaw responder skips that run | No |
| Telegram bot token expires | Telegram commands stop; site unaffected | Only if you want Telegram back |
| Atlas free-tier quota exceeded | Writes may fail; reads degrade | Yes — upgrade tier or clear data |
| Vercel hobby-tier function hours exhausted | Backend 429/503 until reset | Yes — wait for reset or upgrade |
| A secret expires (Stripe key rotation, etc.) | Affected feature fails; rest of site fine | Yes — replace in GitHub secrets + Vercel |

---

## 4. Recovery from total loss (device loss, account lockout)

See `docs/DEVICE_LOSS_RECOVERY_RUNBOOK.md` for the full procedure. Summary:

1. **Code:** clone the repo from GitHub from any machine.
2. **Deployments:** both deploy workflows run on push to `main` — no manual steps.
3. **Secrets:** re-enter from `docs/PRODUCTION_OPERATIONS.md` §4 (names only — values must come from your password manager or the provider dashboards). The repo does NOT store secret values.
4. **Admin access:** owner recovery via `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SECRET_CODE` (see §11 of PRODUCTION_OPERATIONS.md; rotate after use).
5. **User data:** restore from Atlas snapshots, or from a manual export (§2 above) if one exists.

---

## 5. First 10 minutes after returning

```bash
# 1. Is the site up? (read-only)
curl -s https://pva-backend-api.vercel.app/api/health
curl -s -o /dev/null -w "%{http_code}" https://pvabazaar.org/

# 2. Full readiness report (read-only, non-strict)
npm run verify:live

# 3. What changed while away?
git log --oneline -20
gh run list --limit 10

# 4. Any failed workflows?
gh run list --status failure --limit 10
```

All green → nothing to do. Anything red → the failing workflow log names the
exact step; deploys are self-healing (§3) so red checks are usually
transient or a quota issue.

---

## 6. Rollback (last resort)

Deploys are immutable per-commit; rolling back = redeploying an older commit:

```bash
# Backend: redeploy a known-good commit via workflow_dispatch
gh workflow run deploy-backend-live.yml --ref <good-sha>

# Frontend: same via its workflow, or force-push the branch if Pages is stale
```

The backend reports its deployed SHA at `/api/version` — verify parity:

```bash
curl -s https://pva-backend-api.vercel.app/api/version
```

---

## 7. Related docs

- `docs/PRODUCTION_OPERATIONS.md` — canonical ops reference (env names, auth, backups, money flows)
- `docs/DEPLOYMENT.md` — deploy pipelines detail
- `docs/DEVICE_LOSS_RECOVERY_RUNBOOK.md` — full device-loss recovery
