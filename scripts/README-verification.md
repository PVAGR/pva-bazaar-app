# AI-Verified Artifact Verification

This folder contains the **hash-based verification** for Scarce Knowledge artifacts (e.g. retro game ISOs). Value prop: **Truth** — every file is checked against a trusted database of public-domain hashes.

## What’s here

| File                  | Purpose                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `verify_artifact.py`  | Python script: takes a file, computes SHA-256, compares to `trusted_hashes.json`, returns `is_authentic` and `confidence_score`. |
| `trusted_hashes.json` | Trusted database of known-good hashes (e.g. from Archive.org). One entry per artifact with `sha256`, `name`, `source_url`, etc.  |

## Run locally

```bash
# From repo root
python scripts/verify_artifact.py path/to/file.iso

# With custom DB
python scripts/verify_artifact.py path/to/file.iso --db path/to/trusted_hashes.json

# JSON-only output (for CI)
python scripts/verify_artifact.py path/to/file.iso --json
```

Exit code **0** = verified; **1** = not verified or error.

## Adding trusted hashes

1. Get the SHA-256 of the **exact** public-domain file (e.g. from Archive.org or your source).
2. Add an entry to `scripts/trusted_hashes.json` under `entries`:

```json
{
  "id": "my-retro-game-usa",
  "name": "My Retro Game (USA)",
  "sha256": "a1b2c3d4...",
  "filename_hint": "game.iso",
  "source_url": "https://archive.org/details/..."
}
```

3. Re-run the script or push to trigger the GitHub Action.

## CI (GitHub Actions)

- Workflow: `.github/workflows/verify.yml`
- Runs on push/PR when `artifacts/**`, `scripts/verify_artifact.py`, or `scripts/trusted_hashes.json` change.
- Looks for files under **`artifacts/`** with extensions `.iso`, `.bin`, `.cue`.
- If you set **secrets**: `VERIFY_API_URL` (e.g. `https://your-api.com`) and optionally `VERIFY_API_SECRET`, the workflow will **POST** each successful verification to your API so the **VerificationBadge** on product pages can show “AI-Verified”. Use the same slug for the artifact file (basename without extension) and the marketplace item slug so the badge can look up the result.

## Backend API (this repo)

- **POST /api/verification** — store a result (optional header `X-Verify-Secret` if `VERIFY_API_SECRET` is set).
- **GET /api/verification/artifact/:idOrSlug** — get latest verification for an item (used by the badge).

No Supabase required; the Express backend and MongoDB handle storage. See `supabase/README-Verification.md` only if you add Supabase later.
