# AI-Verified Artifact Verification System

This doc describes the full verification flow for PVA Bazaar so you can see how everything fits together without reading code.

## Goal

We sell **Scarce Knowledge** (e.g. retro game discs). The value prop is **Truth**. Buyers see a clear **AI-Verified** (or **Integrity Compromised** / **Unverified**) status on each product.

## Parts of the system

1. **Python script** (`scripts/verify_artifact.py`)  
   - Takes a file (ISO/bin/cue).  
   - Computes SHA-256.  
   - Compares to a trusted JSON list of known public-domain hashes.  
   - Returns whether it’s authentic and a confidence score.  
   - Clear errors: e.g. “Integrity Compromised” when the hash doesn’t match.

2. **Trusted hash database** (`scripts/trusted_hashes.json`)  
   - List of known-good hashes (e.g. from Archive.org).  
   - You add entries when you add new artifacts.  
   - Open and auditable (Anti-Druj).

3. **GitHub Action** (`.github/workflows/verify.yml`)  
   - Runs when files under `artifacts/` (or the script/DB) change.  
   - Verifies every artifact file.  
   - Optional: if you set `VERIFY_API_URL` (and optionally `VERIFY_API_SECRET`) in repo secrets, it POSTs each successful result to your API so the site can show the badge.

4. **Backend API** (Express + MongoDB)  
   - **POST /api/verification** — stores a verification result and returns a unique certificate ID (e.g. `PVA-CERT-...`).  
   - **GET /api/verification/artifact/:idOrSlug** — returns the latest verification for a given item (used by the product page badge).  
   - Optional: protect POST with `VERIFY_API_SECRET` (env) and `X-Verify-Secret` header.

5. **Frontend badge** (`VerificationBadge.jsx`)  
   - On each **marketplace item page**: calls the API by item id/slug and shows:  
     - Green **AI-Verified** when verified.  
     - **Integrity Compromised** when the backend says so.  
     - **Unverified** when there’s no record or unknown status.

6. **Optional: Supabase**  
   - If you later use Supabase, there is an Edge Function in `supabase/functions/store-verification/` that does the same “store result and return certificate ID” job.  
   - See `supabase/README-Verification.md` for setup. The main app does **not** require Supabase; it uses the Express API above.

## End-to-end flow

1. You add a new artifact file under `artifacts/` (e.g. `artifacts/retro/my_game.iso`).  
2. You add its known-good SHA-256 to `scripts/trusted_hashes.json`.  
3. You push (or open a PR). The GitHub Action runs and verifies the file.  
4. If you set `VERIFY_API_URL` (and optional secret), the workflow POSTs the result to your API; the backend stores it with a certificate ID and links it to a slug (e.g. `my_game` from the filename).  
5. You create (or already have) a marketplace item with the same slug (or id) so the product page can look up verification.  
6. On the product page, **VerificationBadge** fetches `/api/verification/artifact/:idOrSlug` and shows **AI-Verified** or the other status.

## What you need to do as maintainer

- **Add hashes:** When you add a new artifact, get its SHA-256 from your trusted source and add an entry to `trusted_hashes.json`.  
- **Optional:** In GitHub repo **Settings → Secrets**, add `VERIFY_API_URL` (your API base URL) and, if you set `VERIFY_API_SECRET` on the server, add `VERIFY_API_SECRET` so CI can securely POST results.  
- **Slug match:** Use the same slug (or id) for the artifact and the marketplace item so the badge can find the verification.

No coding required for normal operation; just add hashes and optional secrets.
