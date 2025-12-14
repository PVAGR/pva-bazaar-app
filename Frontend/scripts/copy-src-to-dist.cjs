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
['writings', 'biography', 'novel', 'research'].forEach(dir => {
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

['main.css','i'].forEach(name => {
  const s = path.join(projectRoot, name);
  const d = path.join(projectRoot, 'dist', name);
  if (fs.existsSync(s)) {
    copyRecursive(s, d);
    console.log('Copied', s, '->', d);
  }
});

// Also copy repository-level public/ so runtime assets (css/js) are available
const repoPublicSrc = path.join(projectRoot, '..', 'public');
const repoPublicDest = path.join(projectRoot, 'dist', 'public');
if (fs.existsSync(repoPublicSrc)) {
  console.log('Copying repo public', repoPublicSrc, '->', repoPublicDest);
  copyRecursive(repoPublicSrc, repoPublicDest);
  console.log('Copied repo public to dist');
} else {
  // try sibling public inside same folder
  const alt = path.join(projectRoot, 'public');
  if (fs.existsSync(alt)) {
    console.log('Copying local public', alt, '->', path.join(projectRoot, 'dist', 'public'));
    copyRecursive(alt, path.join(projectRoot, 'dist', 'public'));
    console.log('Copied local public to dist');
  }
}
