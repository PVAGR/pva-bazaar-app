const path = require('path');
const fsp = require('fs').promises;
const { execFile } = require('child_process');
const { promisify } = require('util');
const yaml = require('js-yaml');
const slugify = require('slugify');
const ipfsService = require('../service/ipfs');

const execFileAsync = promisify(execFile);

const REQUIRED_REFERENCE_FIELDS = ['title', 'quick_facts', 'history', 'operations', 'sources'];

function sanitizeString(value, max = 12000) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function isObjectLike(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseFrontmatter(markdown) {
  const raw = String(markdown || '');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) return { frontmatter: {}, body: raw };

  let parsed = {};
  try {
    parsed = yaml.load(fmMatch[1]) || {};
  } catch (_err) {
    throw new Error('Invalid YAML frontmatter');
  }

  if (!isObjectLike(parsed)) {
    throw new Error('Frontmatter must be a YAML object');
  }

  const body = raw.slice(fmMatch[0].length);
  return { frontmatter: parsed, body };
}

function buildTemplateFrontmatter(inputFrontmatter, reqUserId) {
  const title = sanitizeString(inputFrontmatter.title || inputFrontmatter.name || '', 200);
  const quickFacts = isObjectLike(inputFrontmatter.quick_facts) ? inputFrontmatter.quick_facts : {};

  const normalized = {
    title,
    quick_facts: quickFacts,
    history: sanitizeString(inputFrontmatter.history || '', 25000),
    operations: sanitizeString(inputFrontmatter.operations || '', 25000),
    sources: Array.isArray(inputFrontmatter.sources)
      ? inputFrontmatter.sources.map((item) => sanitizeString(item, 500)).filter(Boolean)
      : [],
    authorId: sanitizeString(inputFrontmatter.authorId || reqUserId, 120),
    version: Number(inputFrontmatter.version || 1),
    status: sanitizeString(inputFrontmatter.status || 'draft', 20),
  };

  return normalized;
}

function ensureUniversalReference(frontmatter) {
  const missing = REQUIRED_REFERENCE_FIELDS.filter((key) => {
    if (key === 'sources') return !Array.isArray(frontmatter[key]) || frontmatter[key].length === 0;
    if (key === 'quick_facts')
      return !isObjectLike(frontmatter[key]) || Object.keys(frontmatter[key]).length === 0;
    return !sanitizeString(frontmatter[key]);
  });

  if (missing.length) {
    throw new Error(`Universal Reference template is incomplete. Missing: ${missing.join(', ')}`);
  }
}

function computeDiffSummary(previousMarkdown, nextMarkdown) {
  const prevLines = String(previousMarkdown || '').split('\n');
  const nextLines = String(nextMarkdown || '').split('\n');

  let addedLines = 0;
  let removedLines = 0;
  let changedLines = 0;

  const maxLen = Math.max(prevLines.length, nextLines.length);
  const previewLines = [];

  for (let i = 0; i < maxLen; i += 1) {
    const prev = prevLines[i] || '';
    const next = nextLines[i] || '';

    if (prev === next) continue;
    if (!prev && next) {
      addedLines += 1;
      if (previewLines.length < 8) previewLines.push(`+ ${next}`);
      continue;
    }
    if (prev && !next) {
      removedLines += 1;
      if (previewLines.length < 8) previewLines.push(`- ${prev}`);
      continue;
    }

    changedLines += 1;
    if (previewLines.length < 8) {
      previewLines.push(`- ${prev}`);
      previewLines.push(`+ ${next}`);
    }
  }

  return {
    addedLines,
    removedLines,
    changedLines,
    preview: previewLines.join('\n'),
  };
}

function escapeHtml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdownBody(body) {
  const lines = String(body || '').split('\n');
  const html = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      closeList();
      html.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      closeList();
      html.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      closeList();
      html.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  closeList();
  return html.join('\n');
}

function renderQuickFactsTable(quickFacts) {
  if (!isObjectLike(quickFacts) || Object.keys(quickFacts).length === 0) return '';

  const rows = Object.entries(quickFacts).map(([key, value]) => {
    return `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(String(value || ''))}</td></tr>`;
  });

  return `<section><h2>Quick Facts</h2><table>${rows.join('')}</table></section>`;
}

function renderSourcesList(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';
  const rows = sources.map((source) => `<li>${escapeHtml(source)}</li>`);
  return `<section><h2>Sources</h2><ol>${rows.join('')}</ol></section>`;
}

