# Prompt: Optimize and Verify GitHub Pages Deployment for pvabazaar.org

You are a senior web infrastructure + frontend + SEO engineer. Act as a meticulous, step-by-step pair programmer. Your goal is to harden, verify, and optimize the static site deployment of pvabazaar.org, which is published via GitHub Pages from a Vite-based Frontend in this repository.

## Context
- Repo: PVAGR/pva-bazaar-app
- Frontend stack: Vite v5, static content with custom copy step
- Frontend root: Frontend
- Build: Node.js 18, npm ci, then npm run build in Frontend
- Deploy target: GitHub Pages via Actions workflow
- Custom domain: pvabazaar.org (not a github.io subdirectory)
- Vite config: base should be "/" and existing build settings must be preserved
- Current workflow file: .github/workflows/deploy.yml (build + deploy jobs; permissions include pages: write, contents: read, id-token: write)

## Objectives
1. Confirm GitHub Pages workflow correctness and reliability for Frontend.
2. Ensure Vite configuration uses base: "/" and does not break existing build steps.
3. Optimize site delivery for Pages: canonical tags, robots.txt, sitemap.xml, 404.html, link hygiene.
4. Provide minimal, production-safe changes with exact file edits and commands.

## Constraints
- Do not introduce breaking changes to the Frontend build pipeline or the copy plugin behavior already present in Frontend/scripts.
- Preserve existing directory structure and static file copying (writings, biography, novel, research, public, etc.).
- Keep Vite build settings intact; only add base: "/" if missing.
- Use Node 18 and npm ci in CI. Build from Frontend directory.

## What to Return
Provide all of the following:
1. A short validation summary (why the current setup works or where it fails).
2. Exact patch-style edits for files in this repo to implement your recommendations. Use unified diffs with file paths relative to repo root (so I can apply them cleanly).
3. Shell commands to run locally and in CI to verify the build and deployment.
4. A concise checklist for post-deploy verification (links, SEO, accessibility, performance).

## Areas to Improve (make precise, minimal edits)
- Vite config: ensure base: "/" is set and existing build options remain unchanged in Frontend/vite.config.js.
- Workflow: confirm .github/workflows/deploy.yml includes:
  - Node.js v18; npm ci; npm run build with working-directory: Frontend
  - Upload Frontend/dist artifact
  - Write CNAME with pvabazaar.org into dist/ before upload
  - Deploy via actions/deploy-pages@v4
  - Permissions: pages: write, contents: read, id-token: write
  - Concurrency group pages
- Add Frontend/public/robots.txt if missing (allow all, point to sitemap).
- Add Frontend/public/sitemap.xml (basic sitemap covering key static pages).
- Add Frontend/public/404.html (simple branded 404 page for GitHub Pages).
- In Frontend/index.html, add canonical link, meta description, and ensure critical CSS/JS references are correct under base: "/".

## Verification Steps (return these as commands)
- cd Frontend
- npm ci
- npm run build
- npx linkinator dist --skip ".*(assets|node_modules).*" (optional link check)
- tree dist | head -n 100 (optional artifact inspection)

## Post-Deploy Checklist
- Site responds 200 at https://pvabazaar.org
- Canonical tag points to https://pvabazaar.org/
- robots.txt is served and references sitemap.xml
- sitemap.xml includes index and key content pages
- 404 page loads on unknown paths
- No broken internal links (linkinator or similar passes)
- Basic accessibility (headings, alt text) looks reasonable

## Style of Changes
- Keep diffs minimal and targeted.
- Do not reformat unrelated files or change filenames unless necessary.
- Preserve existing plugin logic and directory copying.

## Example Output Structure
1) Summary
2) Patches (unified diffs):
   - Frontend/vite.config.js
   - .github/workflows/deploy.yml (only if you found needed improvements)
   - Frontend/public/robots.txt (new)
   - Frontend/public/sitemap.xml (new)
   - Frontend/public/404.html (new)
   - Frontend/index.html (meta additions)
3) Commands to build/test
4) Post-deploy checklist

Be decisive: if something is missing, add it. If something is wrong, fix it with the smallest safe change and show the exact diff.
