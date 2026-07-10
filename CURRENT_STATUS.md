# Current Status

Updated: 2026-07-10

## What changed
- Added a dedicated institutional hub with pages for universities, schools, museums, government, research institutes, laboratories, libraries, NGOs, training centers, and TVETs.
- Added richer marketplace item dossiers so listings can show history, scientific classification, uses, educational value, safety, documentation, and application context.
- Expanded the listing flow to capture the new knowledge-profile fields.
- Synced public route metadata so the new hub is visible to crawlers and site discovery tools.

## What was verified
- `npm --prefix Frontend run build`
- Backend syntax checks for the widened marketplace item model and normalizer

## What remains
- Existing listings will only show the new dossier fields where data is already present.
- Future listing submissions should populate the new knowledge profile fields to make the pages fully rich.

