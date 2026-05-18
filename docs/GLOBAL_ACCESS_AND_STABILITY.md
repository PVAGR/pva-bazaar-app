# Global Access and Stability Playbook

Last updated: 2026-05-18
Target: Keep `pvabazaar.org` globally reachable, fast, and indexed.

## 1) Route the correct app to the domain

If `https://pvabazaar.org/get-started` or `https://pvabazaar.org/recovery` returns 404, the sanctuary Next app is not the active deployment for the root domain.

Required:

1. Deploy workspace `apps/pva-bazaar-web`.
2. Attach custom domain `pvabazaar.org` and `www.pvabazaar.org` to that deployment.
3. Set canonical environment variable:
   - `NEXT_PUBLIC_SITE_URL=https://pvabazaar.org`

## 2) DNS and TLS baseline

Required records:

- Apex (`@`) -> hosting provider apex target
- `www` -> CNAME to provider target
- `api` -> CNAME/A to backend host

Security:

- TLS mode: Full strict
- HSTS enabled
- Auto HTTPS redirect enabled

## 3) CDN and caching

Enable CDN caching at edge with respect for origin headers.

Cache strategy:

- HTML pages: short edge cache with revalidation
- assets/fonts/images: long immutable cache
- robots and sitemap: short cache, frequent revalidation

## 4) Monitoring and uptime

Track at minimum:

- `https://pvabazaar.org/robots.txt`
- `https://pvabazaar.org/sitemap.xml`
- `https://pvabazaar.org/get-started`
- `https://pvabazaar.org/recovery`
- `https://api.pvabazaar.org/api/health`

Alert channels:

- Email
- Telegram (recommended for immediate signal)

## 5) Verification command

Run from repo root after each deploy:

```bash
npm run verify:seo -- https://pvabazaar.org
```

If this fails, do not consider deploy complete.

## 6) Search indexing actions

1. Add property in Google Search Console for `https://pvabazaar.org`.
2. Submit `https://pvabazaar.org/sitemap.xml`.
3. Add Bing Webmaster Tools property and submit sitemap.
4. Request indexing for:
   - `/get-started`
   - `/heelkawn`
   - `/recovery`

## 7) Anti-regression checklist

- [ ] Root domain serves sanctuary Next app
- [ ] `robots.txt` returns 200 and includes sitemap line
- [ ] `sitemap.xml` returns 200 and includes key routes
- [ ] OpenGraph and Twitter images return 200 image content type
- [ ] `verify:seo` command passes
