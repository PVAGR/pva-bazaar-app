const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

const ARCHIVE_DIRECTORIES = [
  path.resolve(__dirname, '..', 'archive'),
  path.resolve(__dirname, '..', '..', 'archive'),
  path.resolve(__dirname, '..', '..', 'Frontend', 'public', 'archive'),
];

const STATIC_ARTIFACTS = [
  {
    _id: '000000000000000000000001',
    slug: 'maradjet-emerald-pendant',
    name: 'Maradjet Emerald Pendant',
    title: 'Handcrafted Emerald Pendant',
    description: 'A stunning emerald pendant featuring natural Panjshir emerald set in 18k gold.',
    imageUrls: [
      'https://i2.seadn.io/base/0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5/ab0864492d648de4434dd73c10970a/04ab0864492d648de4434dd73c10970a.jpeg?w=1000',
    ],
    price: 1200,
    category: 'Jewelry',
    materials: ['Panjshir Emerald', '18k Gold'],
    tags: ['Panjshir Emerald', '18k Gold'],
    artisan: 'PVA Master Craftsman',
    status: 'published',
    createdAt: new Date('2024-01-02T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    provenance: {
      uniqueCode: 'PVA-0001',
      verificationStatus: 'archived-fallback',
      authenticityScore: 95,
      royalty: {
        bps: 1000,
        percent: 10,
        beneficiaryType: 'artisan',
        beneficiaryWallet: '',
      },
      chain: {
        network: 'base',
        contractAddress: '',
        tokenStandard: 'ERC-721',
        tokenId: '',
      },
      ownershipTimeline: [],
    },
    blockchainDetails: {
      network: 'base',
      contractAddress: '',
      tokenStandard: 'ERC-721',
      tokenId: '',
    },
    fractionalization: {
      enabled: true,
      totalShares: 5000,
      sharePrice: 1,
      soldShares: 0,
      majorityThreshold: 2600,
    },
    ownershipHistory: [],
  },
  {
    _id: '000000000000000000000002',
    slug: 'traditional-afghan-carpet',
    name: 'Traditional Afghan Carpet',
    title: 'Hand-woven Afghan Carpet',
    description:
      'Traditional Afghan carpet with intricate geometric patterns, hand-woven by master craftsmen.',
    imageUrls: ['https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Afghan+Carpet'],
    price: 2500,
    category: 'Textiles',
    materials: ['Wool', 'Natural Dyes'],
    tags: ['Wool', 'Natural Dyes'],
    artisan: 'Herat Weavers Guild',
    status: 'published',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    provenance: {
      uniqueCode: 'PVA-0002',
      verificationStatus: 'archived-fallback',
      authenticityScore: 92,
      royalty: {
        bps: 1000,
        percent: 10,
        beneficiaryType: 'artisan',
        beneficiaryWallet: '',
      },
      chain: {
        network: 'base',
        contractAddress: '',
        tokenStandard: 'ERC-721',
        tokenId: '',
      },
      ownershipTimeline: [],
    },
    blockchainDetails: {
      network: 'base',
      contractAddress: '',
      tokenStandard: 'ERC-721',
      tokenId: '',
    },
    fractionalization: {
      enabled: true,
      totalShares: 10000,
      sharePrice: 0.25,
      soldShares: 0,
      majorityThreshold: 5100,
    },
    ownershipHistory: [],
  },
];

let cachedArchiveEntries = null;

function stripMarkdown(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_~#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getExcerpt(content) {
  const normalized = String(content || '').replace(/\r/g, '');
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((part) => stripMarkdown(part))
    .filter(Boolean);
  const excerpt = paragraphs.find((part) => part.length > 40) || paragraphs[0] || '';
  return excerpt.slice(0, 260);
}

function listArchiveFiles() {
  const seen = new Set();
  const files = [];

  for (const directory of ARCHIVE_DIRECTORIES) {
    if (!fs.existsSync(directory)) continue;

    for (const name of fs.readdirSync(directory)) {
      if (!/\.md$/i.test(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(path.join(directory, name));
    }
  }

  return files.sort((left, right) => {
    const leftName = path.basename(left);
    const rightName = path.basename(right);
    const leftOrder = Number((leftName.match(/(\d+)/) || [])[1] || 0);
    const rightOrder = Number((rightName.match(/(\d+)/) || [])[1] || 0);
    return rightOrder - leftOrder || rightName.localeCompare(leftName);
  });
}

function parseArchiveFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath, '.md');
  const order = Number((fileName.match(/Archive-Entry-(\d+)/i) || [])[1] || 0);
  const externalId = slugify(fileName, { lower: true, strict: true });
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? String(titleMatch[1]).trim() : fileName.replace(/[-_]+/g, ' ');
  const createdAt =
    order > 0 ? new Date(Date.UTC(2024, 0, Math.max(1, order), 0, 0, 0)) : new Date(stats.mtime);
  const updatedAt = new Date(stats.mtime);
  const plainText = stripMarkdown(raw);

  return {
    id: externalId,
    externalId,
    title,
    category: 'journal',
    description: getExcerpt(raw),
    excerpt: getExcerpt(raw),
    content: raw,
    contentHtml: raw,
    wordCount: plainText ? plainText.split(/\s+/).filter(Boolean).length : 0,
    tags: [],
    media: [],
    location: '',
    date: createdAt,
    createdAt,
    updatedAt,
  };
}

