# Public Content Readability

PVA Bazaar publishes a static public reading layer during the frontend build so archive entries can be discovered and read without JavaScript, authentication, or hash routing.

## Generated Sources

The generator reads:

- `archive/Archive-Entry-*.md`
- `writings/*.html`

It writes generated public output into `Frontend/public/` so Vite copies it into `Frontend/dist/` during production builds. It also mirrors the same generated metadata into `public/` for repository-level static consumers.

## Generated URLs

For every archive Markdown file, the build creates:

- `/archive/<slug>/`
- `/archive/<slug>/text.txt`
- `/archive/<slug>/index.json`

It also refreshes:

- `/archive/`
- `/archive.html`
- `/writings.html`
- `/public-content/index.json`
- `/public-content/health.html`
- `/sitemap.xml`
- `/llms.txt`
- `/readable-site.json`

The acceptance-test article is generated at:

- `https://pvabazaar.org/archive/vimana-technology/`
- `https://pvabazaar.org/archive/vimana-technology/text.txt`
- `https://pvabazaar.org/archive/vimana-technology/index.json`

## Build Integration

`Frontend/package.json` runs the generator in `prebuild`:

```sh
node ../scripts/generate-public-content.cjs
```

The root helper scripts are:

```sh
npm run content:generate
npm run content:audit
```

`content:audit` verifies that generated archive pages include real article text, have plain-text representations, and appear in the sitemap. It specifically checks that the Vimana Technology article includes expected full-text content.

## Privacy Boundary

The static generator only reads public repository files. It does not read customer data, account records, credentials, private drafts, admin-only records, or production database contents.

Backend-published books, products, suppliers, and database-backed publications still depend on their existing API/public rendering systems. This static layer repairs repository-backed archive and writing discoverability; production database-backed content should be audited separately with deployed credentials and live data access.
