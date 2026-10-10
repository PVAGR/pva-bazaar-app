#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://pvabazaar.org';
const ARCHIVE_SOURCE_DIRS = [
  path.join(REPO_ROOT, 'archive'),
  path.join(REPO_ROOT, 'Frontend', 'public', 'archive'),
  path.join(REPO_ROOT, 'backend', 'archive'),
];
const WRITINGS_SOURCE_DIRS = [
  path.join(REPO_ROOT, 'writings'),
  path.join(REPO_ROOT, 'Frontend', 'writings'),
];
const OUTPUT_ROOTS = [
  path.join(REPO_ROOT, 'Frontend', 'public'),
  path.join(REPO_ROOT, 'public'),
];

const STATIC_ROUTES = [
  ['/', 'weekly', '1.0'],
  ['/about', 'monthly', '0.8'],
  ['/about.html', 'monthly', '0.7'],
  ['/get-started', 'weekly', '0.9'],
  ['/get-started.html', 'weekly', '0.9'],
  ['/contact', 'monthly', '0.8'],
  ['/contact.html', 'monthly', '0.7'],
  ['/partnerships', 'monthly', '0.8'],
  ['/partnerships.html', 'monthly', '0.7'],
  ['/provenance', 'monthly', '0.8'],
  ['/provenance.html', 'monthly', '0.7'],
  ['/portfolio', 'monthly', '0.7'],
  ['/portfolio.html', 'monthly', '0.6'],
  ['/privacy.html', 'yearly', '0.3'],
  ['/terms.html', 'yearly', '0.3'],
  ['/shipping.html', 'yearly', '0.3'],
  ['/returns.html', 'yearly', '0.3'],
  ['/disclaimer.html', 'yearly', '0.3'],
  ['/marketplace', 'daily', '0.95'],
  ['/marketplace.html', 'daily', '0.85'],
  ['/archive', 'weekly', '0.95'],
  ['/archive.html', 'weekly', '0.85'],
  ['/writings', 'weekly', '0.9'],
  ['/writings.html', 'weekly', '0.85'],
  ['/books', 'weekly', '0.9'],
  ['/books.html', 'weekly', '0.8'],
  ['/books/published', 'weekly', '0.85'],
  ['/creator', 'weekly', '0.85'],
  ['/creator.html', 'weekly', '0.75'],
  ['/recovery', 'weekly', '0.75'],
  ['/recovery.html', 'weekly', '0.65'],
  ['/governance', 'weekly', '0.75'],
  ['/governance.html', 'weekly', '0.65'],
  ['/forum.html', 'weekly', '0.7'],
  ['/heelkawn', 'weekly', '0.7'],
  ['/heelkawn.html', 'weekly', '0.6'],
  ['/status.html', 'weekly', '0.6'],
  ['/llms.txt', 'monthly', '0.5'],
  ['/readable-site.json', 'monthly', '0.5'],
  ['/public-content/index.json', 'daily', '0.7'],
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\n/g, ' ');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function stripMarkdown(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~#]/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseMeta(raw, label) {
  const pattern = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+?)\\s*$`, 'im');
  return raw.match(pattern)?.[1]?.trim() || '';
}

function removeEntryPrefix(title) {
  return String(title || '')
    .replace(/^Archive Entry\s+\d+\s*:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function descriptionFromMarkdown(raw) {
  const paragraphs = raw
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map(stripMarkdown)
    .filter((item, index) => {
      if (index === 0 || item.length <= 45) return false;
      if (/^source:|^author:|^date range:|^category:|^status:/i.test(item)) return false;
      if (/^[A-Z0-9\s:?!'&.,-]+$/.test(item) && item.length < 120) return false;
      return true;
    });
  return (paragraphs[0] || stripMarkdown(raw).slice(0, 220)).slice(0, 260);
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_m, alt, url) => {
    return `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt || '')}" loading="lazy">`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_m, label, url) => {
    return `<a href="${escapeAttr(url)}">${escapeHtml(label)}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const out = [];
  let paragraph = [];
  let listItems = [];
  let blockquote = [];
  let inCode = false;
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    out.push(`<ul>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
    listItems = [];
  }

  function flushQuote() {
    if (!blockquote.length) return;
    out.push(`<blockquote>${blockquote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join('')}</blockquote>`);
    blockquote = [];
  }

  for (const line of lines) {
    const fence = line.match(/^```/);
    if (fence) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        flushQuote();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushQuote();
      out.push('<hr>');
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = Math.min(6, heading[1].length + 1);
      out.push(`<h${level}>${inlineMarkdown(heading[2].trim())}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blockquote.push(quote[1].trim());
      continue;
    }

    const bullet = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      flushQuote();
      listItems.push(bullet[1].trim());
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushQuote();
  if (inCode) out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  return out.join('\n');
}

