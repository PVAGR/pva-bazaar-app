# Blueprint v1 Architecture & Data Flow

Use this as the system layout reference.
The canonical live routing map is `Frontend/public/live-map.json`.
If a doc disagrees with that map, the map wins.

## Live continuity map

| Surface          | Canonical URL                         |
| ---------------- | ------------------------------------- |
| Frontend         | https://pvabazaar.org                 |
| Backend          | https://api.pvabazaar.org             |
| API base         | https://api.pvabazaar.org/api         |
| Status page      | https://pvabazaar.org/status.html     |
| Fallback backend | https://pva-bazaar-app-1.onrender.com |

## System overview

- Public UI: `Frontend/`
- Static live site: GitHub Pages
- API/backend: Vercel
- Live routing data: `Frontend/public/live-map.json`
- Status and verification pages: `status.html`, `llms.txt`, `readable-site.json`, `sitemap.xml`

## Operational rule

Keep the frontend, backend, and live map in sync.
Do not add new entry points without updating the live map and the runbook.
