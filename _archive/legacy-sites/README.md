# Legacy site snapshots

The directories below were moved here to prevent them from being served or built while keeping their contents intact:

- `frontend-site/` (previous static site copy)
- `public-site/` (static root copy, including legacy/public/public variants)
- `apps/web-org/` (archived org static site)
- `pva-bazaar-app/Frontend/` (nested duplicate of the main Frontend)

The canonical live frontend is `Frontend/` (Vite app). Missing writings from the archives were copied into `Frontend/writings` so they ship in the live build. Merge any other content you need from these snapshots into `Frontend/` before deploying. Do not serve or build these archived copies.
