const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const staticRoots = ['home.html', 'novel', 'research', 'writings'];
const includeExtensions = new Set(['.html']);

const pattern = /background(?:-color)?\s*:\s*(?:white\b|#fff\b|#f[0-9a-fA-F]{2,5}\b)/i;

function walk(targetPath, files = []) {
  const fullPath = path.join(root, targetPath);
  if (!fs.existsSync(fullPath)) return files;

  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (includeExtensions.has(path.extname(fullPath).toLowerCase())) files.push(fullPath);
    return files;
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      if (['dist', 'node_modules', '_archive'].includes(entry.name)) continue;
      walk(path.relative(root, child), files);
      continue;
    }
    if (includeExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(child);
    }
  }

  return files;
}

function runAudit() {
  const files = staticRoots.flatMap((p) => walk(p));
  const results = [];

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        results.push({ file: rel, line: index + 1, text: line.trim() });
      }
    });
  }

  return results;
}

const findings = runAudit();

if (findings.length === 0) {
  console.log('Static audit passed: no hardcoded light backgrounds found.');
  process.exit(0);
}

console.log('\nStatic audit report: hardcoded light backgrounds found in static HTML content.\n');
for (const item of findings) {
  console.log(`${item.file}:${item.line} -> ${item.text}`);
}
console.log(`\nTotal findings: ${findings.length}`);
console.log('Run this audit after each migration pass to track remaining static-page cleanup.');
