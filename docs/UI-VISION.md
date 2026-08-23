# PVA Bazaar - UI Vision

One page that says what every part of the site offers and how it should look doing it.
Grounded in `Frontend/src/config/publicRoutes.js` (routes/promises) and `Frontend/src/base.css` (tokens).
If a page disagrees with this doc, fix the page.

---

## 1. The one idea

**PVA Bazaar is "The Living Bazaar" - a marketplace where every object carries memory.**

Three layers, one look:

| Layer | Feeling | Where you see it |
|---|---|---|
| Commerce | warm bazaar light | Marketplace, Cart, Checkout |
| Knowledge | lamplight archive | Archive, Writings, Books |
| Trust | stamped and sealed | Verification, Provenance, Partnerships |

## 2. Design language (canonical)

The repo currently ships two identities: navy/cyan defaults in `base.css` and the enforced
green/gold brand tokens (husky `qa:brand:check`). This resolves the conflict:

**Forest green + gold + ivory wins. Navy/cyan is legacy and gets migrated.**

### Palette (single source of truth -> promote to `:root` tokens)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0f3b2d` | page background (deep forest) |
| `--bg-raised` | `#14503e` | panels/cards |
| `--line` | `#1c5a45` | hairlines, borders |
| `--gold` | `#d4af37` | accent: CTAs, badges, seals |
| `--mint` | `#4ef8a3` | success/live indicators only |
| `--ink` | `#e8f4f0` | primary text (ivory) |
| `--ink-muted` | `#a8b0b9` | secondary text |

### Type

- Display / lore: **Merriweather** serif (already loaded) - headings, pull quotes, archive titles
- UI / body: **Open Sans** - nav, buttons, body copy
- Mono: system mono - hashes, provenance data, verification output

### Rules

1. One accent per screen: gold. Mint appears only for "live/verified" states.
2. Cards: raised green panel, 14px radius, 1px `--line` border, generous padding. No drop shadows heavier than `0 6px 24px rgba(0,0,0,.25)`.
3. Every section answers three questions above the fold: **What is this? What can I do here? Why here?**
4. Photography: real objects, warm light, no stock-smiles. Illustration: none yet - keep it typographic.
5. Motion: fade/rise 200ms on load, nothing else. No parallax.

## 3. Shared pattern: the Section Intro

Every top-level page opens with the same block (component: `src/components/SectionIntro.jsx`):

```
[gold badge: SECTION NAME]        <- eyebrow
Merriweather H1: the promise      <- e.g. "Objects that carry their story"
One sentence: what you can do here
[primary CTA]  [secondary link]
```

## 4. Section-by-section

### CORE

#### Home `/`
- **Offer:** the whole bazaar in one glance: trade, knowledge, partnership.
- **Layout:** hero (promise + search/CTA) -> six section cards (from HOME_CORE_ROUTES) -> live feed strip (books, entries, items) -> support band (get started, referral).
- **Direction:** hero uses largest Merriweather type on site; cards use Section Intro colors; feed rows are compact ledger-style rows.

#### Marketplace `/marketplace`
- **Offer:** real goods, kits, specimens - each listing carries provenance and knowledge profile (history, classification, uses, safety).
- **CTA:** Browse listings / List an item
- **Direction:** ivory product cards on raised panels; price + provenance chip always visible; filters as left rail on desktop.
- **Done 2026-08-23:** cards now render price (from `priceCents`, already in the list payload)
  and a "Provenance" chip linking to `/verification?q=<slug|id>` when provenance documentation
  exists.

#### Archive Library `/archive`
- **Offer:** the living archive - civilization dossiers, pure life knowledge, long-form cultural context.
- **CTA:** Read the archive / Search entries
- **Direction:** most "lamplight" surface: parchment-tinted panels allowed here, serif everything, entry cards read like index cards (title, era tag, one-line summary).

#### Writings `/writings`
- **Offer:** essays and notes - the personal canon behind the project.
- **CTA:** Start reading
- **Direction:** editorial single column, max 68ch, drop cap on first paragraph; writings list = table of contents, not cards.

#### Books `/books`
- **Offer:** publish and read long-form works (web reader, PDF, EPUB).
- **CTA:** Open the shelf / Publish a book
- **Direction:** shelf metaphor - covers as spines/faces on wood-toned panel; reader page strips chrome to paper-white content area.

#### Partnerships `/partnerships`
- **Offer:** supplier + institutional pathways (schools, museums, labs, NGOs).
- **CTA:** Propose a partnership
- **Direction:** institutional trust band - credentials, process steps (1-2-3), formal tone, minimal color, gold rule lines.

### SUPPORT

| Page | Offer | CTA | Note |
|---|---|---|---|
| About `/about` | why this exists | Read the mission | timeline strip |
| Contact `/contact` | reach humans by lane | Send message | 3 lanes: trade / institution / support |
| Get Started `/get-started` | join with a role | Create account | role picker: buyer, supplier, artisan, researcher, contributor |
| Partner Program `/partners` | join maker network | Apply | application checklist |
| Referral `/referral` | earn 10% kickback | Get my code | code card with copy button |

### TOOLING (signed-in / utility)

| Surface | Offer | Direction |
|---|---|---|
| Dashboard `/account` | your orders, listings, deals | command-center: stat chips + action cards |
| Seller/Creator portals | manage shop, payouts | dense tables, gold row highlights |
| Verification `/verification` | check any artifact's chain | mono hash blocks, mint VERIFIED seal |
| Cart/Checkout | buy with confidence | progress steps, provenance summary beside payment |
| HeelKawn `/heelkawn` | companion app download | dark device mockup, QR |
| Status/Legal pages | trust in plain words | quiet typography, no marketing |

> Built 2026-08-23: `/verification` page now exists (artifact/slug/certificate lookup with
> seal + hash panel), linked from marketplace provenance chips and the home support band.

## 5. Rollout order

1. **Foundation** (done 2026-08-23): tokens promoted via `styles/vision.css`, `SectionIntro` component shipped.
2. **Home** (done 2026-08-23): hero + door grid + live strip + support band.
3. **Marketplace + Archive** (done 2026-08-23): SectionIntro on Marketplace; serif card/entry typography,
   gold category + active states, clamped descriptions, paper-style reader panel. Price/provenance
   chips pending backend field exposure.
4. **Writings + Books** (done 2026-08-23): Books opens with SectionIntro; serif shelf typography.
5. **Partnerships + Get Started** (done 2026-08-23): SectionIntro on both; gold chips; signup panel
   styled as raised card with gold focus states.
6. Legacy migration: replace navy/cyan values across remaining pages; delete dead overrides.

**Acceptance per section:** passes `qa:brand:check`, answers What/do/why above fold, one accent,
loads < 2s on 3G, keyboard navigable, mobile 360px clean.
