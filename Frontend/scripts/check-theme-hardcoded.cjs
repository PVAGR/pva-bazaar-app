const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
const includeExtensions = new Set(['.css', '.scss', '.less', '.js', '.jsx', '.ts', '.tsx']);

const fileAllowList = new Set([path.normalize('styles/magnum-opus.css')]);

const forbiddenRegex = /background(?:-color)?\s*:\s*(?:#fff\b|#f[0-9a-fA-F]{2,5}\b|white\b)/i;

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (includeExtensions.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectViolations() {
  const files = walk(root);
  const violations = [];

  for (const filePath of files) {
    const relative = path.relative(root, filePath).replace(/\\/g, '/');
    if (fileAllowList.has(path.normalize(relative))) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (forbiddenRegex.test(line)) {
        violations.push({
          file: `src/${relative}`,
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }

  return violations;
}

const violations = collectViolations();

if (violations.length > 0) {
  console.error('\nTheme guard failed: hardcoded light background values detected.');
  console.error('Use --site-* tokens from src/base.css instead.\n');
  for (const v of violations) {
    console.error(`${v.file}:${v.line} -> ${v.text}`);
  }
  process.exit(1);
}

console.log('Theme guard passed: no hardcoded light background values in src/.');
