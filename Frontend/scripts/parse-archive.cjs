#!/usr/bin/env node
/*
  parse-archive.cjs
  - Reads Frontend/src/data/archive_staging.md
  - Splits into sections using markdown headings and rule delimiters
  - Heuristically assigns category and tags
  - Generates entries array and writes Frontend/src/data/entries.js

  Usage: node scripts/parse-archive.cjs [--dry]
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STAGING = path.join(ROOT, 'src', 'data', 'archive_staging.md');
const OUTPUT = path.join(ROOT, 'src', 'data', 'entries.js');

const isDry = process.argv.includes('--dry');

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

function normalizeWhitespace(s) {
  return s.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[\u00A0\s]+/g, ' ').trim();
}

function splitSections(md) {
  const lines = md.split(/\n/);
  const sections = [];
  let current = [];
  let hasHeadingInCurrent = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^\s*#{1,6}\s+/.test(line);
    const isRule = /^\s*[-]{3,}\s*$/.test(line); // horizontal rule (---)

    if (isHeading) {
      if (current.length) {
        sections.push(current.join('\n').trim());
        current = [];
        hasHeadingInCurrent = false;
      }
      hasHeadingInCurrent = true;
      current.push(line);
      continue;
    }

    if (isRule) {
      // Split on rules only if we are NOT inside a titled section yet
      if (current.length && !hasHeadingInCurrent) {
        sections.push(current.join('\n').trim());
        current = [];
        hasHeadingInCurrent = false;
        continue;
      }
      // keep rule line to render as <hr/>
      current.push(line);
      continue;
    }

    current.push(line);
  }
  if (current.length) sections.push(current.join('\n').trim());

  // Filter out empty
  return sections.map(s => s.trim()).filter(Boolean);
}

function firstHeading(text) {
  const m = text.match(/^\s*#{1,6}\s+(.+)$/m);
  if (m) return m[1].trim();
  // fallback to first non-empty line
  const firstLine = text.split(/\n/).find(l => l.trim());
  return firstLine ? firstLine.replace(/^"\s*/, '').trim() : 'Untitled';
}

