# Deploy the Sanctuary App (Next.js)

Deploy `apps/pva-bazaar-web` as a **separate Vercel project** so it does not replace the existing API + Vite frontend.

## 1. Create the Vercel project

- New Project, Import from GitHub, select `pva-bazaar-app`.
- Set **Root Directory** to `apps/pva-bazaar-web`.
- Keep default Next.js build.

## 2. Environment variables

In Vercel project Settings, Environment Variables:

- `NEXT_PUBLIC_VERIFICATION_API_URL` – Backend API base URL (e.g. `https://your-api.vercel.app`).
- `NEXT_PUBLIC_ETSY_SHOP_URL` – Your Etsy shop URL.
- `NEXT_PUBLIC_SITE_URL` – Canonical site URL for sitemap/robots (e.g. `https://sanctuary.pvabazaar.org`). Set after first deploy to your final URL and redeploy.

## 3. Custom domain

In Vercel Domains, add e.g. `sanctuary.pvabazaar.org` and follow DNS instructions.

## 4. Backend CORS

In the **backend** project env, add the sanctuary origin to `ALLOWED_ORIGIN` (comma-separated) so verification lookup works.

## 5. Post-deploy checks

- `GET <sanctuary>/api/health` returns `{ "ok": true }`.
- Visit `/`, `/archive`, `/verification`, `/dashboard`, `/manifesto`, `/cart`.
- Check `/sitemap.xml` and `/robots.txt` use the right base URL.
- On `/verification` or `/dashboard`, test with an artifact ID that has a verification record.

See `apps/pva-bazaar-web/README.md` for local run and `docs/README.md` for doc index.
