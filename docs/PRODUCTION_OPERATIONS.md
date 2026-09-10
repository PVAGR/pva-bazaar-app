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
- `ADMIN_SELF_SIGNUP_ENABLED` — must stay unset or `false` in production
  (defaults to `false` there; admin creation then requires the bootstrap code).
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` / `ADMIN_USER_ID` —
  emergency owner recovery credentials (see §11; rotate after use).
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

## 10. COMMERCE — authority, verification, recovery

- Authoritative marketplace source: MongoDB `Artifact` (`status:'published'`)
  via `GET {API}/items` (cursor pagination, limit clamped 1–50) and
  `GET {API}/items/:slugOrId`. The frontend never substitutes sample data;
  an empty backend is an empty shelf, a failed request is an explicit error.
- All commerce routes are mounted on the production (serverless) entry:
  `/api/items`, `/api/checkout`, `/api/orders`, `/api/item-inquiries`,
  `/api/sales`, `/api/seller`, `/api/products`, plus referrals/partners.
  If a commerce path 404s in production while working locally, check the
  serverless mount table first (`backend/api/index-serverless.js`).
- Listing lifecycle: `POST {API}/items/register` creates `status:'draft'`
  (admin publishes); edits via owner `PUT {API}/items/:id/manage`
  (creator/steward/access-code) or admin routes; deletes are creator-or-admin.
  The UI reports "pending review" only after server confirmation, using the
  server-generated id/slug; failed submits keep the entered data in the form
  with the real error. No idempotency keys — the submit button disables while
  saving; retries after a confirmed write must be reconciled via `/items/mine`.
- Cart (`pva:cart`): temporary array of item ids on the device. Display
  prices come from server revalidation (`GET {API}/items?ids=…`, capped at
  50; unpublished/sold ids come back absent and are called out). The cart is
  cleared only after a paid order is server-finalized (see below).
- What makes an order real: a MongoDB `Order` created by the backend, which
  re-resolves price/currency/availability from the product id (client totals
  are never trusted; quantity is fixed at 1). Checkout sessions reference
  `stripeSessionId`; Stripe webhook plus the idempotent
  `POST {API}/checkout/finalize-session` fallback mark payment.
- Success page flow: re-read Stripe session → if `paid`, call finalize →
  on `finalized:true` drop exactly the stashed session ids
  (`pva:checkout-session`) from the cart and show the server `orderId`.
  Anything else keeps the cart and explains the state (pending/failed).
- Referral attribution: `?ref=` captured to `pva:referral-code` (+
  `pva:inbound-ref`), sent as `referralCode` with checkout create calls only.
  The server validates (`active`, 6–16 chars) and derives commission
  server-side at settle time; unknown/suspended codes simply mean no
  attribution. Settlement is idempotent per order (`commissionAmountCents`
  guard + unique `auto_<orderId>` payout batch); refunds reverse via
  `reverseReferralForOrder`. No self-referral rule exists — reported, not
  invented. Click pings (`/:code/click`) are deduped per tab session and are
  approximate traffic, never money.
- Seller/customer money state: `/orders/mine`, `/orders/escrow`,
  `/sales/metrics`, seller dashboard — failures render "Unavailable", never
  `$0.00` or empty history. Absence of data is not a zero balance.
- Media: listing payloads carry remote URL strings (or admin-multipart
  flows); binaries live in Cloudinary/media storage, never as Mongo blobs or
  uploader-local paths.
- Verify a real listing: `GET {API}/items/:slug` returns it with
  `status:'published'`. Verify a real order: server `orderId` retrievable via
  `/orders/mine` (owner) or admin order reads; Stripe dashboard agrees on the
  session. Recovery: failed checkout keeps the cart — retry; failed finalize
  keeps cart + order lookup guidance; never re-pay without checking history.
- Rate limits: global 300/15m; checkout 30/15m on `/api/checkout`; webhooks
  1000/15m. Stripe webhook delivery requires the full-server raw-body path —
  it is NOT mounted serverless, so paid-order settlement in production
  currently depends on the finalize fallback (see remaining work).

## 11. AUTH — accounts, sessions, admin authority, owner recovery

Authoritative stores (nothing here lives in localStorage):

| Concern | Authority | Notes |
|---|---|---|
| Registered users | MongoDB `User` | Registration/login only ever writes server-side |
| Sessions | Server-signed JWTs (HS256) | User token 7 days, admin token 12 hours |
| Admin right | Mongo `User.role === 'admin'` + server-issued admin JWT | Checked on every admin route (`adminSession`) |
| Password reset | NONE (documented limitation) | No email/SMTP reset exists — see recovery below |

- **Browser localStorage is never authoritative.** It holds only the session
  token (`token`, legacy `authToken`/`jwt`, `admin:token`/`admin_token`) and a
  clearly device-only profile (`pva:local-auth-*`). It can never contain a
  registered user, a valid session, or an admin grant.
- The backend **rejects unsigned `local.`-prefixed tokens outright**
  (HTTP 401, code `LOCAL_TOKEN_REJECTED`) on both `authenticateToken` and
  `adminSession`. A forged `local.<base64>` token claiming any email/id/role
  is never treated as a session. Offline/device profiles are display-only.
- Failed logins/registrations never produce success: the UI shows the server
  error, stores no token, and creates no device account.
- **Admin self-signup is locked in production by default.**
  `ADMIN_SELF_SIGNUP_ENABLED` defaults to `false` when `NODE_ENV=production`.
  The first admin can be bootstrapped only while zero admins exist; any
  additional admin requires `ADMIN_BOOTSTRAP_CODE`/`ADMIN_SECRET_CODE`. Do NOT
  enable open self-signup in production.
- Admin authentication paths: `POST /api/admin/token` (owner secret
  `ADMIN_SECRET_CODE`, constant-time compare, issues a 12h admin JWT),
  `POST /api/admin/login` (DB admin credentials or env-admin bootstrap), and
  the optional GitHub OAuth allowlist flow.
- **Secrets fail closed.** In production, `JWT_SECRET` is required: if it is
  missing, registration/login/admin token issuance return HTTP 503 instead of
  signing with a fallback secret. `GET /api/auth/diagnostic`,
  `GET /api/admin/bootstrap-status`, and `GET /api/admin/oauth/github/status`
  expose booleans/names only — never secret values.

Password / account recovery:

- **Password reset is not available online** (no SMTP/email infrastructure).
  Users must sign in on each new device with their password; the account is
  server-side, so clearing browser storage never deletes it.
- **Emergency owner recovery:** set `ADMIN_USERNAME` + `ADMIN_PASSWORD`
  (and optionally `ADMIN_EMAIL`, `ADMIN_USER_ID`) in the hosting secret store,
  then sign in through `POST /api/auth/login` (or `/api/admin/login`) with
  those credentials. The server finds-or-creates the admin user (pinned to
  `ADMIN_USER_ID` when set), issues a 12h admin JWT, and the owner then resets
  the password in the admin user tools. Comparisons are constant-time. Rotate
  the temporary credentials immediately after recovery.
- **Rotating `JWT_SECRET`:** replace the env value and redeploy. All existing
  user and admin sessions become invalid (401) — users re-sign in, and the
  owner re-issues an admin token via `POST /api/admin/token` with
  `ADMIN_SECRET_CODE`. At that point the previous secret is dead: verify with
  a health check that `/api/auth/diagnostic` and `bootstrap-status` behave and
  that a request signed with the old value returns 401.
- Device continuity backups (encrypted localStorage snapshots uploaded to the
  account through `/api/recovery/snapshots`) are a convenience, not a
  password-reset mechanism.

## 12. What NOT to do
- Do not migrate off Vercel, add paid services, or build a parallel
  backend/frontend/database without an explicit decision record.
- Do not merge localStorage records into server lists, show success toasts
  before server confirmation, or swallow publish errors.
- Do not store file blobs in MongoDB documents.
- Do not commit secrets. Variable NAMES go in docs; VALUES go in the
  hosting provider's secret store.

## 13. SITE NAVIGATION / SEARCH

### Primary navigation (simplified)

The top navigation bar shows these items:
- **Marketplace** → `/marketplace`
- **Books** → `/books`
- **Blog** → `/blog`
- **Archive** → `/archive`
- **Explore** (dropdown with groups)
  - KNOWLEDGE: Civilization Library, Institutions
  - COMMUNITY: Partnerships, Partner Program, Forum
  - COMMERCE: Showroom, Supplier Portal
  - ABOUT: About, Contact, Provenance

On mobile (≤800px width), the nav collapses to a hamburger menu with the same groups.

### Universal search (Ctrl+K)

Pressing **Ctrl+K** (or **Cmd+K** on Mac) opens a search overlay that queries:
- Books (published)
- Blog posts (published)
- Library documents (public)
- Library articles (published)
- Partner profiles (approved)
- Marketplace artifacts (published)
- Archive entries
- Static routes (local)

The backend endpoint is `GET /api/search?q=<query>&limit=<limit>`:
- `q` is required, minimum 2 characters
- `limit` defaults to 30, max 30
- Returns `{ok, query, count, results:[{type,id,title,subtitle,path}], partial, failedSources}`
- If MongoDB is unavailable, falls back to static content search

**Frontend behavior:**
- Debounces input by 300ms
- Shows states: EMPTY / LOADING / RESULTS / NO_RESULTS / PARTIAL / UNAVAILABLE
- Backend failure never shows "No results" — shows UNAVAILABLE with route suggestions only
- Closes on Escape key or route change

### Deep-link 404 fallback

GitHub Pages serves `404.html` for unknown paths. The script redirects:
1. Known legacy routes (e.g., `/welcome` → `/`)
2. Asset paths (`.js`, `.css`, `.png`, etc.) → no redirect, 404 stands
3. All other paths → hash-redirect (`/#/path`) to let React Router handle

This ensures that refreshing a deep link like `/books/read/my-book` works without a 404 flash.
