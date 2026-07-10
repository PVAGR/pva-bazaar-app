# Current Status

Updated: 2026-07-10

## What changed
- Added a dedicated institutional hub with pages for universities, schools, museums, government, research institutes, laboratories, libraries, NGOs, training centers, and TVETs.
- Added richer marketplace item dossiers so listings can show history, scientific classification, uses, educational value, safety, documentation, and application context.
- Expanded the listing flow to capture the new knowledge-profile fields.
- Synced public route metadata so the new hub is visible to crawlers and site discovery tools.
- Added perennial listing stewardship so a user can claim an existing listing, manage it, and keep the item record going instead of starting over.

## What was verified
- `npm --prefix Frontend run build`
- Backend syntax checks for the widened marketplace item model and normalizer

## What remains
- Existing listings will show stewardship and dossier details only when that data is already present.
- Future listing submissions should populate the new knowledge profile fields to make the pages fully rich.
- Claim codes still need to be shared by the current steward/owner for a transfer; the UI now exposes a dedicated management path.