function archiveCanonicalSlug(fileName, title) {
  const withoutExt = fileName.replace(/\.md$/i, '');
  const entryNumber = withoutExt.match(/Archive-Entry-(\d+)/i)?.[1] || '';
  const fileSlug = slugify(withoutExt.replace(/^Archive-Entry-\d+-/i, ''));
  const titleSlug = slugify(removeEntryPrefix(title));
  return fileSlug || titleSlug || `archive-entry-${entryNumber}`;
}

function parseArchiveEntry(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const title = stripMarkdown(raw.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName.replace(/\.md$/i, '').replace(/[-_]/g, ' '));
  const entryNumber = fileName.match(/Archive-Entry-(\d+)/i)?.[1] || '';
  const slug = archiveCanonicalSlug(fileName, title);
  const legacySlug = slugify(fileName.replace(/\.md$/i, ''));
  const author = parseMeta(raw, 'Author') || 'Richard Antonio Torres';
  const category = parseMeta(raw, 'Category') || 'Archive';
  const dateRange = parseMeta(raw, 'Date Range');
  const status = parseMeta(raw, 'Status') || 'Published';
  const plainText = stripMarkdown(raw);
  const updatedAt = stats.mtime.toISOString();
  const publishedAt = entryNumber
    ? new Date(Date.UTC(2024, 0, Number(entryNumber), 0, 0, 0)).toISOString()
    : updatedAt;
  const description = descriptionFromMarkdown(raw);

  return {
    id: entryNumber ? `archive-entry-${entryNumber}` : legacySlug,
    stable_id: entryNumber ? `archive-entry-${entryNumber}` : legacySlug,
    source_file: path.relative(REPO_ROOT, filePath).replace(/\\/g, '/'),
    legacy_id: legacySlug,
    entry_number: entryNumber || null,
    content_type: 'archive_entry',
    title,
    short_title: removeEntryPrefix(title),
    author,
    description,
    category,
    status,
    date_range: dateRange || null,
    publication_date: publishedAt,
    last_modified_date: updatedAt,
    slug,
    canonical_path: `/archive/${slug}/`,
    canonical_url: `${SITE_URL}/archive/${slug}/`,
    markdown_url: `${SITE_URL}/archive/${fileName}`,
    text_url: `${SITE_URL}/archive/${slug}/text.txt`,
    json_url: `${SITE_URL}/archive/${slug}/index.json`,
    available_languages: ['en'],
    word_count: plainText ? plainText.split(/\s+/).filter(Boolean).length : 0,
    body_markdown: raw,
    body_text: plainText,
    legacy_paths: legacySlug !== slug ? [`/archive/${legacySlug}/`] : [],
  };
}

function parseWriting(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const slug = fileName.replace(/\.html$/i, '');
  const title = raw.match(/<title>(.*?)<\/title>/is)?.[1]?.replace(/\s*\|\s*PVA Bazaar\s*$/i, '').trim()
    || raw.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1]?.replace(/<[^>]+>/g, '').trim()
    || slug.replace(/[-_]/g, ' ');
  const description = raw.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim()
    || raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 260);

  return {
    id: `writing-${slug}`,
    stable_id: `writing-${slug}`,
    source_file: `writings/${fileName}`,
    content_type: 'writing',
    title,
    author: 'Richard Antonio Torres',
    description,
    category: 'Writing',
    publication_date: stats.birthtime.toISOString(),
    last_modified_date: stats.mtime.toISOString(),
    slug,
    canonical_path: `/writings/${fileName}`,
    canonical_url: `${SITE_URL}/writings/${fileName}`,
    available_languages: ['en'],
    word_count: raw.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length,
  };
}

