# Current Status

Updated: 2026-07-11

## What changed
- Forced the Vercel API catchall to boot the full Express backend instead of the slim serverless bundle, so live routes like `/api/archive`, `/api/search/text`, `/api/deals`, `/api/bounties`, `/api/users/profile`, `/api/streams`, `/api/oauth/*`, and `/api/openclaw/*` can actually exist on the deployed host.
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
- Hardened the book publishing flow so the live backend can use a shared GitHub-backed persistence source when a GitHub token is available, and queued publish drafts stay local until the backend can sync them online.
- Added a browser-saved GitHub publish key on the book publishing page, plus a public raw-GitHub bookshelf fallback so published books can appear on other devices even when the live backend is empty.
- Added a backend public raw-GitHub fallback for the bookshelf, reader, PDF, and EPUB routes so published books can be read even when the live serverless store has not loaded the shared file yet.
- Synced the frontend lockfile so GitHub Actions `npm ci` can build the public site again and publish the latest Pages export.
- Hardened the GitHub Pages frontend workflow to install with legacy peer-dependency resolution, which avoids the Vite/plugin peer conflict in clean CI runs.

## What was verified
- `npm --prefix Frontend run build`
- Canonical static pages and the site shell built cleanly after the public route cleanup.
- Backend syntax checks for the widened marketplace item model and normalizer
- `git diff --check`
- Local syntax and build checks passed after the book-store source-selection fix.

## What remains
- Live deployment/cache propagation still needs a final public-site check after this route/SEO pass ships.
- Some static fallback pages intentionally mirror SPA content; if we later consolidate to one canonical route per page, we can trim the duplicates further.
- Existing listings will show stewardship and dossier details only when that data is already present.
- Future listing submissions should populate the new knowledge profile fields to make the pages fully rich.
- Claim codes still need to be shared by the current steward/owner for a transfer; the UI now exposes a dedicated management path.
- Queue-backed publish drafts still depend on the backend being reachable again before they can sync from a device that could not publish online at the time of save.
- The live public bookshelf still needs a fresh cross-device verification pass after this book-store source-selection fix deploys.
- The browser publish key needs to be stored on the device that publishes a book; without that key, the save remains local to the device and cannot be promoted to the shared shelf.
- Public book visibility now depends on the shared GitHub file being updated; if a device publishes without the key saved, the book stays local until that device is connected and resubmits with the key.
- GitHub Pages was still serving an older static snapshot while the frontend lockfile was out of sync; the lock sync should unblock the next deploy, but the live page still needs a final public refresh check.