function getStaticArchiveEntries() {
  if (cachedArchiveEntries) {
    return cachedArchiveEntries;
  }

  cachedArchiveEntries = listArchiveFiles().map(parseArchiveFile);
  return cachedArchiveEntries;
}

function matchesQuery(doc, regex) {
  return (
    regex.test(doc.title || '') ||
    regex.test(doc.description || '') ||
    regex.test(doc.excerpt || '') ||
    regex.test(doc.content || '') ||
    regex.test(doc.category || '') ||
    (Array.isArray(doc.tags) && doc.tags.some((tag) => regex.test(tag)))
  );
}

function listStaticArchiveEntries({ category, tag, q, sort = 'new' } = {}) {
  const regex = q ? new RegExp(String(q), 'i') : null;
  let entries = getStaticArchiveEntries().filter((entry) => {
    if (category && String(entry.category || '').toLowerCase() !== String(category).toLowerCase()) {
      return false;
    }
    if (tag && !entry.tags.includes(tag)) {
      return false;
    }
    if (regex && !matchesQuery(entry, regex)) {
      return false;
    }
    return true;
  });

  entries = entries.sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    if (sort === 'old') {
      return leftTime - rightTime || String(left.id).localeCompare(String(right.id));
    }
    return rightTime - leftTime || String(right.id).localeCompare(String(left.id));
  });

  return entries;
}

function findStaticArchiveEntry(id) {
  const target = String(id || '')
    .trim()
    .toLowerCase();
  return (
    getStaticArchiveEntries().find((entry) => {
      return (
        String(entry.id || '').toLowerCase() === target ||
        String(entry.externalId || '').toLowerCase() === target
      );
    }) || null
  );
}

function searchStaticArchive(q, limit = 10) {
  const regex = new RegExp(String(q), 'i');
  return listStaticArchiveEntries({ q: regex.source, sort: 'new' })
    .filter((entry) => matchesQuery(entry, regex))
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      date: entry.date,
      excerpt: entry.excerpt,
      category: entry.category,
      tags: entry.tags,
      location: entry.location,
      externalId: entry.externalId,
      createdAt: entry.createdAt,
    }));
}

function listStaticArtifacts({ category, tag, q, sort = 'new', includeDrafts = false } = {}) {
  const regex = q ? new RegExp(String(q), 'i') : null;
  let items = STATIC_ARTIFACTS.filter((item) => {
    if (!includeDrafts && item.status !== 'published') {
      return false;
    }
    if (category && String(item.category || '').toLowerCase() !== String(category).toLowerCase()) {
      return false;
    }
    if (tag && !(Array.isArray(item.tags) && item.tags.includes(tag))) {
      return false;
    }
    if (regex) {
      const matched =
        regex.test(item.title || '') ||
        regex.test(item.name || '') ||
        regex.test(item.description || '') ||
        regex.test(item.category || '') ||
        regex.test(item.artisan || '') ||
        (Array.isArray(item.tags) && item.tags.some((value) => regex.test(value))) ||
        (Array.isArray(item.materials) && item.materials.some((value) => regex.test(value)));
      if (!matched) return false;
    }
    return true;
  });

  items = items.sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    if (sort === 'old') {
      return leftTime - rightTime || String(left._id).localeCompare(String(right._id));
    }
    return rightTime - leftTime || String(right._id).localeCompare(String(left._id));
  });

  return items;
}

function findStaticArtifact(slugOrId) {
  const target = String(slugOrId || '')
    .trim()
    .toLowerCase();
  return (
    STATIC_ARTIFACTS.find((item) => {
      return (
        String(item._id || '').toLowerCase() === target ||
        String(item.slug || '').toLowerCase() === target
      );
    }) || null
  );
}

function searchStaticArtifacts(q, limit = 10) {
  return listStaticArtifacts({ q, sort: 'new', includeDrafts: true })
    .slice(0, limit)
    .map((item) => ({
      ...item,
      id: item._id,
      type: 'artifact',
    }));
}

module.exports = {
  findStaticArchiveEntry,
  findStaticArtifact,
  listStaticArchiveEntries,
  listStaticArtifacts,
  searchStaticArchive,
  searchStaticArtifacts,
};