function renderArticleHtml({ title, frontmatter, body }) {
  const quickFactsHtml = renderQuickFactsTable(frontmatter.quick_facts);
  const historyHtml = frontmatter.history
    ? `<section><h2>History</h2><p>${escapeHtml(frontmatter.history)}</p></section>`
    : '';
  const operationsHtml = frontmatter.operations
    ? `<section><h2>Operations and Impact</h2><p>${escapeHtml(frontmatter.operations)}</p></section>`
    : '';

  const sourcesHtml = renderSourcesList(frontmatter.sources || []);
  const markdownHtml = renderMarkdownBody(body);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>${escapeHtml(title)}</title>`,
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <style>',
    '    body{font-family:ui-serif,Georgia,serif;line-height:1.7;max-width:860px;margin:0 auto;padding:2rem;background:whitesmoke;color:#111;}',
    '    h1,h2,h3{line-height:1.25;color:midnightblue;}',
    '    table{border-collapse:collapse;width:100%;margin:1rem 0;}',
    '    th,td{border:1px solid lightgray;padding:0.5rem;text-align:left;vertical-align:top;}',
    '    section{margin:1.5rem 0;}',
    '    ul,ol{padding-left:1.25rem;}',
    '    p{margin:0.75rem 0;}',
    '  </style>',
    '</head>',
    '<body>',
    `  <article><h1>${escapeHtml(title)}</h1>${quickFactsHtml}${historyHtml}${operationsHtml}<section><h2>Reference Body</h2>${markdownHtml}</section>${sourcesHtml}</article>`,
    '</body>',
    '</html>',
  ].join('\n');
}

async function uploadHtmlToIpfs({ html, slug, version }) {
  const buffer = Buffer.from(String(html || ''), 'utf8');
  const fileName = `library-${slug}-v${version}.html`;

  try {
    const pinned = await ipfsService.uploadToPinata(buffer, fileName, {
      module: 'civilization-library',
      slug,
      version: String(version),
    });
    return { cid: pinned.hash, gatewayUrl: pinned.url };
  } catch (err) {
    return { cid: '', gatewayUrl: '', error: err.message };
  }
}

async function runGitCommand(args, cwd) {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return String(stdout || '').trim();
}

async function writeToGitBranch({ slug, markdown, version, status }) {
  const repoRoot = path.join(__dirname, '..', '..');
  const contentDir = path.join(repoRoot, 'content', 'library');
  const contentFilePath = path.join(contentDir, `${slug}.md`);

  const syncEnabled =
    String(process.env.LIBRARY_GIT_SYNC_ENABLED || 'true').toLowerCase() !== 'false';
  if (!syncEnabled) {
    return { gitCommitHash: '' };
  }

  try {
    await runGitCommand(['rev-parse', '--is-inside-work-tree'], repoRoot);
    await fsp.mkdir(contentDir, { recursive: true });
    await fsp.writeFile(contentFilePath, String(markdown || ''), 'utf8');

    const branchName = String(process.env.LIBRARY_GIT_BRANCH || 'content-library').trim();
    const branchExists = await runGitCommand(['branch', '--list', branchName], repoRoot);

    if (!branchExists) {
      await runGitCommand(['checkout', '-b', branchName], repoRoot);
    }

    await runGitCommand(
      ['add', path.relative(repoRoot, contentFilePath).replace(/\\/g, '/')],
      repoRoot,
    );

    const commitMessage = `library(${slug}): v${version} ${status}`;
    try {
      await runGitCommand(['commit', '-m', commitMessage], repoRoot);
    } catch (_commitErr) {
      return { gitCommitHash: '' };
    }

    const gitCommitHash = await runGitCommand(['rev-parse', 'HEAD'], repoRoot);
    return { gitCommitHash };
  } catch (_err) {
    return { gitCommitHash: '' };
  }
}

function buildFrontmatterMarkdown(frontmatter, body) {
  const frontmatterYaml = yaml.dump(frontmatter, { lineWidth: 120 }).trim();
  return `---\n${frontmatterYaml}\n---\n\n${String(body || '').trim()}\n`;
}

module.exports = {
  REQUIRED_REFERENCE_FIELDS,
  parseFrontmatter,
  buildTemplateFrontmatter,
  ensureUniversalReference,
  computeDiffSummary,
  renderArticleHtml,
  uploadHtmlToIpfs,
  writeToGitBranch,
  buildFrontmatterMarkdown,
};
