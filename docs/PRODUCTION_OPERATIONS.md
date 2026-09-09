# PVA Bazaar — Production Operations (canonical)

This is the one document a future maintainer needs to keep the live site
running. It describes the system as deployed, not as imagined.

## 1. Canonical pieces

| Role | Canonical choice |
|---|---|
| Public frontend (source of truth) | `Frontend/` directory in this repo |
| Public frontend (hosting) | GitHub Pages → `https://pvabazaar.org/` |
| Production backend (current) | Vercel serverless API → `https://pva-backend-api.vercel.app/api` |
| Database / source of truth | MongoDB Atlas, database name `pvabazaar` |
| Images / media / manuscripts | Cloudinary (URLs stored in MongoDB); Internet Archive + Pinata IPFS as manuscript mirrors |
| Source control / static deploys | GitHub (`PVAGR/pva-bazaar-app`, branch `main`) |

What each store is for:

- **MongoDB Atlas** — authoritative records: users, artifacts/items, orders,
  book projects (metadata + status + file URLs), referrals, partners.
  A book is *published* only when a `BookProject` with `status: 'published'`
  exists in MongoDB and is returned by the public book API.
- **Cloudinary** — binary blobs (covers, PDFs, DOCX, manuscripts). MongoDB
  stores only URLs / public IDs / metadata, never giant file blobs.
- **Browser localStorage** — temporary drafts, autosave, crash recovery, UI
  preferences ONLY. Never authoritative. Anything rendered from localStorage
  must be labeled "on this device only" and must never appear in a
  published/public list as though it came from the server.

## 2. Frontend API discipline

- API base normalization lives in ONE place:
  `Frontend/src/lib/apiBase.js` (`normalizeApiBaseUrl`, `getPreferredApiBase`,
  `apiUrl`). The preferred base ALWAYS ends in `/api`.
- Feature code must call `apiUrl('/some/route')` for direct `fetch()` calls
  and must NEVER concatenate `/api` manually. Manual concatenation produces
  `.../api/api/...` URLs, which fail in production.
- The axios client (`Frontend/src/lib/axios.js`) and `apiFetch`/`apiUpload`
  (`Frontend/src/lib/api.js`) already prepend the base; pass routes WITHOUT
  the `/api` prefix (e.g. `/book-publishing/mine`).
- `normalizeRequestPath` in `api.js` strips a legacy `/api/` prefix once, so
  old call sites keep working — but new code must omit it.

## 3. Book publishing flow (draft → server → MongoDB → public)

1. Author edits in `/books/publish` (`Frontend/src/pages/BookPublishingPage.jsx`).
2. Browser autosaves to `localBookVault` (crash recovery, `source: 'local'`).
3. On **Save draft / Save and publish**, the frontend POSTs multipart form
   data to `POST {API}/book-publishing` (binary files go to Cloudinary via
   signed URLs first; MongoDB receives metadata + URLs only).
4. Backend (`backend/routes/bookPublishing.js`) validates, writes a
   `BookProject` to MongoDB (`status: 'draft'` or `'published'`), and returns
   the saved item. Missing/unreachable MongoDB fails loudly with HTTP 503
   (`stage: 'db_check'`) — never a silent local fallback.
5. Frontend **verifies before claiming success**:
   - publish → `verifyBookPublishedOnline({ id, slug })` re-reads the PUBLIC
     record (`GET {API}/book-publishing/public/:slug`);
   - draft save → re-reads the owner record (`GET {API}/book-publishing/:id`).
6. Only a verified record produces the "Published" / "saved as online draft"
   UI. Verification failure keeps the work as a labeled local draft and shows
   the real error.
7. Public readers (`/books/read/:slug`) load from the public API; a second
   browser/device sees the book with no localStorage involved.

## 4. Required environment-variable NAMES (never values)

Backend (Vercel project settings):

- `MONGODB_URI` — MongoDB Atlas connection string (required; book
  publishing returns 503 without it).
- `JWT_SECRET` — auth token signing.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` —
  media/manuscript storage.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — checkout (if enabled).
- `ETHEREUM_RPC_URL` — blockchain verification reads.
- `IA_ACCESS_KEY`, `IA_SECRET_KEY` — Internet Archive uploads (optional;
  uploads degrade gracefully without them).
- `PINATA_JWT` (or key/secret pair) — Pinata IPFS uploads (optional).
- `ADMIN_SECRET` / admin bootstrap vars — admin token issuance.
- `NODE_ENV=production` on the hosted backend.

Frontend (build-time, `VITE_*`):

- `VITE_API_URL` — must be the full API base **including** `/api`
  (e.g. `https://pva-backend-api.vercel.app/api`).

## 5. Verify production health

