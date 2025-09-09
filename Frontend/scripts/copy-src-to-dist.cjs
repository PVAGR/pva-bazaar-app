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

// Copy a few common top-level static files (if present)
['index.html','main.css','i'].forEach(name => {
  const s = path.join(projectRoot, name);
  const d = path.join(projectRoot, 'dist', name);
  if (fs.existsSync(s)) {
    copyRecursive(s, d);
    console.log('Copied', s, '->', d);
  }
});
