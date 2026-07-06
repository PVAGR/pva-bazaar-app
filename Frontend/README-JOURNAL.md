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
- Frontend/public/styles/\*.css — Namespaced, module-like styles
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

## Runtime API Base Config

- File: `Frontend/public/api-base.json`
- Structure:

```json
{
  "base": "https://your-backend.example.com"
}
```

- Behavior:
  - On startup, the app fetches `/public/api-base.json`.
  - If `base` is non-empty and no local override exists, it saves to `localStorage("api:base")`.
  - All API calls use `apiFetch()` which respects this base.

- Overrides:
  - Admin page includes an “API Base” input to set/clear at runtime.
  - A value in localStorage takes precedence over the JSON file.

- CORS:
  - Ensure your backend allows `Origin: https://pvabazaar.org` (and subpaths) in production.
  - Include `Access-Control-Allow-Origin` and credentials rules as needed.

## Admin Diagnostics

- Open the Admin page and use:
  - "API Base" to set the backend base URL.
  - "Check API Health" to call `/api/health`:
    - Shows HTTP status and whether the call succeeded.
    - Displays `Access-Control-Allow-Origin` header if available.
  - "Check Admin Status" to verify admin endpoint access.
  - "Check Blogs" to fetch `/api/blogs` and display item count and HTTP status.
  - "Check Artifacts" to fetch `/api/artifacts` and display item count and HTTP status.

- If the health request fails immediately, it’s likely a CORS block. Confirm backend allows `https://pvabazaar.org` and `https://www.pvabazaar.org`.

- Deploy Notes:
  - Update the JSON file in the repo and redeploy.
  - Alternatively, set via Admin UI without redeploy for quick testing.