```bash
# Backend reachable + DB state + version (no secrets exposed)
curl https://pva-backend-api.vercel.app/api/health
curl https://pva-backend-api.vercel.app/api/health/ping
curl https://pva-backend-api.vercel.app/api/version

# Repo scripts (safe, read-only)
npm run verify:live
npm run verify:network
```

Healthy means: `ok: true`, `database.connected: true` (or `mode: 'file'`
only in local dev — production must be `mode: 'mongo'`), and `sha`
matching the deployed commit.

Logs: Vercel project dashboard → Deployments → Runtime Logs (backend
`console.error('[book-publishing] ...')` lines carry `requestId` + `stage`
for diagnosis). Browser Network/Console shows the exact request URL, HTTP
status, and backend `error`/`message`/`requestId` for failed publishes.

## 6. Verify a book is truly published

1. `GET https://pva-backend-api.vercel.app/api/book-publishing/public/:slug`
   must return `{ ok: true, item: { status: 'published', ... } }`.
2. `https://pvabazaar.org/#/books/read/:slug` must render it in a fresh
   browser profile (no localStorage).
3. The author's `/books/publish` workspace must list it under "Online books"
   with an "Online" badge — not under "Local drafts on this device".

If a book appears in the workspace but NOT via (1) and (2), it is
local-only: keep the browser copy, check API health, then use
"Review & retry" in the workspace once the API is reachable.

## 7. Backup / recovery expectations

- MongoDB Atlas: retain the provider's continuous backup (free-tier cluster
  snapshots as configured in Atlas). No GitHub-stored database dumps are
  authoritative.
- Cloudinary: original media retained per Cloudinary account settings.
- localStorage drafts are NOT backups. They vanish with browser data clearing
  and never leave the device. Treat any "local-only" book as un-backed-up
  until it verifies online.
- Runbook pointers: `docs/DEVICE_LOSS_RECOVERY_RUNBOOK.md`,
  `docs/DEPLOYMENT.md`.

## 8. PARTNERS — authority and verification

- Approved partner records live in MongoDB (`PartnerProfile`,
  `status: 'approved'`). The flagship PVA Bazaar profile is seeded
  server-side (`ensureSeedProfile`); there is no frontend seed in the
  directory.
- The public directory (`GET {API}/partners/public`) returns approved
  profiles only. The frontend renders exactly that list — browser records
  are never merged in. API failure shows "Online partner directory is
  temporarily unavailable" with an empty list.
- Applications (`POST {API}/partners/apply`) create a `PartnerSubmission`
  (`status: 'new'`), deduplicated per email (repeat → HTTP 200,
  `duplicate: true`, same id). Only 201/200-with-`ok:true` counts as
  submitted; the UI shows the returned reference id and labels it a
  submission receipt, never an approval.
- A failed application keeps the form as `pva:partner-application-draft`
  (this device only, clearly labeled, with retry) and never enters the
  directory. Approvals happen only via the admin-gated
  `POST {API}/partners/submissions/:id/approve` flow.
- Verify a submission reached the backend: check the admin submissions list
  or confirm the applicant received the reference id from a 201 response.
  A business is listed publicly only after approval + appearance in
  `GET {API}/partners/public`.

## 9. REFERRALS — authority, cache, and money safety

- Authoritative source: MongoDB `ReferralCode` (unique code + unique email),
  via `POST {API}/referrals/register` (stable code per email; repeat
  registration returns the same code), `POST {API}/referrals/earnings`
  (owner-gated by email), `POST {API}/referrals/:code/click`.
- The browser stores only a pointer (code + email) after server-confirmed
  registration. No local-only codes exist.
- Dashboard stats carry an explicit freshness state: `Live` (just read),
  `Saved data — not live` (API failed, cached values labeled with last
  refresh time + Retry), `Stats unavailable` (nothing trustworthy — balances
  render as "Unknown"/"—", never $0). Absence of data is not a zero balance.
- Click pings (`Layout.jsx` on `?ref=`) are fire-and-forget, never block
  navigation, and are deduplicated per code per tab session
  (`pva:ref-click-sent:*` in sessionStorage) to avoid refresh inflation.
  Backend increments `clicks` per ping without dedup — treat clicks as
  approximate traffic, sales/settlements as exact.
- Earnings and payouts render only backend values; the client never
  computes balances from localStorage.
- Verify referral API health: `POST {API}/referrals/earnings` with a known
  owner email must return `{ok:true, data:{…}}`; unknown emails return 404
  (never fake zeros); unknown click codes return 404.

## 10. What NOT to do
- Do not migrate off Vercel, add paid services, or build a parallel
  backend/frontend/database without an explicit decision record.
- Do not merge localStorage records into server lists, show success toasts
  before server confirmation, or swallow publish errors.
- Do not store file blobs in MongoDB documents.
- Do not commit secrets. Variable NAMES go in docs; VALUES go in the
  hosting provider's secret store.
