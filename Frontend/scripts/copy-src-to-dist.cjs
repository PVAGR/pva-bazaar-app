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
// IMPORTANT: keep Vite-generated index.html intact to avoid breaking bundled assets
const indexSrc = path.join(projectRoot, 'index.html');
const distIndex = path.join(projectRoot, 'dist', 'index.html');
if (fs.existsSync(distIndex)) {
  console.log('Keeping Vite-generated index.html (not overwritten)');
} else if (fs.existsSync(indexSrc)) {
  fs.copyFileSync(indexSrc, distIndex);
  console.log('Copied source index.html to dist because Vite output was missing');
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

// Copy magnum-opus.html to dist
const magnumOpusSrc = path.join(projectRoot, 'magnum-opus.html');
const magnumOpusDest = path.join(projectRoot, 'dist', 'magnum-opus.html');
if (fs.existsSync(magnumOpusSrc)) {
  fs.copyFileSync(magnumOpusSrc, magnumOpusDest);
  console.log('COPIED magnum-opus.html to dist');
} else {
  console.warn('WARNING: magnum-opus.html not found at', magnumOpusSrc);
}

// Ensure SPA routing works on GitHub Pages by providing a 404 fallback
const fallback404Src = path.join(projectRoot, '404.html');
const fallback404Dest = path.join(projectRoot, 'dist', '404.html');
if (fs.existsSync(fallback404Src)) {
  fs.copyFileSync(fallback404Src, fallback404Dest);
  console.log('COPIED 404.html to dist');
} else if (fs.existsSync(distIndex)) {
  // Mirror the built index for client-side routing fallbacks
  try {
    fs.copyFileSync(distIndex, fallback404Dest);
    console.log('CREATED 404.html fallback by mirroring built index.html');
  } catch (e) {
    console.warn('WARNING: could not create 404.html fallback from built index', e);
  }
} else {
  console.warn('WARNING: 404.html fallback skipped (no source or built index found)');
}

// Copy only whitelisted assets from Frontend/public into dist/public
const distPublic = path.join(projectRoot, 'dist', 'public');
const localPublic = path.join(projectRoot, 'public');
if (fs.existsSync(localPublic)) {
  console.log('Preparing dist/public');
  if (!fs.existsSync(distPublic)) fs.mkdirSync(distPublic, { recursive: true });
  const whitelistFiles = ['app.js', 'config.js', 'sitemap.xml', 'robots.txt', 'status.html', 'api-base.json', 'magnum-opus.js'];
  const whitelistDirs = ['styles'];
  for (const f of whitelistFiles) {
    const s = path.join(localPublic, f);
    const d = path.join(distPublic, f);
    if (fs.existsSync(s)) {
      const dir = path.dirname(d);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(s, d);
      console.log('Copied file', s, '->', d);
    }
  }
  for (const dname of whitelistDirs) {
    const sdir = path.join(localPublic, dname);
    const ddir = path.join(distPublic, dname);
    if (fs.existsSync(sdir)) {
      console.log('Copying directory', sdir, '->', ddir);
      copyRecursive(sdir, ddir);
      console.log('Copied directory', dname);
    }
  }
}

// Skip copying organization/marketplace apps to ensure journal-only deploy
