const crypto = require('crypto');

function normalizeString(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .sort();
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input || ''), 'utf8').digest('hex');
}

function sha256BufferHex(inputBuffer) {
  return crypto.createHash('sha256').update(inputBuffer).digest('hex');
}

function createUniqueCode(prefix = 'PVA') {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function canonicalMetadata(payload = {}) {
  return {
    title: normalizeString(payload.title || payload.name),
    category: normalizeString(payload.category),
    artisan: normalizeString(payload.artisan),
    price: Number(payload.price || 0),
    descriptionHash: sha256Hex(normalizeString(payload.description || '')),
    materials: normalizeStringArray(payload.materials),
  };
}

function normalizeImageEntries(payload = {}) {
  const rawImages = Array.isArray(payload.imageUrls)
    ? payload.imageUrls
    : Array.isArray(payload.images)
      ? payload.images
      : [];
  return rawImages
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function hashSingleImageEntry(entry) {
  const value = String(entry || '').trim();
  if (!value) return { hash: '', mode: 'empty' };

  const dataUrlMatch = value.match(/^data:[^;]+;base64,(.*)$/i);
  if (dataUrlMatch && dataUrlMatch[1]) {
    try {
      const buffer = Buffer.from(dataUrlMatch[1], 'base64');
      return { hash: sha256BufferHex(buffer), mode: 'data-url-base64' };
    } catch (_) {
      return { hash: sha256Hex(value), mode: 'data-url-invalid' };
    }
  }

  if (/^https?:\/\//i.test(value)) {
    return { hash: sha256Hex(normalizeString(value)), mode: 'url' };
  }

  if (/^[a-zA-Z0-9+/=\r\n]+$/.test(value) && value.length > 128) {
    try {
      const buffer = Buffer.from(value, 'base64');
      if (buffer.length > 0) {
        return { hash: sha256BufferHex(buffer), mode: 'base64' };
      }
    } catch (_) {
    }
  }

  return { hash: sha256Hex(value), mode: 'raw' };
}

function hashImageSet(payload = {}) {
  const entries = normalizeImageEntries(payload);
  const perImage = entries
    .map((entry) => hashSingleImageEntry(entry))
    .filter((row) => row.hash);
  const imageHashes = perImage.map((row) => row.hash).sort();
  const dominantMode = perImage.length > 0 ? perImage[0].mode : 'none';
  const imageHash = sha256Hex(imageHashes.join('|') || 'no-image');

  return {
    imageHash,
    imageHashes,
    imageCount: imageHashes.length,
    imageHashMode: dominantMode,
  };
}

function buildArtifactProvenance(payload = {}) {
  const createdAtIso = new Date().toISOString();
  const metadata = canonicalMetadata(payload);
  const imageFingerprint = hashImageSet(payload);

  const imageHash = imageFingerprint.imageHash;
  const metadataHash = sha256Hex(JSON.stringify(metadata));
  const combinedHash = sha256Hex(
    `${imageHash}|${metadataHash}|${normalizeString(payload.creator || '')}|${createdAtIso}`,
  );

  return {
    uniqueCode: createUniqueCode('PVAART'),
    imageHash,
    imageHashes: imageFingerprint.imageHashes,
    imageCount: imageFingerprint.imageCount,
    imageHashMode: imageFingerprint.imageHashMode,
    metadataHash,
    combinedHash,
    createdAtIso,
    metadata,
  };
}

function buildProvenanceRecord(payload = {}) {
  const royaltyBps = Math.max(0, Math.min(Number(payload.royaltyBps || 1000), 10000));
  const network = normalizeString(payload.network || 'base') || 'base';
  const provenance = buildArtifactProvenance(payload);

  return {
    uniqueCode: provenance.uniqueCode,
    imageHash: provenance.imageHash,
    metadataHash: provenance.metadataHash,
    combinedHash: provenance.combinedHash,
    verificationStatus: 'hash_verified',
    classification: payload.classification || 'Modern Digital Artifact (2026)',
    era: payload.era || 'Web3 Integration Period',
    authenticityScore: 100,
    sourceRecordVersion: 1,
    metadataSnapshot: provenance.metadata,
    imageHashDetails: {
      mode: provenance.imageHashMode,
      imageCount: provenance.imageCount,
      imageHashes: provenance.imageHashes,
    },
    royalty: {
      bps: royaltyBps,
      percent: royaltyBps / 100,
      beneficiaryType: 'creator',
      beneficiaryWallet: String(payload.royaltyWallet || payload.artisanWallet || '').trim(),
    },
    chain: {
      network,
      contractAddress: String(payload.contractAddress || '').trim(),
      tokenStandard: String(payload.tokenStandard || 'ERC-721').trim(),
      tokenId: String(payload.tokenId || '').trim(),
    },
    ownershipTimeline: [
      {
        ownerType: 'creator',
        ownerRef: String(payload.creator || '').trim(),
        acquiredAt: new Date(provenance.createdAtIso),
        transferType: 'minted-offchain',
        txHash: String(payload.mintTxHash || '').trim(),
        platform: 'pva-bazaar',
      },
    ],
    documentation: {
      headline: payload.headline || 'Artifact provenance record',
      historicalSignificance:
        payload.historicalSignificance ||
        'Digitally cataloged marketplace artifact with verifiable provenance and royalty metadata.',
    },
  };
}

async function findDuplicateCandidates(ArtifactModel, provenance, limit = 8) {
  const rows = await ArtifactModel.find({
    $or: [
      { 'provenance.combinedHash': provenance.combinedHash },
      { 'provenance.imageHash': provenance.imageHash },
      { 'provenance.metadataHash': provenance.metadataHash },
    ],
  })
    .select('_id name title slug provenance status createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return rows.map((row) => {
    const exactCombined = row?.provenance?.combinedHash === provenance.combinedHash;
    const exactImage = row?.provenance?.imageHash === provenance.imageHash;
    const exactMetadata = row?.provenance?.metadataHash === provenance.metadataHash;
    return {
      itemId: String(row._id),
      slug: row.slug || '',
      title: row.title || row.name || 'Untitled',
      status: row.status || '',
      matchType: exactCombined ? 'exact' : exactImage ? 'image' : exactMetadata ? 'metadata' : 'possible',
      score: exactCombined ? 100 : exactImage ? 85 : exactMetadata ? 70 : 50,
      createdAt: row.createdAt,
      combinedHash: row?.provenance?.combinedHash || '',
      imageHash: row?.provenance?.imageHash || '',
      metadataHash: row?.provenance?.metadataHash || '',
    };
  });
}

module.exports = {
  buildProvenanceRecord,
  buildArtifactProvenance,
  findDuplicateCandidates,
};
