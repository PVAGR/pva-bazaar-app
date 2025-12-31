# pvabazaar.org — Journal Frontend

A modern, clean personal journal site built within the existing Frontend setup. No changes to `vite.config.js`, build output remains `dist/`.

## Setup

```bash
cd Frontend
npm install
npm run dev
# open http://localhost:3000
```

Build:
```bash
npm run build
# Output: Frontend/dist/
```

## Project Structure (added files)
- Frontend/index.html — SPA shell (CDN React + Router)
- Frontend/public/app.js — App with routes and components
- Frontend/public/styles/*.css — Namespaced, module-like styles
- Frontend/src/data/entries.js — Entries data array (copied to dist/src)

## Adding Entries
Edit `Frontend/src/data/entries.js` and append to `window.JOURNAL_ENTRIES` array using:
```js
{
  id: 4,
  title: "Title",
  date: "YYYY-MM-DD",
  location: "City, Country",
  category: "personal|travel|reflection|...",
  tags: ["tag1", "tag2"],
  excerpt: "One or two sentences…",
  content: "<p>Full HTML or markdown converted to HTML.</p>"
}
```
- Keep `id` unique.
- Dates should be ISO `YYYY-MM-DD` for sorting.
- `content` supports basic HTML.

## Pages
- Home — hero, CTA
- Journal — list with filters (category, tag, query)
- Entry — full entry + prev/next
- Archive — grouped by year
- About — purpose and optional contact
- Search — real-time results with highlight

## Accessibility & Performance
- Semantic tags and ARIA labels on nav and buttons.
- HashRouter avoids server rewrites; fast load via CDN React.
- Minimal scripting; styles are responsive at 320/768/1024/1920.
- Highlight uses `<mark>` and preserves screen reader flow.

## Testing Checklist
- Navigation works across pages on mobile and desktop.
- Search highlights and links to entry detail.
- Filters narrow results correctly.
- Theme toggle persists and is accessible.
- Layout readable at 320px, 768px, 1024px, 1920px.
- Build copies `index.html`, `public/`, and `src/` into `dist/`.

## Browser Compatibility
- Modern evergreen browsers (Chrome, Edge, Firefox, Safari).
- No legacy IE support.
- Hash routing ensures GitHub Pages compatibility.

## Notes
- We did not modify `vite.config.js` or deploy config.
- Static copying scripts remain intact.
- If you need true CSS Modules later, we can refactor to bundled JSX and adjust copy logic, but this design intentionally avoids altering build pipeline.
