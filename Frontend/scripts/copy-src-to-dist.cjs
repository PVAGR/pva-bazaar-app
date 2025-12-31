const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');
const destDir = path.join(projectRoot, 'dist', 'src');

console.log('Copying', srcDir, '->', destDir);
copyRecursive(srcDir, destDir);
console.log('Copy complete');

// Also copy static pages and top-level static files so they exist in dist for deployment
const pagesSrc = path.join(projectRoot, 'pages');
const pagesDest = path.join(projectRoot, 'dist', 'pages');
console.log('Copying', pagesSrc, '->', pagesDest);
copyRecursive(pagesSrc, pagesDest);
console.log('Pages copy complete');

// Copy all static HTML directories (CRITICAL FOR WRITINGS!)
['writings', 'biography', 'novel', 'research'].forEach((dir) => {
  const s = path.join(projectRoot, dir);
  const d = path.join(projectRoot, 'dist', dir);
  if (fs.existsSync(s)) {
    console.log('Copying', s, '->', d);
    copyRecursive(s, d);
    console.log(`Copied ${dir}/ to dist`);
  } else {
    console.warn(`WARNING: ${dir} folder not found at ${s}`);
  }
});

// Copy a few common top-level static files (if present)
// CRITICAL: Force copy index.html to ensure root page works
const indexSrc = path.join(projectRoot, 'index.html');
const indexDest = path.join(projectRoot, 'dist', 'index.html');
if (fs.existsSync(indexSrc)) {
  fs.copyFileSync(indexSrc, indexDest);
  console.log('FORCE COPIED index.html to dist (overwriting any vite-generated file)');
} else {
  console.error('ERROR: index.html not found at', indexSrc);
}

['main.css', 'i'].forEach((name) => {
  const s = path.join(projectRoot, name);
  const d = path.join(projectRoot, 'dist', name);
  if (fs.existsSync(s)) {
    copyRecursive(s, d);
    console.log('Copied', s, '->', d);
  }
});

// Ensure status.html is available at the root
const statusSrc = path.join(projectRoot, 'status.html');
const statusDest = path.join(projectRoot, 'dist', 'status.html');
if (fs.existsSync(statusSrc)) {
  fs.copyFileSync(statusSrc, statusDest);
  console.log('COPIED status.html to dist');
} else {
  console.warn('WARNING: status.html not found at', statusSrc);
}

// Ensure SPA routing works on GitHub Pages by providing a 404 fallback
const fallback404Src = path.join(projectRoot, '404.html');
const fallback404Dest = path.join(projectRoot, 'dist', '404.html');
if (fs.existsSync(fallback404Src)) {
  fs.copyFileSync(fallback404Src, fallback404Dest);
  console.log('COPIED 404.html to dist');
} else {
  // If a custom 404.html does not exist, mirror index.html for client-side routing
  try {
    fs.copyFileSync(indexSrc, fallback404Dest);
    console.log('CREATED 404.html fallback by mirroring index.html');
  } catch (e) {
    console.warn('WARNING: could not create 404.html fallback', e);
  }
}

// Copy both local Frontend/public and repository-level public into dist/public
const distPublic = path.join(projectRoot, 'dist', 'public');
const localPublic = path.join(projectRoot, 'public');
if (fs.existsSync(localPublic)) {
  console.log('Copying local public', localPublic, '->', distPublic);
  copyRecursive(localPublic, distPublic);
  console.log('Copied local public to dist');
}
const repoPublicSrc = path.join(projectRoot, '..', 'public');
if (fs.existsSync(repoPublicSrc)) {
  console.log('Merging repo public', repoPublicSrc, '->', distPublic);
  copyRecursive(repoPublicSrc, distPublic);
  console.log('Merged repo public to dist');
}

// Copy organization static pages (apps/web-org) into public/org
const webOrgRoot = path.join(projectRoot, '..', 'apps', 'web-org');
const webOrgDist = path.join(webOrgRoot, 'dist');
const webOrgDest = path.join(distPublic, 'org');
if (fs.existsSync(webOrgDist)) {
  console.log('Copying apps/web-org/dist', webOrgDist, '->', webOrgDest);
  copyRecursive(webOrgDist, webOrgDest);
  console.log('Copied apps/web-org/dist to dist/public/org');
} else if (fs.existsSync(webOrgRoot)) {
  console.log('Copying apps/web-org (no dist found)', webOrgRoot, '->', webOrgDest);
  copyRecursive(webOrgRoot, webOrgDest);
  console.log('Copied apps/web-org (source) to dist/public/org');
}

// Copy marketplace build (apps/web-com) into public/market (and keep /com for backward-compat)
const webComRoot = path.join(projectRoot, '..', 'apps', 'web-com');
const webComDist = path.join(webComRoot, 'dist');
const webComDestCom = path.join(distPublic, 'com');
const webComDestMarket = path.join(distPublic, 'market');
if (fs.existsSync(webComDist)) {
  console.log('Copying apps/web-com/dist', webComDist, '->', webComDestMarket);
  copyRecursive(webComDist, webComDestMarket);
  console.log('Copied apps/web-com/dist to dist/public/market');
  // also mirror to /com for any existing links
  console.log('Mirroring apps/web-com/dist', webComDist, '->', webComDestCom);
  copyRecursive(webComDist, webComDestCom);
  console.log('Copied apps/web-com/dist to dist/public/com');
} else if (fs.existsSync(webComRoot)) {
  console.log('Copying apps/web-com (no dist found)', webComRoot, '->', webComDestMarket);
  copyRecursive(webComRoot, webComDestMarket);
  console.log('Copied apps/web-com (source) to dist/public/market');
  console.log('Mirroring apps/web-com (no dist found)', webComRoot, '->', webComDestCom);
  copyRecursive(webComRoot, webComDestCom);
  console.log('Copied apps/web-com (source) to dist/public/com');
}
