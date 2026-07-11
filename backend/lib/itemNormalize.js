// backend/lib/itemNormalize.js
const slugify = require('slugify');

function toNumber(input, fallback = 0) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function toArray(input) {
  if (Array.isArray(input)) return input.filter(Boolean);
  return input ? [input] : [];
}

function toStringArray(input) {
  if (typeof input === 'string') {
    return input
      .split(/\n|,/)
      .map((value) => String(value || '').trim())
      .filter(Boolean);
  }
  return toArray(input)
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

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

  const dimensions = body.dimensions || {};
  const weight = body.weight || {};
  const origin = body.origin || {};
  const gemProperties = body.gemProperties || {};
  const mediaAssets = body.mediaAssets || {};
  const knowledgeProfile = body.knowledgeProfile || {};

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
    sku: String(body.sku || '').trim(),
    isUnique: body.isUnique !== undefined ? Boolean(body.isUnique) : true,
    bulkQuantity: toNumber(body.bulkQuantity, 0),
    availabilityStatus: String(body.availabilityStatus || 'available').trim().toLowerCase(),
    dimensions: {
      length: toNumber(dimensions.length, 0),
      width: toNumber(dimensions.width, 0),
      height: toNumber(dimensions.height, 0),
      unit: String(dimensions.unit || 'mm').trim(),
    },
    weight: {
      value: toNumber(weight.value, 0),
      unit: String(weight.unit || 'ct').trim(),
    },
    origin: {
      country: String(origin.country || '').trim(),
      region: String(origin.region || '').trim(),
      sourceType: String(origin.sourceType || '').trim(),
    },
    gemProperties: {
      hardnessMohs: toNumber(gemProperties.hardnessMohs, 0),
      clarity: String(gemProperties.clarity || '').trim(),
      color: String(gemProperties.color || '').trim(),
      cutShape: String(gemProperties.cutShape || '').trim(),
      treatmentStatus: String(gemProperties.treatmentStatus || '').trim(),
    },
    mediaAssets: {
      videoUrl: String(mediaAssets.videoUrl || '').trim(),
      angleImages: toArray(mediaAssets.angleImages),
      macroImages: toArray(mediaAssets.macroImages),
      contextImages: toArray(mediaAssets.contextImages),
    },
    knowledgeProfile: {
      history: String(knowledgeProfile.history || '').trim(),
      scientificClassification: String(knowledgeProfile.scientificClassification || '').trim(),
      traditionalUses: toStringArray(knowledgeProfile.traditionalUses),
      modernUses: toStringArray(knowledgeProfile.modernUses),
      economicImportance: String(knowledgeProfile.economicImportance || '').trim(),
      educationalValue: String(knowledgeProfile.educationalValue || '').trim(),
      relatedDisciplines: toStringArray(knowledgeProfile.relatedDisciplines),
      safetyInformation: String(knowledgeProfile.safetyInformation || '').trim(),
      importExportNotes: String(knowledgeProfile.importExportNotes || '').trim(),
      certifications: toStringArray(knowledgeProfile.certifications),
      articles: toStringArray(knowledgeProfile.articles),
      researchPapers: toStringArray(knowledgeProfile.researchPapers),
      videos: toStringArray(knowledgeProfile.videos),
      classroomActivities: toStringArray(knowledgeProfile.classroomActivities),
      universityApplications: toStringArray(knowledgeProfile.universityApplications),
      museumApplications: toStringArray(knowledgeProfile.museumApplications),
      laboratoryApplications: toStringArray(knowledgeProfile.laboratoryApplications),
      industrialApplications: toStringArray(knowledgeProfile.industrialApplications),
    },
  };
  if (body.creator) {
    normalized.creator = body.creator;
  }
  return normalized;
}

