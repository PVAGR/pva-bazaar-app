#!/usr/bin/env node
// Normalize navigation in Frontend/pages/*.html
// Replaces common nav blocks and removes git conflict markers.
const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'Frontend', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

const canonicalNav = `
<nav class="site-nav" aria-label="Site navigation">
  <ul class="nav-links">
    <li><a href="pvadashboard.html">📊 Dashboard</a></li>
    <li><a href="productshowcase.html">🛍️ Marketplace</a></li>
    <li><a href="portfolio.html">💼 Portfolio</a></li>
    <li><a href="checkoutmint.html">💳 Checkout</a></li>
    <li><a href="provenance.html">🏷️ Provenance</a></li>
    <li><a href="artifact.html">🔍 Artifact</a></li>
  </ul>
</nav>
`;

files.forEach(file => {
  const fp = path.join(pagesDir, file);
  let s = fs.readFileSync(fp, 'utf8');

  // Remove leftover git conflict markers anywhere
  s = s.replace(/(^|\n)<<<<<<<[\s\S]*?=======([\s\S]*?)>>>>>>>.*?(\n|$)/g, (m, a, b) => `\n${b}\n`);
  s = s.replace(/<<<<<[\s\S]*?>>>/g, '');

  // Replace common nav lists (ul.nav-links) with canonical nav
  s = s.replace(/<ul[^>]*class=["']?nav-links["']?[^>]*>[\s\S]*?<\/ul>/gi, canonicalNav);

  // Replace header nav blocks (nav ... </nav>) with canonical nav if they contain links
  s = s.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, match => {
    // if nav contains href to pages, replace; otherwise keep
    if (/pvadashboard.html|productshowcase.html|portfolio.html|checkoutmint.html|provenance.html|artifact.html/i.test(match)) return canonicalNav;
    return match;
  });

  // Ensure module includes are present before </body>
  if (!/src\/nav\/inject-nav\.js/.test(s)) {
    s = s.replace(/<\/body>/i, `  <script type="module" src="/src/nav/inject-nav.js"></script>\n</body>`);
  }

  // Ensure per-page module include exists (best-effort by filename)
  const pageBase = file.replace(/\.html$/, '');
  const modulePath = `/src/pages/${pageBase}.js`;
  if (!new RegExp(modulePath.replace(/[\/.]/g, '\\$&')).test(s)) {
    // insert module include before inject-nav script
    s = s.replace(/<script type=\"module\" src=\"\/src\/nav\/inject-nav\.js\"><\/script>\n<\/body>/, `  <script type="module" src="${modulePath}"></script>\n  <script type=\"module\" src=\"/src/nav/inject-nav.js\"></script>\n</body>`);
  }

  fs.writeFileSync(fp, s, 'utf8');
  console.log('Normalized', file);
});

console.log('Done');
