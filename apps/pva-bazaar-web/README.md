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

## Pages

| Path | Purpose |
|------|--------|
| `/` | Home – preserve/verify/acquire, Phase One Kenyan + Anti-Druj |
| `/archive` | Kenyan crafts as living artifacts; beadwork + soapstone; Pasha VII teaser |
| `/verification` | How we verify; artifact lookup by ID/slug (uses API when URL set) |
| `/manifesto` | Home Station Protocol (Pasha VII – Moon 3) |
| `/cart` | Checkout via Etsy for now; future in-house cart |

## Build

```bash
npm run build
npm run start
```

## Deploy

The repo root `vercel.json` currently deploys the API and the Vite **Frontend**. To deploy this Next app:

- **Option A:** Add a second Vercel project pointing at `apps/pva-bazaar-web` (e.g. `sanctuary.pvabazaar.org`).
- **Option B:** Later, adjust root config to build and route this app (e.g. under `/web` or as the default site).

Ensure the deployed backend allows CORS from this app’s origin if you use the verification lookup.