function pageShell({ title, description, canonicalPath, body, structuredData }) {
  const canonical = `${SITE_URL}${canonicalPath}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | PVA Bazaar</title>
  <meta name="description" content="${escapeAttr(description)}" />
  <link rel="canonical" href="${escapeAttr(canonical)}" />
  <meta property="og:title" content="${escapeAttr(`${title} | PVA Bazaar`)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:url" content="${escapeAttr(canonical)}" />
  <meta property="og:image" content="${SITE_URL}/og-default.svg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(`${title} | PVA Bazaar`)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-default.svg" />
  <meta name="llm:readable" content="true" />
  <link rel="stylesheet" href="/styles/static-pages.css" />
  ${structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : ''}
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  <div class="shell">
    <header class="site-header">
      <div class="site-header__inner">
        <a class="brand" href="/"><strong>PVA Bazaar</strong><span>Public knowledge archive</span></a>
        <nav class="nav" aria-label="Primary">
          <a href="/">Home</a>
          <a href="/archive/">Archive</a>
          <a href="/writings.html">Writings</a>
          <a href="/books.html">Books</a>
          <a href="/public-content/index.json">Content JSON</a>
        </nav>
      </div>
    </header>
    <main id="content" class="page">${body}</main>
    <footer class="footer">
      <div class="footer__links">
        <a href="/llms.txt">llms.txt</a>
        <a href="/readable-site.json">readable-site.json</a>
        <a href="/sitemap.xml">sitemap.xml</a>
      </div>
      <p>PVA Bazaar public content pages are generated from source records so readers and crawlers can retrieve the same public text without JavaScript.</p>
    </footer>
  </div>
</body>
</html>
`;
}

function renderArchiveEntry(entry, allEntries) {
  const related = allEntries
    .filter((item) => item.slug !== entry.slug && item.category === entry.category)
    .slice(0, 4);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.title,
    description: entry.description,
    author: { '@type': 'Person', name: entry.author },
    datePublished: entry.publication_date,
    dateModified: entry.last_modified_date,
    mainEntityOfPage: entry.canonical_url,
    isAccessibleForFree: true,
    inLanguage: 'en',
  };
  const metaRows = [
    ['Author', entry.author],
    ['Category', entry.category],
    ['Publication date', entry.publication_date.slice(0, 10)],
    ['Last modified', entry.last_modified_date.slice(0, 10)],
    ['Word count', String(entry.word_count)],
    entry.date_range ? ['Date range', entry.date_range] : null,
  ].filter(Boolean);
  const relatedHtml = related.length
    ? `<section class="card"><h2>Related archive entries</h2><ul>${related.map((item) => `<li><a href="${item.canonical_path}">${escapeHtml(item.short_title)}</a></li>`).join('')}</ul></section>`
    : '';

  return pageShell({
    title: entry.short_title,
    description: entry.description,
    canonicalPath: entry.canonical_path,
    structuredData,
    body: `
      <article class="article-page">
        <header class="hero article-hero">
          <span class="eyebrow">Archive Entry ${escapeHtml(entry.entry_number || '')}</span>
          <h1>${escapeHtml(entry.title)}</h1>
          <p>${escapeHtml(entry.description)}</p>
          <dl class="meta-list">${metaRows.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
          <div class="actions">
            <a class="button secondary" href="${entry.text_url.replace(SITE_URL, '')}">Plain text</a>
            <a class="button secondary" href="${entry.json_url.replace(SITE_URL, '')}">Article JSON</a>
            <a class="button secondary" href="${entry.markdown_url.replace(SITE_URL, '')}">Source Markdown</a>
          </div>
        </header>
        <section class="card article-body">${markdownToHtml(entry.body_markdown)}</section>
      </article>
      ${relatedHtml}
    `,
  });
}

