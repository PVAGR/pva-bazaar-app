#!/usr/bin/env node
/**
 * Import Markdown journal entries into PVABazaar backend (/api/archive).
 *
 * Splits entries on headings like:
 *   # **My Title**
 *
 * Usage:
 *   node backend/scripts/import-archive-md.mjs --file import/Archive.md --api https://pva-backend-api.vercel.app --dryRun
 *   node backend/scripts/import-archive-md.mjs --file import/Archive.md --api https://pva-backend-api.vercel.app
 *
 * Auth:
 *   export ADMIN_SECRET_CODE="your-admin-secret"   (recommended)
 *   or it will prompt.
 */

import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    out[k] = v;
  }
  return out;
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
}

function excerptFrom(body, n = 240) {
  const clean = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean;
}

function slugify(s) {
  const t = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return t || 'entry';
}

function categorize(title) {
  const t = String(title || '').toLowerCase();
  if (t.includes('food')) return 'Food';
  if (t.includes('war') || t.includes('battle')) return 'War';
  if (t.includes('airship') || t.includes('taur')) return 'Aviation';
  if (t.includes('quantum') || t.includes('energy')) return 'Science';
  if (t.includes('gods') || t.includes('jesus') || t.includes('spiritual')) return 'Spirituality';
  return 'Journal';
}

function tagsFrom(title) {
  const words = String(title || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  return Array.from(new Set(words)).slice(0, 10);
}

function splitEntries(md) {
  const lines = md.split(/\r?\n/);

  // Entry headers look like: # **TITLE**
  const headerIdxs = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*#\s+\*\*.+\*\*\s*$/.test(lines[i])) headerIdxs.push(i);
  }
  if (headerIdxs.length === 0) {
    throw new Error('No entry headings found. Expected lines like: # **My Title**');
  }

  const parts = [];

  // Optional: preface content before first entry becomes an entry too (so you don't lose anything).
  const preface = lines.slice(0, headerIdxs[0]).join('\n').trim();
  if (preface.length > 200) {
    parts.push({
      title: 'Magnum Opus Preface',
      body: preface,
      _preface: true,
    });
  }

  for (let j = 0; j < headerIdxs.length; j++) {
    const start = headerIdxs[j];
    const end = j + 1 < headerIdxs.length ? headerIdxs[j + 1] : lines.length;

    const rawTitle = lines[start]
      .trim()
      .replace(/^#\s*/, '')
      .replace(/^\*\*|\*\*$/g, '')
      .trim();

    let body = lines
      .slice(start + 1, end)
      .join('\n')
      .trim();

    // Light cleanup that doesn't rewrite content:
    // remove trailing divider-only lines
    body = body.replace(/\n?\s*—----\s*$/g, '').trim();
    body = body.replace(/\n{4,}/g, '\n\n\n');

    parts.push({ title: rawTitle, body });
  }

  return parts;
}

async function promptSecret() {
  if (process.env.ADMIN_SECRET_CODE) return process.env.ADMIN_SECRET_CODE;
  const rl = readline.createInterface({ input, output });
  const secret = await rl.question('Enter ADMIN_SECRET_CODE: ');
  rl.close();
  return String(secret || '').trim();
}

async function postJson(url, data, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function getJson(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const API = String(
    args.api || process.env.API_BASE || 'https://pva-backend-api.vercel.app',
  ).replace(/\/$/, '');
  const FILE = String(args.file || 'import/Archive.md');
  const DRY = Boolean(args.dryRun);
  const LIMIT = args.limit ? Number(args.limit) : null;

  const md = await fs.readFile(FILE, 'utf8');
  let parts = splitEntries(md);
  if (LIMIT && Number.isFinite(LIMIT)) parts = parts.slice(0, LIMIT);

  console.log(`Found ${parts.length} entries in ${FILE}`);
  parts.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2, '0')}. ${p.title}`));

  const secret = await promptSecret();
  const tok = await postJson(`${API}/api/admin/token`, { secret });
  if (!tok.res.ok || !tok.json.token) {
    console.error('Failed to get admin token:', tok.res.status, tok.json);
    process.exit(1);
  }
  const token = tok.json.token;

  // Date assignment (stable ordering): oldest first
  const today = new Date();
  const base = new Date(today.getTime() - (parts.length - 1) * 24 * 60 * 60 * 1000);

  let created = 0,
    skipped = 0,
    failed = 0;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const date = new Date(base.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // externalId makes re-runs safe (idempotent)
    const externalId = p._preface
      ? 'md-000-preface'
      : `md-${String(i + 1).padStart(3, '0')}-${slugify(p.title)}`;

    // If backend supports externalId lookup on /api/archive/:id, this prevents duplicates.
    const check = await getJson(`${API}/api/archive/${encodeURIComponent(externalId)}`);
    if (check.res.ok && check.json && check.json.entry) {
      console.log(`↩︎  skip ${externalId} (already exists)`);
      skipped++;
      continue;
    }

    const payload = {
      title: p.title,
      date,
      category: categorize(p.title),
      tags: tagsFrom(p.title),
      excerpt: excerptFrom(p.body),
      externalId,
      // Preserve text EXACTLY as-is inside <pre> so formatting is stable on pvabazaar.org
      contentHtml: `<pre style="white-space:pre-wrap; font-family:inherit;">${escapeHtml(p.body)}</pre>`,
    };

    if (DRY) {
      console.log(`[dry] would create ${externalId}: ${payload.title}`);
      continue;
    }

    const createdRes = await fetch(`${API}/api/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const json = await createdRes.json().catch(() => ({}));

    if (createdRes.ok) {
      console.log(`✅ created ${externalId}`);
      created++;
    } else {
      console.error(`❌ failed ${externalId}:`, createdRes.status, json);
      failed++;
    }
  }

  console.log(`Done. created=${created} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
