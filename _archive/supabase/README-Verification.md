# Supabase Verification (Optional)

This folder contains an **optional** Supabase Edge Function to store AI-verification results. The main app already uses **Express + MongoDB** for verification (see `/api/verification`). Use this only if you add Supabase to your stack.

## What’s included

- **`functions/store-verification/index.ts`** — Edge Function that accepts a verification result and returns a unique certificate ID. It inserts into a table `verification_results`.

## Supabase setup (if you use it)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the SQL editor, create the table:

```sql
create table if not exists verification_results (
  id uuid primary key default gen_random_uuid(),
  certificate_id text unique not null,
  artifact_id_or_slug text not null,
  is_authentic boolean not null,
  confidence_score numeric not null,
  computed_hash text,
  status text not null check (status in ('verified', 'integrity_compromised', 'unknown', 'error')),
  message text,
  source text default 'ci',
  matched_entry jsonb,
  verified_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_verification_artifact on verification_results (artifact_id_or_slug, verified_at desc);
```

3. Deploy the function:

```bash
supabase link --project-ref YOUR_REF
supabase functions deploy store-verification
```

4. Call it with a POST body like:

```json
{
  "artifactIdOrSlug": "my-game-slug",
  "is_authentic": true,
  "confidence_score": 1.0,
  "status": "verified",
  "message": "Hash matches trusted database."
}
```

Response: `{ "ok": true, "certificateId": "PVA-CERT-...", "verified_at": "..." }`.

## Using the main app (no Supabase)

The **backend** already has:

- **POST /api/verification** — store a result (returns `certificateId`).
- **GET /api/verification/artifact/:idOrSlug** — get latest verification for an item (used by the badge).

The **frontend** uses this API for the **VerificationBadge** on product pages. No Supabase is required.
