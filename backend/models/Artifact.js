// backend/models/Artifact.js - Enhanced version
const mongoose = require('mongoose');

const artifactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrls: [{ type: String }], // Support multiple images
  price: { type: Number, required: true },
  salePrice: { type: Number },
  category: { type: String, required: true },
  physicalSerial: { type: String, unique: true },
  materials: [String],
  artisan: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Canonical MarketplaceItem fields
  slug: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  tags: [{ type: String }],

  // Human knowledge and item-story fields
  knowledgeProfile: {
    history: { type: String, default: '' },
    scientificClassification: { type: String, default: '' },
    traditionalUses: [{ type: String }],
    modernUses: [{ type: String }],
    economicImportance: { type: String, default: '' },
    educationalValue: { type: String, default: '' },
    relatedDisciplines: [{ type: String }],
    safetyInformation: { type: String, default: '' },
    importExportNotes: { type: String, default: '' },
    certifications: [{ type: String }],
    articles: [{ type: String }],
    researchPapers: [{ type: String }],
    videos: [{ type: String }],
    classroomActivities: [{ type: String }],
    universityApplications: [{ type: String }],
    museumApplications: [{ type: String }],
    laboratoryApplications: [{ type: String }],
    industrialApplications: [{ type: String }],
  },

  // B2B showroom metadata
  sku: { type: String, trim: true, index: true, sparse: true },
  isUnique: { type: Boolean, default: true },
  bulkQuantity: { type: Number, default: 0 },
  availabilityStatus: {
    type: String,
    enum: ['available', 'reserved', 'sold', 'backorder', 'unavailable'],
    default: 'available',
    index: true,
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    unit: { type: String, default: 'mm' },
  },
  weight: {
    value: { type: Number, default: 0 },
    unit: { type: String, default: 'ct' },
  },
  origin: {
    country: { type: String, default: '', index: true },
    region: { type: String, default: '' },
    sourceType: { type: String, default: '' },
  },
  gemProperties: {
    hardnessMohs: { type: Number, default: 0 },
    clarity: { type: String, default: '' },
    color: { type: String, default: '', index: true },
    cutShape: { type: String, default: '' },
    treatmentStatus: { type: String, default: '' },
  },
  mediaAssets: {
    videoUrl: { type: String, default: '' },
    angleImages: [{ type: String }],
    macroImages: [{ type: String }],
    contextImages: [{ type: String }],
  },

  // Inventory fields
  stockQty: { type: Number, default: 0 },
  reservedQty: { type: Number, default: 0 },
  soldQty: { type: Number, default: 0 },
  isUnlimited: { type: Boolean, default: false },

  // Payout and consignment info
  payoutInfo: {
    artisanWallet: String,
    partnerWallet: String,
    bankDetails: String,
    promoterName: String,
    promoterContact: String,
  },
  consignment: {
    artisanShare: { type: Number, default: 50 },
    pvaFee: { type: Number, default: 35 },
    promoterShare: { type: Number, default: 15 },
    digitalSignature: String,
    agreed: { type: Boolean, default: false },
  },

  // Blockchain integration
  blockchainDetails: {
    network: { type: String, default: 'base' },
    contractAddress: String,
    tokenId: String,
    tokenStandard: { type: String, default: 'ERC-721' },
  },

  // Digital provenance and perpetual creator royalty metadata
  provenance: {
    uniqueCode: { type: String, index: true, sparse: true },
    imageHash: { type: String, index: true, sparse: true },
    metadataHash: { type: String, index: true, sparse: true },
    combinedHash: { type: String, index: true, sparse: true },
    verificationStatus: {
      type: String,
      enum: ['hash_verified', 'pending', 'flagged'],
      default: 'pending',
    },
    classification: { type: String, default: 'Modern Digital Artifact (2026)' },
    era: { type: String, default: 'Web3 Integration Period' },
    authenticityScore: { type: Number, default: 100 },
    sourceRecordVersion: { type: Number, default: 1 },
    metadataSnapshot: { type: Object, default: {} },
    feedPath: { type: String, default: '' },
    royalty: {
      bps: { type: Number, default: 1000 },
      percent: { type: Number, default: 10 },
      beneficiaryType: { type: String, default: 'creator' },
      beneficiaryWallet: { type: String, default: '' },
    },
    chain: {
      network: { type: String, default: 'base' },
      contractAddress: { type: String, default: '' },
      tokenStandard: { type: String, default: 'ERC-721' },
      tokenId: { type: String, default: '' },
    },
    ownershipTimeline: [
      {
        ownerType: { type: String, default: 'creator' },
        ownerRef: { type: String, default: '' },
        acquiredAt: Date,
        transferType: { type: String, default: 'minted-offchain' },
        txHash: { type: String, default: '' },
        platform: { type: String, default: 'pva-bazaar' },
      },
    ],
    documentation: {
      headline: { type: String, default: '' },
      historicalSignificance: { type: String, default: '' },
    },
    review: {
      reviewNotes: { type: String, default: '' },
      reviewedAt: Date,
      reviewedBy: { type: String, default: '' },
    },
    reverseImage: {
      enabled: { type: Boolean, default: false },
      checked: { type: Boolean, default: false },
      provider: { type: String, default: '' },
      likelyDuplicate: { type: Boolean, default: false, index: true },
      score: { type: Number, default: 0 },
      threshold: { type: Number, default: 0 },
      message: { type: String, default: '' },
      checkedAt: Date,
      matches: [
        {
          source: { type: String, default: '' },
          url: { type: String, default: '' },
          imageUrl: { type: String, default: '' },
          title: { type: String, default: '' },
          similarity: { type: Number, default: 0 },
          confidence: { type: Number, default: 0 },
          externalId: { type: String, default: '' },
          firstSeenAt: Date,
        },
      ],
    },
  },

  // Fractionalization for shares
  fractionalization: {
    enabled: { type: Boolean, default: false },
    totalShares: { type: Number, default: 0 },
    soldShares: { type: Number, default: 0 },
    sharePrice: { type: Number, default: 0 },
    majorityThreshold: { type: Number, default: 0 },
  },

  // Ownership and verification
  ownershipHistory: [
    {
      owner: String,
      date: { type: Date, default: Date.now },
      transactionHash: String,
    },
  ],

  authenticationCode: String,
  lastVerification: Date,

  /** Digital download URL (after purchase). Optional; used for fulfillment. */
  downloadUrl: { type: String },

  // Optional cross-marketplace syndication tracking
  syndication: {
    requestedChannels: [{ type: String, enum: ['facebook', 'etsy', 'ebay'] }],
    jobs: [
      {
        channel: { type: String, enum: ['facebook', 'etsy', 'ebay'], required: true },
        status: {
          type: String,
          enum: ['queued', 'success', 'failed', 'skipped', 'manual_required'],
          default: 'queued',
        },
        message: { type: String, default: '' },
        externalListingId: { type: String, default: '' },
        externalUrl: { type: String, default: '' },
        attemptedAt: { type: Date, default: Date.now },
      },
    ],
    lastDispatchAt: Date,
  },

  // Omnichannel sale synchronization and listing linkage
  omnichannel: {
    channels: [
      {
        channel: { type: String, enum: ['ebay', 'etsy', 'amazon', 'facebook', 'shopify'] },
        externalListingId: { type: String, default: '' },
        externalUrl: { type: String, default: '' },
        syncMode: { type: String, enum: ['webhook', 'polling', 'manual'], default: 'manual' },
        status: { type: String, enum: ['listed', 'sold', 'delisted', 'error'], default: 'listed' },
        lastSyncedAt: Date,
        lastSyncMessage: { type: String, default: '' },
      },
    ],
    soldState: {
      isSold: { type: Boolean, default: false },
      soldAt: Date,
      soldSource: { type: String, default: '' },
      soldReference: { type: String, default: '' },
    },
    lastSyncAt: Date,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Compound index for pagination
artifactSchema.index({ createdAt: -1, _id: -1 });
// Text index for search endpoints and vector fallback
artifactSchema.index({
  name: 'text',
  title: 'text',
  description: 'text',
  category: 'text',
  tags: 'text',
  materials: 'text',
  artisan: 'text',
  'knowledgeProfile.history': 'text',
  'knowledgeProfile.scientificClassification': 'text',
  'knowledgeProfile.traditionalUses': 'text',
  'knowledgeProfile.modernUses': 'text',
  'knowledgeProfile.economicImportance': 'text',
  'knowledgeProfile.educationalValue': 'text',
  'knowledgeProfile.relatedDisciplines': 'text',
  'knowledgeProfile.certifications': 'text',
});
artifactSchema.index({ 'provenance.uniqueCode': 1 }, { unique: true, sparse: true });
artifactSchema.index({ 'provenance.combinedHash': 1 }, { unique: true, sparse: true });
artifactSchema.index({ isUnique: 1, availabilityStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Artifact', artifactSchema);