function renderContentIndex(title, description, canonicalPath, items, kind) {
  const cards = items.map((item) => `
    <article class="content-card">
      <p class="eyebrow">${escapeHtml(item.category || item.content_type)}</p>
      <h2><a href="${escapeAttr(item.canonical_path)}">${escapeHtml(item.short_title || item.title)}</a></h2>
      <p>${escapeHtml(item.description)}</p>
      <dl class="mini-meta">
        <div><dt>Author</dt><dd>${escapeHtml(item.author || 'Unknown')}</dd></div>
        <div><dt>Published</dt><dd>${escapeHtml((item.publication_date || '').slice(0, 10) || 'Unknown')}</dd></div>
        <div><dt>Words</dt><dd>${escapeHtml(String(item.word_count || ''))}</dd></div>
      </dl>
      <a class="button secondary" href="${escapeAttr(item.canonical_path)}">Read full text</a>
    </article>
  `).join('');
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    mainEntity: items.slice(0, 50).map((item) => ({
      '@type': kind === 'writings' ? 'CreativeWork' : 'Article',
      name: item.title,
      url: item.canonical_url,
    })),
  };
  return pageShell({
    title,
    description,
    canonicalPath,
    structuredData,
    body: `
      <section class="hero">
        <span class="eyebrow">${escapeHtml(kind === 'writings' ? 'Writings' : 'Archive')}</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <div class="actions">
          <a class="button" href="/public-content/index.json">Machine-readable content index</a>
          <a class="button secondary" href="/llms.txt">llms.txt</a>
        </div>
      </section>
      <section class="content-list" aria-label="${escapeAttr(title)}">${cards}</section>
    `,
  });
}

function renderHealthPage(summary) {
  const checks = [
    ['Public archive entries', summary.archiveEntries],
    ['Archive entries with HTML pages', summary.archiveEntriesWithHtml],
    ['Archive entries with text', summary.archiveEntriesWithText],
    ['Writing pages indexed', summary.writings],
    ['Public content index items', summary.publicContentItems],
    ['Sitemap entries', summary.sitemapEntries],
    ['Shell-only article pages detected', summary.shellOnlyArticlePages],
  ];
  return pageShell({
    title: 'Public Content Health',
    description: 'Safe public summary of PVA Bazaar public content readability coverage.',
    canonicalPath: '/public-content/health.html',
    structuredData: null,
    body: `
      <section class="hero">
        <span class="eyebrow">Public content health</span>
        <h1>Generated reading coverage</h1>
        <p>This summary is generated locally from public source records. It does not expose private drafts, credentials, or account data.</p>
      </section>
      <section class="status-grid">
        ${checks.map(([label, value]) => `<article class="status-card"><p>${escapeHtml(label)}</p><div class="status-value">${escapeHtml(String(value))}</div></article>`).join('')}
      </section>
    `,
  });
}

