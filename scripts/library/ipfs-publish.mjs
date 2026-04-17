import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const CONTENT_DIR = path.join(REPO_ROOT, 'content', 'library');
const CID_MAP_PATH = path.join(CONTENT_DIR, 'cid-map.json');

function parseFrontmatter(markdown) {
  const raw = String(markdown || '');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const body = match ? raw.slice(match[0].length) : raw;

  const frontmatter = {};
  if (match) {
    for (const line of match[1].split('\n')) {
      const [key, ...rest] = line.split(':');
      if (!key || rest.length === 0) continue;
      frontmatter[key.trim()] = rest.join(':').trim().replace(/^"|"$/g, '');
    }
  }

  return { frontmatter, body };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSimpleHtml({ title, body }) {
  const htmlBody = String(body || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('\n');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>${escapeHtml(title)}</title>`,
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '</head>',
    '<body>',
    htmlBody,
    '</body>',
    '</html>',
  ].join('\n');
}

async function uploadHtmlToPinata({ html, fileName }) {
  const apiKey = process.env.PINATA_API_KEY || '';
  const apiSecret = process.env.PINATA_API_SECRET || process.env.PINATA_SECRET_API_KEY || '';

  if (!apiKey || !apiSecret) {
    throw new Error('Missing Pinata credentials (PINATA_API_KEY and PINATA_API_SECRET)');
  }

  const formData = new FormData();
  const blob = new Blob([html], { type: 'text/html' });
  formData.append('file', blob, fileName);

  const metadata = {
    name: fileName,
    keyvalues: {
      module: 'civilization-library',
      source: 'github-actions',
    },
  };
  formData.append('pinataMetadata', JSON.stringify(metadata));

  const options = { cidVersion: 1 };
  formData.append('pinataOptions', JSON.stringify(options));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    cid: data.IpfsHash,
    gatewayUrl: `${process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs'}/${data.IpfsHash}`,
  };
}

async function getMarkdownFiles() {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  const all = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
  return all
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(CONTENT_DIR, entry.name));
}

async function loadCidMap() {
  try {
    const raw = await fs.readFile(CID_MAP_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch (_err) {
    return {};
  }
}

async function main() {
  const markdownFiles = await getMarkdownFiles();
  const currentMap = await loadCidMap();
  const nextMap = { ...currentMap };

  for (const filePath of markdownFiles) {
    const markdown = await fs.readFile(filePath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(markdown);

    const slug = path.basename(filePath, '.md');
    const title = frontmatter.title || slug;
    const html = renderSimpleHtml({ title, body });

    const upload = await uploadHtmlToPinata({
      html,
      fileName: `${slug}.html`,
    });

    nextMap[slug] = {
      cid: upload.cid,
      gatewayUrl: upload.gatewayUrl,
      title,
      updatedAt: new Date().toISOString(),
    };

    console.log(`Uploaded ${slug}: ${upload.cid}`);
  }

  await fs.writeFile(CID_MAP_PATH, `${JSON.stringify(nextMap, null, 2)}\n`, 'utf8');
  console.log(`Updated CID map: ${CID_MAP_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
