# PVA Bazaar Web (Alchemical layer)

Next.js 14 app that serves the **sanctuary** / alchemical layer for PVA Bazaar: archive, verification, manifesto, and cart. It sits alongside the main Vite frontend and backend; it can be deployed as a separate Vercel project or served under a subpath.

## Run locally

```bash
cd apps/pva-bazaar-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app works without a backend; the Verification page can call the main API when configured.

## Environment

Copy `.env.example` to `.env.local` and set:

- **`NEXT_PUBLIC_VERIFICATION_API_URL`** (or **`NEXT_PUBLIC_API_URL`**) – Base URL of the backend (e.g. `https://your-api.vercel.app`). When set, the Verification page “Check verification for an artifact” block will call `GET /api/verification/artifact/:idOrSlug`.
- **`NEXT_PUBLIC_ETSY_SHOP_URL`** – Your Etsy shop URL (e.g. `https://www.etsy.com/shop/YourShop`). When set, the Archive page shows a “Shop on Etsy” link.
- **`NEXT_PUBLIC_SITE_URL`** – Canonical site URL for `sitemap.xml` (e.g. `https://sanctuary.pvabazaar.org`). Optional; falls back to Vercel’s URL or `https://pvabazaar.org`.

## Pages

| Path | Purpose |
|------|--------|
| `/` | Home – preserve/verify/acquire, Phase One Kenyan + Anti-Druj |
| `/archive` | Kenyan crafts as living artifacts; beadwork + soapstone; Pasha VII teaser |
| `/verification` | How we verify; artifact lookup by ID/slug (uses API when URL set) |
| `/manifesto` | Home Station Protocol (Pasha VII – Moon 3) |
| `/cart` | Checkout via Etsy for now; future in-house cart |
| (any other path) | Custom 404 – “This path is not in the archive” with links to Home / Archive |

Root `loading.tsx` shows a spinner during route transitions; `error.tsx` shows an on-brand recovery UI (Try again, Home) when something throws. The app serves `/sitemap.xml` and `/robots.txt` (base URL from `NEXT_PUBLIC_SITE_URL` or Vercel’s URL). A minimal health check is at `GET /api/health` (returns `{ ok: true }`).

## Build

```bash
npm run build
npm run start
```

## Adding a page

Create `src/app/your-page/page.tsx`, add a `<Link href="/your-page">` in `layout.tsx` nav, and add `"/your-page"` to the routes array in `src/app/sitemap.ts`.

## Deploy

The repo root `vercel.json` currently deploys the API and the Vite **Frontend**. To deploy this Next app:

- **Option A:** Add a second Vercel project pointing at `apps/pva-bazaar-web` (e.g. `sanctuary.pvabazaar.org`).
- **Option B:** Later, adjust root config to build and route this app (e.g. under `/web` or as the default site).

**CORS:** The backend allowlist already includes `http://localhost:3000`. For a deployed Next app, add its origin to the backend env `ALLOWED_ORIGIN` (comma-separated) so the verification lookup can call the API.