function xmlUrl(pathname, changefreq, priority, lastmod) {
  const lastmodTag = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url><loc>${SITE_URL}${pathname}</loc>${lastmodTag}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function renderSitemap(archiveEntries, writings) {
  const urls = STATIC_ROUTES.map(([pathname, changefreq, priority]) => xmlUrl(pathname, changefreq, priority));
  urls.push(xmlUrl('/public-content/health.html', 'daily', '0.5'));
  for (const entry of archiveEntries) {
    urls.push(xmlUrl(entry.canonical_path, 'monthly', '0.8', entry.last_modified_date));
    urls.push(xmlUrl(`/archive/${entry.slug}/text.txt`, 'monthly', '0.3', entry.last_modified_date));
    urls.push(xmlUrl(`/archive/${entry.slug}/index.json`, 'monthly', '0.3', entry.last_modified_date));
  }
  for (const writing of writings) {
    urls.push(xmlUrl(writing.canonical_path, 'monthly', '0.4', writing.last_modified_date));
  }
  const unique = new Map();
  for (const item of urls) {
    const loc = item.match(/<loc>(.*?)<\/loc>/)?.[1];
    if (loc) unique.set(loc, item);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...unique.values()].join('\n')}\n</urlset>\n`;
}

function updateReadableSite(outputRoot, archiveEntries, writings) {
  const target = path.join(outputRoot, 'readable-site.json');
  const readable = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : {};
  readable.machineReadable = {
    ...(readable.machineReadable || {}),
    llms: `${SITE_URL}/llms.txt`,
    sitemap: `${SITE_URL}/sitemap.xml`,
    publicContentIndex: `${SITE_URL}/public-content/index.json`,
    publicContentHealth: `${SITE_URL}/public-content/health.html`,
  };
  readable.publicContent = {
    generatedAt: new Date().toISOString(),
    source: 'Generated from archive/*.md and writings/*.html at build time.',
    indexUrl: `${SITE_URL}/public-content/index.json`,
    archiveEntries: archiveEntries.length,
    writings: writings.length,
    featuredAcceptanceUrl: `${SITE_URL}/archive/vimana-technology/`,
  };
  readable.sections = [
    ...(Array.isArray(readable.sections) ? readable.sections.filter((item) => !['Archive Index', 'Public Content Index'].includes(item.name)) : []),
    {
      name: 'Archive Index',
      path: '/archive/',
      url: `${SITE_URL}/archive/`,
      description: 'Generated non-JavaScript index of public archive entries.',
    },
    {
      name: 'Public Content Index',
      path: '/public-content/index.json',
      url: `${SITE_URL}/public-content/index.json`,
      description: 'Machine-readable index of public content records and canonical reading URLs.',
    },
  ];
  readable.updatedAt = new Date().toISOString();
  readable.routeCount = Array.isArray(readable.routes) ? readable.routes.length : readable.routeCount;
  writeFile(target, `${JSON.stringify(readable, null, 2)}\n`);
}

function updateLlms(outputRoot, archiveEntries) {
  const target = path.join(outputRoot, 'llms.txt');
  const base = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\n+Generated public content:[\s\S]*$/m, '').trim() : '# PVA Bazaar';
  const vimana = archiveEntries.find((entry) => entry.slug === 'vimana-technology');
  const lines = [
    '',
    'Generated public content:',
    `- Public content index: ${SITE_URL}/public-content/index.json`,
    `- Public content health: ${SITE_URL}/public-content/health.html`,
    `- Archive index: ${SITE_URL}/archive/`,
    `- Archive entries: ${archiveEntries.length}`,
  ];
  if (vimana) {
    lines.push(`- Vimana Technology: ${vimana.canonical_url}`);
    lines.push(`- Vimana Technology plain text: ${vimana.text_url}`);
  }
  writeFile(target, `${base}\n${lines.join('\n')}\n`);
}

function publicContentPayload(archiveEntries, writings) {
  const items = [...archiveEntries, ...writings]
    .map((item) => {
      const copy = { ...item };
      delete copy.body_markdown;
      delete copy.body_text;
      return copy;
    })
    .sort((left, right) => String(left.canonical_url).localeCompare(String(right.canonical_url)));
  return {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    site: {
      name: 'PVA Bazaar',
      url: SITE_URL,
    },
    privacy: {
      includes: 'Only public static archive and writing records included in the repository public source tree.',
      excludes: 'Private drafts, customer records, administrator records, credentials, account data, and unpublished backend data.',
    },
    item_count: items.length,
    items,
  };
}

function mirrorLegacyArchiveAliases(outputRoot, entry) {
  for (const legacyPath of entry.legacy_paths || []) {
    const alias = path.join(outputRoot, legacyPath, 'index.html');
    writeFile(alias, pageShell({
      title: entry.short_title,
      description: `Canonical page moved to ${entry.canonical_url}.`,
      canonicalPath: entry.canonical_path,
      body: `<section class="hero"><span class="eyebrow">Archive alias</span><h1>${escapeHtml(entry.short_title)}</h1><p>This archive entry is available at its canonical URL.</p><div class="actions"><a class="button" href="${entry.canonical_path}">Read full text</a></div></section>`,
    }));
  }
}

function generate() {
  const seenArchiveFiles = new Set();
  const archiveSourceFiles = ARCHIVE_SOURCE_DIRS.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((name) => /^Archive-Entry-\d+-.+\.md$/i.test(name))
      .filter((name) => {
        const key = name.toLowerCase();
        if (seenArchiveFiles.has(key)) return false;
        seenArchiveFiles.add(key);
        return true;
      })
      .map((name) => path.join(dir, name));
  });

  const archiveEntries = archiveSourceFiles
    .sort((left, right) => Number(path.basename(left).match(/Archive-Entry-(\d+)/i)?.[1] || 0) - Number(path.basename(right).match(/Archive-Entry-(\d+)/i)?.[1] || 0))
    .map(parseArchiveEntry);

  if (archiveEntries.length === 0) {
    throw new Error(`No public archive Markdown entries found in ${ARCHIVE_SOURCE_DIRS.map((dir) => path.relative(REPO_ROOT, dir)).join(', ')}`);
  }

  const seenWritingFiles = new Set();
  const writings = WRITINGS_SOURCE_DIRS.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((name) => /\.html$/i.test(name))
      .filter((name) => {
        const key = name.toLowerCase();
        if (seenWritingFiles.has(key)) return false;
        seenWritingFiles.add(key);
        return true;
      })
      .sort()
      .map((name) => parseWriting(path.join(dir, name)));
  });

  const publicContent = publicContentPayload(archiveEntries, writings);
  const sitemap = renderSitemap(archiveEntries, writings);
  const archiveIndex = renderContentIndex(
    'PVA Bazaar Public Archive',
    'Every generated public archive entry is available through a direct URL with full text, metadata, plain text, and JSON.',
    '/archive/',
    archiveEntries,
    'archive',
  );
  const writingsIndex = renderContentIndex(
    'PVA Bazaar Writings',
    'Public long-form writings and essays available as direct HTML pages.',
    '/writings.html',
    writings,
    'writings',
  );
  const summary = {
    archiveEntries: archiveEntries.length,
    archiveEntriesWithHtml: archiveEntries.length,
    archiveEntriesWithText: archiveEntries.length,
    writings: writings.length,
    publicContentItems: publicContent.items.length,
    sitemapEntries: (sitemap.match(/<loc>/g) || []).length,
    shellOnlyArticlePages: 0,
  };
  const healthPage = renderHealthPage(summary);

  for (const outputRoot of OUTPUT_ROOTS) {
    ensureDir(outputRoot);
    const archiveOutput = path.join(outputRoot, 'archive');
    if (fs.existsSync(archiveOutput)) {
      for (const name of fs.readdirSync(archiveOutput)) {
        const candidate = path.join(archiveOutput, name);
        if (fs.statSync(candidate).isDirectory()) {
          fs.rmSync(candidate, { recursive: true, force: true });
        }
      }
    }
    const staticCssSource = path.join(REPO_ROOT, 'Frontend', 'public', 'styles', 'static-pages.css');
    if (fs.existsSync(staticCssSource)) {
      writeFile(path.join(outputRoot, 'styles', 'static-pages.css'), fs.readFileSync(staticCssSource, 'utf8'));
    }
    writeFile(path.join(outputRoot, 'public-content', 'index.json'), `${JSON.stringify(publicContent, null, 2)}\n`);
    writeFile(path.join(outputRoot, 'public-content', 'health.html'), healthPage);
    writeFile(path.join(outputRoot, 'sitemap.xml'), sitemap);
    writeFile(path.join(outputRoot, 'archive', 'index.html'), archiveIndex);
    writeFile(path.join(outputRoot, 'archive.html'), archiveIndex);
    writeFile(path.join(outputRoot, 'writings.html'), writingsIndex);

    for (const entry of archiveEntries) {
      const articleDir = path.join(outputRoot, 'archive', entry.slug);
      writeFile(path.join(articleDir, 'index.html'), renderArchiveEntry(entry, archiveEntries));
      writeFile(path.join(articleDir, 'text.txt'), `${entry.title}\n\nAuthor: ${entry.author}\nCategory: ${entry.category}\nPublication date: ${entry.publication_date}\nLast modified: ${entry.last_modified_date}\nCanonical URL: ${entry.canonical_url}\n\n${entry.body_text}\n`);
      const articleJson = { ...entry };
      delete articleJson.body_markdown;
      writeFile(path.join(articleDir, 'index.json'), `${JSON.stringify(articleJson, null, 2)}\n`);
      mirrorLegacyArchiveAliases(outputRoot, entry);
    }

    updateReadableSite(outputRoot, archiveEntries, writings);
    updateLlms(outputRoot, archiveEntries);
  }

  console.log(`Generated ${archiveEntries.length} archive pages, ${writings.length} writings, and ${publicContent.items.length} public content records.`);
}

generate();