function toPublicItem(doc, options = {}) {
  if (!doc) return null;
  const includePrivateStewardship = Boolean(options?.includePrivateStewardship);
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
  const stewardship = {
    currentHolderUserId: doc?.stewardship?.currentHolderUserId ? String(doc.stewardship.currentHolderUserId) : '',
    currentHolderName: doc?.stewardship?.currentHolderName || '',
    currentHolderRole: doc?.stewardship?.currentHolderRole || 'owner',
    accessCodeHint: doc?.stewardship?.accessCodeHint || doc?.stewardship?.claimCodeHint || '',
    claimCodeHint: doc?.stewardship?.claimCodeHint || doc?.stewardship?.accessCodeHint || '',
    claimReason: doc?.stewardship?.claimReason || '',
    claimedAt: doc?.stewardship?.claimedAt ? new Date(doc.stewardship.claimedAt).toISOString() : undefined,
    claimHistory: Array.isArray(doc?.stewardship?.claimHistory)
      ? doc.stewardship.claimHistory.map((entry) => ({
          userId: entry?.userId ? String(entry.userId) : '',
          userName: String(entry?.userName || ''),
          role: String(entry?.role || 'owner'),
          note: String(entry?.note || ''),
          claimedAt: entry?.claimedAt ? new Date(entry.claimedAt).toISOString() : undefined,
          claimMode: String(entry?.claimMode || 'self-service'),
        }))
      : [],
  };
  if (includePrivateStewardship) {
    stewardship.accessCode = doc?.stewardship?.accessCode || '';
    stewardship.accessCodeHash = doc?.stewardship?.accessCodeHash || '';
    stewardship.accessCodeIssuedAt = doc?.stewardship?.accessCodeIssuedAt
      ? new Date(doc.stewardship.accessCodeIssuedAt).toISOString()
      : undefined;
  }
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

  const catalog = {
    sku: doc?.sku || '',
    isUnique: doc?.isUnique !== undefined ? Boolean(doc.isUnique) : true,
    bulkQuantity: Number(doc?.bulkQuantity || 0),
    availabilityStatus: doc?.availabilityStatus || 'available',
    dimensions: {
      length: Number(doc?.dimensions?.length || 0),
      width: Number(doc?.dimensions?.width || 0),
      height: Number(doc?.dimensions?.height || 0),
      unit: doc?.dimensions?.unit || 'mm',
    },
    weight: {
      value: Number(doc?.weight?.value || 0),
      unit: doc?.weight?.unit || 'ct',
    },
    origin: {
      country: doc?.origin?.country || '',
      region: doc?.origin?.region || '',
      sourceType: doc?.origin?.sourceType || '',
    },
    gemProperties: {
      hardnessMohs: Number(doc?.gemProperties?.hardnessMohs || 0),
      clarity: doc?.gemProperties?.clarity || '',
      color: doc?.gemProperties?.color || '',
      cutShape: doc?.gemProperties?.cutShape || '',
      treatmentStatus: doc?.gemProperties?.treatmentStatus || '',
    },
    mediaAssets: {
      videoUrl: doc?.mediaAssets?.videoUrl || '',
      angleImages: toArray(doc?.mediaAssets?.angleImages),
      macroImages: toArray(doc?.mediaAssets?.macroImages),
      contextImages: toArray(doc?.mediaAssets?.contextImages),
    },
  };
  const knowledgeProfile = {
    history: doc?.knowledgeProfile?.history || '',
    scientificClassification: doc?.knowledgeProfile?.scientificClassification || '',
    traditionalUses: toStringArray(doc?.knowledgeProfile?.traditionalUses),
    modernUses: toStringArray(doc?.knowledgeProfile?.modernUses),
    economicImportance: doc?.knowledgeProfile?.economicImportance || '',
    educationalValue: doc?.knowledgeProfile?.educationalValue || '',
    relatedDisciplines: toStringArray(doc?.knowledgeProfile?.relatedDisciplines),
    safetyInformation: doc?.knowledgeProfile?.safetyInformation || '',
    importExportNotes: doc?.knowledgeProfile?.importExportNotes || '',
    certifications: toStringArray(doc?.knowledgeProfile?.certifications),
    articles: toStringArray(doc?.knowledgeProfile?.articles),
    researchPapers: toStringArray(doc?.knowledgeProfile?.researchPapers),
    videos: toStringArray(doc?.knowledgeProfile?.videos),
    classroomActivities: toStringArray(doc?.knowledgeProfile?.classroomActivities),
    universityApplications: toStringArray(doc?.knowledgeProfile?.universityApplications),
    museumApplications: toStringArray(doc?.knowledgeProfile?.museumApplications),
    laboratoryApplications: toStringArray(doc?.knowledgeProfile?.laboratoryApplications),
    industrialApplications: toStringArray(doc?.knowledgeProfile?.industrialApplications),
  };

  return {
    id: doc._id ? String(doc._id) : undefined,
    creator: doc?.creator ? String(doc.creator) : '',
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
    stewardship,
    fractionalization,
    ownershipHistory,
    catalog,
    knowledgeProfile,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}

module.exports = {
  normalizeItemInput,
  toPublicItem,
};
