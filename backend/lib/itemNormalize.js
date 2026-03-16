// backend/lib/itemNormalize.js
const slugify = require('slugify');

function normalizeItemInput(body = {}) {
  // Accept legacy and canonical inputs and map to Artifact schema.
  const name = body.name || body.title || '';
  const title = body.title || body.name || '';
  const category = body.category || '';
  const description = body.description || '';
  const rawMedia = body.imageUrls || body.media || body.images || [];
  const tags = body.tags || body.materials || [];
  const materials = body.materials || body.tags || [];
  const status = body.status || 'published';
  const salePrice = body.salePrice ? Number(body.salePrice) : undefined;
  const price =
    typeof body.price === 'number'
      ? body.price
      : body.price
        ? Number(body.price)
        : body.priceCents
          ? Number(body.priceCents) / 100
          : 0;
  let slug = body.slug || '';
  if (!slug && name) {
    slug = slugify(name, { lower: true, strict: true });
  }
  const imageUrls = Array.isArray(rawMedia) ? rawMedia : [rawMedia];
  const normalized = {
    name,
    title,
    category,
    description,
    imageUrls,
    tags: Array.isArray(tags) ? tags : [tags],
    materials: Array.isArray(materials) ? materials : [materials],
    status,
    price,
    salePrice,
    slug,
    artisan: body.artisan || 'PVA Artisan',
  };
  if (body.creator) {
    normalized.creator = body.creator;
  }
  return normalized;
}

function toPublicItem(doc) {
  if (!doc) return null;
  // Compute canonical fields from Artifact doc
  const name = doc.name || doc.title || '';
  const category = doc.category || '';
  const description = doc.description || '';
  const media = doc.imageUrls || doc.media || [];
  const tags = doc.tags || doc.materials || [];
  const status = doc.status || 'published';
  const priceCents = doc.priceCents || (doc.salePrice ? Math.round(Number(doc.salePrice) * 100) : (doc.price ? Math.round(Number(doc.price) * 100) : 0));
  const currency = doc.currency || 'USD';
  let slug = doc.slug;
  if (!slug && name) {
    slug = slugify(name, { lower: true, strict: true });
  }
  const stockQty = doc.stockQty != null ? Number(doc.stockQty) : undefined;
  const lore = doc.lore || doc.description || '';
  const syndication = {
    requestedChannels: Array.isArray(doc?.syndication?.requestedChannels)
      ? doc.syndication.requestedChannels
      : [],
    jobs: Array.isArray(doc?.syndication?.jobs)
      ? doc.syndication.jobs.map((job) => ({
          channel: job.channel,
          status: job.status,
          message: job.message || '',
          externalListingId: job.externalListingId || '',
          externalUrl: job.externalUrl || '',
          attemptedAt: job.attemptedAt ? new Date(job.attemptedAt).toISOString() : undefined,
        }))
      : [],
    lastDispatchAt: doc?.syndication?.lastDispatchAt
      ? new Date(doc.syndication.lastDispatchAt).toISOString()
      : undefined,
  };
  const omnichannel = {
    soldState: {
      isSold: Boolean(doc?.omnichannel?.soldState?.isSold),
      soldAt: doc?.omnichannel?.soldState?.soldAt
        ? new Date(doc.omnichannel.soldState.soldAt).toISOString()
        : undefined,
      soldSource: doc?.omnichannel?.soldState?.soldSource || '',
      soldReference: doc?.omnichannel?.soldState?.soldReference || '',
    },
    channelsCount: Array.isArray(doc?.omnichannel?.channels) ? doc.omnichannel.channels.length : 0,
    lastSyncAt: doc?.omnichannel?.lastSyncAt
      ? new Date(doc.omnichannel.lastSyncAt).toISOString()
      : undefined,
  };
  const provenance = {
    uniqueCode: doc?.provenance?.uniqueCode || '',
    combinedHash: doc?.provenance?.combinedHash || '',
    imageHash: doc?.provenance?.imageHash || '',
    metadataHash: doc?.provenance?.metadataHash || '',
    verificationStatus: doc?.provenance?.verificationStatus || '',
    classification: doc?.provenance?.classification || '',
    era: doc?.provenance?.era || '',
    authenticityScore: Number(doc?.provenance?.authenticityScore || 0),
    feedPath: doc?.provenance?.feedPath || '',
    royalty: {
      bps: Number(doc?.provenance?.royalty?.bps || 0),
      percent: Number(doc?.provenance?.royalty?.percent || 0),
      beneficiaryType: doc?.provenance?.royalty?.beneficiaryType || '',
      beneficiaryWallet: doc?.provenance?.royalty?.beneficiaryWallet || '',
    },
    chain: {
      network: doc?.provenance?.chain?.network || doc?.blockchainDetails?.network || '',
      contractAddress: doc?.provenance?.chain?.contractAddress || doc?.blockchainDetails?.contractAddress || '',
      tokenStandard: doc?.provenance?.chain?.tokenStandard || doc?.blockchainDetails?.tokenStandard || '',
      tokenId: doc?.provenance?.chain?.tokenId || doc?.blockchainDetails?.tokenId || '',
    },
    ownershipTimelineCount: Array.isArray(doc?.provenance?.ownershipTimeline)
      ? doc.provenance.ownershipTimeline.length
      : 0,
    reverseImage: {
      enabled: Boolean(doc?.provenance?.reverseImage?.enabled),
      checked: Boolean(doc?.provenance?.reverseImage?.checked),
      likelyDuplicate: Boolean(doc?.provenance?.reverseImage?.likelyDuplicate),
      score: Number(doc?.provenance?.reverseImage?.score || 0),
      threshold: Number(doc?.provenance?.reverseImage?.threshold || 0),
      message: doc?.provenance?.reverseImage?.message || '',
      checkedAt: doc?.provenance?.reverseImage?.checkedAt
        ? new Date(doc.provenance.reverseImage.checkedAt).toISOString()
        : undefined,
      matchesCount: Array.isArray(doc?.provenance?.reverseImage?.matches)
        ? doc.provenance.reverseImage.matches.length
        : 0,
    },
    review: {
      reviewNotes: doc?.provenance?.review?.reviewNotes || '',
      reviewedAt: doc?.provenance?.review?.reviewedAt
        ? new Date(doc.provenance.review.reviewedAt).toISOString()
        : undefined,
      reviewedBy: doc?.provenance?.review?.reviewedBy || '',
    },
  };
  const fractionalization = {
    enabled: Boolean(doc?.fractionalization?.enabled),
    totalShares: Number(doc?.fractionalization?.totalShares || 0),
    soldShares: Number(doc?.fractionalization?.soldShares || 0),
    sharePrice: Number(doc?.fractionalization?.sharePrice || 0),
    majorityThreshold: Number(doc?.fractionalization?.majorityThreshold || 0),
  };
  const ownershipHistory = Array.isArray(doc?.ownershipHistory)
    ? doc.ownershipHistory.map((entry) => ({
        owner: String(entry?.owner || ''),
        date: entry?.date ? new Date(entry.date).toISOString() : undefined,
        transactionHash: String(entry?.transactionHash || ''),
      }))
    : [];
  return {
    id: doc._id ? String(doc._id) : undefined,
    slug,
    name,
    category,
    description,
    lore: typeof lore === 'string' ? lore : '',
    priceCents,
    currency,
    media: Array.isArray(media) ? media : [media],
    tags: Array.isArray(tags) ? tags : [tags],
    status,
    stockQty,
    syndication,
    omnichannel,
    provenance,
    fractionalization,
    ownershipHistory,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}

module.exports = {
  normalizeItemInput,
  toPublicItem,
};
