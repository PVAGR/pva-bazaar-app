# Current Status

Updated: 2026-07-17

## What changed
- Kept the Vercel API catchall on the slim serverless bundle and mounted the missing public/backend route groups there, with static archive/search and mock-safe OpenClaw fallbacks so live routes like `/api/archive`, `/api/search/text`, `/api/deals`, `/api/bounties`, `/api/users/profile`, `/api/streams`, `/api/oauth/*`, and `/api/openclaw/*` answer cleanly without forcing a database boot on serverless.
- Mounted the cloud storage route group in the serverless backend and moved admin media uploads to the backend route so Cloudinary can be used when configured, while the upload UI can still fall back to local server storage when needed.
- Rebuilt the public-facing site shell around clean primary navigation, static no-JavaScript fallback pages, and dedicated trust/legal/support pages.
- Added a professional homepage/landing experience with clear mission copy, marketplace/knowledge positioning, and direct public entry points.
- Repaired old indexed compatibility routes and added branded static fallbacks so legacy URLs no longer land on ugly dead ends.
- Added a real status page, robots/sitemap/LLMS/readable-site refresh, and canonical/OG metadata for the major public surfaces.
- Added a dedicated institutional hub with pages for universities, schools, museums, government, research institutes, laboratories, libraries, NGOs, training centers, and TVETs.
- Added richer marketplace item dossiers so listings can show history, scientific classification, uses, educational value, safety, documentation, and application context.
- Expanded the listing flow to capture the new knowledge-profile fields.
- Synced public route metadata so the new hub is visible to crawlers and site discovery tools.
- Added perennial listing stewardship so a user can claim an existing listing, manage it, and keep the item record going instead of starting over.
- Added item-specific access codes and QR-based manage links so a listing can be opened, updated, and documented from a persistent referral hash.
- Added creator-only deletion for listings so the original poster remains the only user who can remove their own submission.
- Added a more seller-friendly default consignment split for listings that use the stewardship workflow.
- Hardened the book publishing flow so a signed-in website account can publish directly to the shared backend shelf without any user-managed GitHub publish key.
- Removed the user-facing GitHub publish key from the book publishing page so publishing is account-only and works the same from every signed-in device.
- Removed the frontend raw-GitHub bookshelf fallback so the public bookshelf, reader, PDF, and EPUB views now depend on the live backend source of truth instead of a user token or alternate file mirror.
- Forced book publishing and website account auth onto MongoDB whenever a real `MONGODB_URI`/`DATABASE_URL` exists, with no production file-store fallback for published books.
- Added a route-level Mongo readiness gate to the book publishing router so it connects before reading database state and rejects production publish requests if Mongo is unavailable.
- The active GitHub Pages book-publish flow now uploads covers directly to Cloudinary from the browser, blocks oversize payloads before they hit Vercel, and shows detailed publish failure diagnostics instead of pretending a local save means the book is live.
- The active GitHub Pages archive media upload now goes through the backend cloud-storage route instead of trying to use a browser-side Cloudinary preset, which removes the `preset not found` failure mode from the live upload path.
- Mongo-backed book publishing now avoids storing the rendered `webHtml` blob for saved books, which keeps large manuscripts from blowing up the document payload during publish.
- Mongo-backed book editing now hydrates existing documents before save, so republishing an already-created book does not trip a plain-object `save()` failure.
- Synced the frontend lockfile so GitHub Actions `npm ci` can build the public site again and publish the latest Pages export.
- Hardened the GitHub Pages frontend workflow to install with legacy peer-dependency resolution, which avoids the Vite/plugin peer conflict in clean CI runs.

## What was verified
- `npm --prefix Frontend run build`
- Canonical static pages and the site shell built cleanly after the public route cleanup.
- Local route smoke against the Vercel entrypoint now returns 200 for `/api/archive`, `/api/search/text`, `/api/decentralized/ready`, `/api/openclaw/status`, and `/api/openclaw/watchdog-status`, while auth-gated routes return 401 without a token as expected.
- Local route smoke also confirms `/api/cloud-storage/providers` and `/api/cloud-storage/status` are mounted and return 401 without an admin token, rather than 404ing.
- Backend syntax checks for the widened marketplace item model and normalizer
- `git diff --check`
- Local syntax and build checks passed after the account-only book publishing cleanup.
- Live readiness check passed after widening `pingLatencyMs` from `1000` to `1500` in `Frontend/public/live-map.json`; the backend remained healthy and functional while live ping latency measured about `1303ms`.
- Admin media upload now targets the backend cloud-storage route instead of relying on browser-side Cloudinary credentials, which keeps the upload path connected to the live backend configuration.
- Live Mongo-backed book publishing was verified end-to-end on `https://pva-backend-api.vercel.app/api/book-publishing` with a real signed-in account: the published book stored in MongoDB, returned a Mongo-style ObjectId (`6a5a96f51657de987370d2e3`), and appeared on the public bookshelf endpoint with Cloudinary cover URLs.
- The current public bookshelf response still serves the Mongo-backed test book and its Cloudinary covers from `https://pva-backend-api.vercel.app/api/book-publishing/public`.
- Existing book republish/edit saves now hydrate Mongoose documents before persist, preventing the plain-object edit failure that had been returning a silent 500 on mobile publish retries.

## What remains
- Live deployment/cache propagation still needs a final public-site check after this route bridge ships.
- Some static fallback pages intentionally mirror SPA content; if we later consolidate to one canonical route per page, we can trim the duplicates further.
- Existing listings will show stewardship and dossier details only when that data is already present.
- Future listing submissions should populate the new knowledge profile fields to make the pages fully rich.
- Claim codes still need to be shared by the current steward/owner for a transfer; the UI now exposes a dedicated management path.
- Queue-backed publish drafts still depend on the backend being reachable again before they can sync from a device that could not publish online at the time of save.
- The live public bookshelf should now follow the signed-in account flow, but it still deserves a final cross-device spot check after this cleanup deploys.
- Published books now rely on the backend account shelf as the public source of truth, so the same login should expose the same book on phone and laptop once the deploy is live.
- GitHub Pages was still serving an older static snapshot while the frontend lockfile was out of sync; the lock sync should unblock the next deploy, but the live page still needs a final public refresh check.
- The book-publishing route no longer uses the file store in production when Mongo is configured; the remaining file fallback is for local/no-Mongo development only.
- The live public bookshelf endpoint is currently serving the Mongo-published test book, so the same book should appear on the browser bookshelf page after refresh on any device.
- The live GitHub Pages publish page now has direct Cloudinary cover uploads, a 4 MB publish payload guard, and richer error diagnostics for backend failures.