function stripMarkdown(md) {
  return md
    .replace(/^\s*```[\s\S]*?```\s*$/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function mdToHtml(md) {
  let html = md;
  // code blocks (strip for now)
  html = html.replace(/^```([\s\S]*?)```$/gm, (m, code) => `<pre><code>${escapeHtml(code)}</code></pre>`);
  // headings
  for (let h = 6; h >= 1; h--) {
    const re = new RegExp(`^${'#'.repeat(h)}\\s+(.+)$`, 'gm');
    html = html.replace(re, (_m, t) => `<h${h}>${escapeHtml(t)}</h${h}>`);
  }
  // horizontal rules
  html = html.replace(/^[-]{3,}\s*$/gm, '<hr/>');
  // bold/italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // links
  html = html.replace(/\[(.*?)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // lists
  html = html.replace(/^(\s*)[-*·]\s+(.+)$/gm, '$1<li>$2</li>');
  html = html.replace(/(<li>[^]+?<\/li>)(?!\n<li>)/g, '<ul>$1</ul>');
  // paragraphs
  html = html
    .split(/\n{2,}/)
    .map(block => {
      if (/^<h\d|^<ul>|^<pre>/.test(block)) return block;
      const trimmed = block.trim();
      if (!trimmed) return '';
      return `<p>${escapeHtmlInline(trimmed)}</p>`;
    })
    .join('\n');

  return html;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeHtmlInline(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function guessCategory(title, text) {
  const t = (title + ' ' + text).toLowerCase();
  // novel / chapters
  if (/\b(prologue|chapter\s*\d+|chapter\b)/i.test(title)) return 'novel';
  if (/\bautobiography\b/.test(t)) return 'memoir';
  if (/\bmanifesto\b|pva manifesto/.test(t)) return 'vision';
  if (/the thread that blinks|trans-dimensional rescues|catalog of trans-dimensional/.test(t)) return 'research';
  if (/dedication|in memoriam|truth tellers/.test(t)) return 'notes';
  if (/(pva trust engine|schema|certificate|ipfs|nft|blockchain|airtable|zapier|make|openzeppelin)/.test(t)) return 'research';
  if (/(akashic|asha|druj|zoroastrian|default mode network|dmn|meditation|gateway)/.test(t)) return 'philosophy';
  if (/(nutrition|eating|caloric|fast|alkaline)/.test(t)) return 'wellness';
  if (/(infinite jobs|kiosk|memory|restoration|watch|garden|ocean|terraform|perfume|clock)/.test(t)) return 'vision';
  if (/(magnum opus|renewal civilization|phase 1|phase 2|phase 3|phase 4|dao)/.test(t)) return 'vision';
  if (/(books|corpus hermeticum|my inventions|schopenhauer|tagore|tesla|turing)/.test(t)) return 'notes';
  if (/(asha gods children|people|list|whistleblower|activist|prophet)/.test(t)) return 'notes';
  return 'journal';
}

function extractTags(text) {
  const tags = new Set();
  const t = text.toLowerCase();
  const candidates = [
    ['ipfs','ipfs'], ['nft','nft'], ['blockchain','blockchain'], ['certificate','certificate'],
    ['akashic','akashic'], ['asha','asha'], ['druj','druj'], ['zoroastrian','zoroastrian'],
    ['meditation','meditation'], ['dmn','dmn'], ['nutrition','nutrition'], ['fast','fasting'],
    ['kiosk','kiosk'], ['printing','printing'], ['garden','garden'], ['airship','airship'],
    ['dao','dao'], ['zapier','zapier'], ['airtable','airtable'], ['etherscan','etherscan'],
    ['polygon','polygon'], ['openzeppelin','openzeppelin'], ['provenance','provenance'], ['gemstone','gemstone'],
    // novel/world tags
    ['ark','ark'], ['taured','taured'], ['augmentation','augmentation'], ['implant','implant'],
    ['extraction','extraction'], ['monastery','monastery'], ['alliance','alliance'], ['vimana','vimana'],
    ['barcelona','barcelona'], ['morrison','morrison'], ['beaumont','beaumont'], ['scan','scan'],
    // travel and symbolism
    ['travel','travel'], ['pilgrimage','pilgrimage'], ['pineal','pineal'], ['pinecone','pinecone'],
    // language concept
    ['aetherzamin','aetherzamin'], ['language','language']
  ];
  for (const [kw, tag] of candidates) {
    if (t.includes(kw)) tags.add(tag);
  }
  // crude hashtag capture
  const hashMatches = text.match(/#([a-z0-9\-]+)/gi);
  if (hashMatches) hashMatches.forEach(h => tags.add(h.replace('#','').toLowerCase()));
  return Array.from(tags).slice(0, 12);
}

function makeExcerpt(text, wordLimit = 50) {
  const clean = normalizeWhitespace(stripMarkdown(text));
  const words = clean.split(/\s+/).slice(0, wordLimit);
  return words.join(' ') + (words.length >= wordLimit ? '…' : '');
}

function buildId(prefix, index) {
  const n = String(index + 1).padStart(3, '0');
  return `${prefix}-${n}`;
}

function main() {
  if (!fs.existsSync(STAGING)) {
    console.error('Staging file not found:', STAGING);
    process.exit(1);
  }
  const raw = readFile(STAGING);
  const sections = splitSections(raw);
  const entries = [];
  const today = new Date();
  const iso = today.toISOString().slice(0,10); // YYYY-MM-DD

  sections.forEach((sec, i) => {
    const title = firstHeading(sec);
    const category = guessCategory(title, sec);
    const tags = extractTags(sec);
    const excerpt = makeExcerpt(sec, 60);
    const contentHtml = mdToHtml(sec);
    const id = buildId('PVA-ARCHIVE', i);
    const entry = {
      id,
      title,
      date: iso,
      location: '',
      category,
      tags,
      excerpt,
      contentHtml
    };
    entries.push(entry);
  });

  const js = `// Auto-generated by scripts/parse-archive.cjs\n// Source: src/data/archive_staging.md\n(function(){\n  window.JOURNAL_ENTRIES = ${JSON.stringify(entries, null, 2)};\n})();\n`;

  if (isDry) {
    process.stdout.write(js);
    return;
  }

  writeFile(OUTPUT, js);
  console.log(`Wrote ${entries.length} entries to ${path.relative(ROOT, OUTPUT)}`);
}

main();
