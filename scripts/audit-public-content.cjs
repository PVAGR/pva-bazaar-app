#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'Frontend', 'public');
const indexPath = path.join(publicRoot, 'public-content', 'index.json');
const sitemapPath = path.join(publicRoot, 'sitemap.xml');

function fail(message) {
  console.error(`public-content audit failed: ${message}`);
  process.exitCode = 1;
}

function stripHtml(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

if (!fs.existsSync(indexPath)) {
  fail(`missing ${path.relative(repoRoot, indexPath)}`);
  process.exit();
}

const payload = JSON.parse(read(indexPath));
const items = Array.isArray(payload.items) ? payload.items : [];
const archiveItems = items.filter((item) => item.content_type === 'archive_entry');
const sitemap = read(sitemapPath);

if (items.length === 0) fail('public content index has no items');
if (archiveItems.length === 0) fail('public content index has no archive entries');

let shellOnlyPages = 0;
let missingCanonical = 0;
let missingText = 0;
let sitemapMisses = 0;

for (const item of archiveItems) {
  if (!item.canonical_path || !item.canonical_url) {
    missingCanonical += 1;
    continue;
  }

  const htmlPath = path.join(publicRoot, item.canonical_path, 'index.html');
  const textPath = path.join(publicRoot, item.canonical_path, 'text.txt');
  const html = read(htmlPath);
  const text = read(textPath);
  const readableHtml = stripHtml(html);

  if (!html) fail(`missing generated HTML for ${item.canonical_path}`);
  if (!text) missingText += 1;
  if (!html.includes(escapeHtml(item.title)) || readableHtml.length < 1000) shellOnlyPages += 1;
  if (!text.includes(item.title) || text.length < 1000) missingText += 1;
  if (!sitemap.includes(item.canonical_url)) sitemapMisses += 1;
}

const vimana = archiveItems.find((item) => item.slug === 'vimana-technology');
if (!vimana) {
  fail('missing Vimana Technology archive item');
} else {
  const html = read(path.join(publicRoot, vimana.canonical_path, 'index.html'));
  const text = read(path.join(publicRoot, vimana.canonical_path, 'text.txt'));
  if (!html.includes('Ancient Airships and Frequency Propulsion')) {
    fail('Vimana HTML does not include the full title');
  }
  if (!text.includes('The Vimana awaits rediscovery')) {
    fail('Vimana plain text does not include expected ending content');
  }
}

if (missingCanonical) fail(`${missingCanonical} archive item(s) missing canonical URL/path`);
if (missingText) fail(`${missingText} archive item(s) missing readable text`);
if (shellOnlyPages) fail(`${shellOnlyPages} archive page(s) appear shell-only or too small`);
if (sitemapMisses) fail(`${sitemapMisses} archive canonical URL(s) missing from sitemap`);

if (process.exitCode) {
  process.exit();
}

console.log(JSON.stringify({
  ok: true,
  publicContentItems: items.length,
  archiveEntries: archiveItems.length,
  sitemapEntries: (sitemap.match(/<loc>/g) || []).length,
  checked: {
    canonicalUrls: archiveItems.length,
    htmlPages: archiveItems.length,
    textPages: archiveItems.length,
  },
}, null, 2));
