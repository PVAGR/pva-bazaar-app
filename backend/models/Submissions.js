const mongoose = require('mongoose');

// Asset Submission Schema
const AssetSubmissionSchema = new mongoose.Schema({
  // Unique identifiers
  id: { type: String, required: true, unique: true },
  contractId: { type: String, required: true, unique: true },
  pvaSerial: { type: String, required: true, unique: true },
  
  // Basic asset information
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['jewelry', 'gemstone', 'art', 'textile', 'collectible', 'antique', 'other']
  },
  materials: { type: String, required: true },
  dimensions: String,
  weight: String,
  origin: String,
  
  // Financial information
  physicalValue: { type: Number, required: true, min: 0 },
  nftPrice: { type: Number, default: 0, min: 0 },
  salePrice: { type: Number, default: 0, min: 0 },
  
  // Blockchain information
  tokenId: String,
  network: { 
    type: String, 
    default: 'base',
    enum: ['base', 'ethereum', 'polygon'] 
  },
  ipfsHash: String,
  contractAddress: String,
  
  // Artisan information
  artisan: {
    name: { type: String, required: true },
    location: String,
    wallet: String,
    story: String,
    share: { type: Number, default: 50, min: 0, max: 100 }
  },
  
  // Partner information
  partner: {
    name: String,
    code: String,
    license: String,
    wallet: String,
    address: String,
    commissionRate: { type: Number, default: 15, min: 0, max: 50 },
    share: { type: Number, default: 15, min: 0, max: 100 }
  },
  
  // Authentication and quality
  authMethod: { 
    type: String, 
    required: true,
    enum: ['gia', 'pva', 'independent', 'artisan']
  },
  qualityGrade: String,
  condition: { 
    type: String, 
    required: true,
    enum: ['new', 'excellent', 'very-good', 'good', 'vintage']
  },
  labReport: String,
  
  // Media
  images: [{ type: String }], // Array of image URLs
  
  // PVA specific
  pvaFee: { type: Number, default: 35, min: 0, max: 100 },
  
  // Insurance and legal
  insuranceBond: { type: Number, default: 0, min: 0 },
  agreeTerms: { type: Boolean, required: true },
  digitalSignature: String,
  
  // Status and timestamps
  status: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'archived']
  },
  submittedAt: { type: Date, default: Date.now },
  processedAt: Date,
  
  // Admin notes
  adminNotes: String,
  rejectionReason: String
}, {
  timestamps: true
});

// Certificate Submission Schema
const CertificateSubmissionSchema = new mongoose.Schema({
  // Unique identifiers
  id: { type: String, required: true, unique: true },
  contractId: { type: String, required: true },
  pvaSerial: { type: String, required: true },
  
  // Certificate information
  assetTitle: { type: String, required: true },
  issueDate: { type: Date, required: true },
  version: { type: String, default: 'v1.0' },
  
  // Asset identifiers
  tokenId: String,
  contractAddress: String,
  chain: { 
    type: String, 
    default: 'base',
    enum: ['base', 'ethereum', 'polygon'] 
  },
  ipfsCid: String,
  
  // Physical properties
  species: String,
  shape: String,
  measurements: String,
  weight: String,
  color: String,
  transparency: String,
  enhancements: String,
  origin: String,
  
  // Ownership and creation
  mintedBy: { type: String, required: true },
  creatorWallet: String,
  owner: String,
  ownerName: String,
  ownerWallet: String,
  royalties: String,
  
  // Verification
  pvaSigner: { type: String, required: true },
  signDate: { type: Date, required: true },
  verificationUrl: String,
  qrCertificate: String,
  qrAsset: String,
  docHash: String,
  
  // Media
  image: String, // Certificate image URL
  
  // Notes and metadata
  metadataNote: String,
  notes: String,
  
  // Status and timestamps
  status: { 
    type: String, 
    default: 'active',
    enum: ['active', 'revoked', 'expired']
  }
}, {
  timestamps: true
});

// Provenance Record Schema
const ProvenanceRecordSchema = new mongoose.Schema({
  // Unique identifiers
  id: { type: String, required: true, unique: true },
  assetId: { type: String, required: true },
  contractId: { type: String, required: true },
  
  // Event information
  eventType: { 
    type: String, 
    required: true,
    enum: ['creation', 'transfer', 'verification', 'authentication', 'modification', 'sale']
  },
  description: { type: String, required: true },
  location: String,
  
  // Parties involved
  parties: [{
    name: String,
    role: { type: String, enum: ['creator', 'owner', 'verifier', 'buyer', 'seller', 'witness'] },
    wallet: String,
    signature: String
  }],
  
  // Verification
  verifiedBy: String,
  verificationMethod: { 
    type: String, 
    enum: ['blockchain', 'physical', 'digital', 'witness', 'lab']
  },
  blockchainTxId: String,
  
  // Additional data
  metadata: mongoose.Schema.Types.Mixed,
  
  // Media evidence
  evidence: [{ type: String }], // Array of evidence URLs (photos, documents, etc.)
  
  // Status
  status: { 
    type: String, 
    default: 'verified',
    enum: ['pending', 'verified', 'disputed', 'invalid']
  }
}, {
  timestamps: true
});

// Marketplace Listing Schema
const MarketplaceListingSchema = new mongoose.Schema({
  // Unique identifiers
  id: { type: String, required: true, unique: true },
  assetId: { type: String, required: true },
  
  // Listing information
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  category: { 
    type: String, 
    required: true,
    enum: ['jewelry', 'gemstone', 'art', 'textile', 'collectible', 'antique', 'other']
  },
  
  // Seller information
  seller: {
    name: { type: String, required: true },
    wallet: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    verified: { type: Boolean, default: false }
  },
  
  // Asset features
  features: {
    materials: String,
    origin: String,
    condition: String,
    authenticated: { type: Boolean, default: false },
    certificated: { type: Boolean, default: false },
    insured: { type: Boolean, default: false }
  },
  
  // Media
  images: [{ type: String }],
  videos: [{ type: String }],
  
  // Pricing and terms
  negotiable: { type: Boolean, default: false },
  shippingIncluded: { type: Boolean, default: false },
  shippingCost: { type: Number, default: 0 },
  returnsAccepted: { type: Boolean, default: true },
  
  // Status and visibility
  status: { 
    type: String, 
    default: 'active',
    enum: ['draft', 'active', 'sold', 'removed', 'suspended']
  },
  featured: { type: Boolean, default: false },
  priority: { type: Number, default: 0 },
  
  // Statistics
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  
  // Admin fields
  moderationNotes: String,
  flagged: { type: Boolean, default: false },
  flagReason: String
}, {
  timestamps: true
});

// Portfolio Item Schema
const PortfolioItemSchema = new mongoose.Schema({
  // Unique identifiers
  id: { type: String, required: true, unique: true },
  assetId: { type: String, required: true },
  
  // Owner information
  owner: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    wallet: String
  },
  
  // Asset summary
  title: { type: String, required: true },
  description: String,
  category: String,
  
  // Ownership details
  acquisitionDate: { type: Date, required: true },
  acquisitionPrice: Number,
  currentValue: Number,
  sharePercentage: { type: Number, default: 100, min: 0, max: 100 },
  
  // Status
  status: { 
    type: String, 
    default: 'owned',
    enum: ['owned', 'shared', 'listed', 'sold', 'transferred']
  },
  
  // Display preferences
  visibility: { 
    type: String, 
    default: 'private',
    enum: ['public', 'private', 'shared']
  },
  featured: { type: Boolean, default: false },
  
  // Media
  thumbnail: String,
  images: [{ type: String }],
  
  // Notes
  personalNotes: String,
  tags: [{ type: String }]
}, {
  timestamps: true
});

// Create indexes for better performance
AssetSubmissionSchema.index({ contractId: 1 });
AssetSubmissionSchema.index({ pvaSerial: 1 });
AssetSubmissionSchema.index({ status: 1 });
AssetSubmissionSchema.index({ category: 1 });
AssetSubmissionSchema.index({ submittedAt: -1 });

CertificateSubmissionSchema.index({ contractId: 1 });
CertificateSubmissionSchema.index({ pvaSerial: 1 });
CertificateSubmissionSchema.index({ tokenId: 1 });

ProvenanceRecordSchema.index({ assetId: 1 });
ProvenanceRecordSchema.index({ contractId: 1 });
ProvenanceRecordSchema.index({ eventType: 1 });
ProvenanceRecordSchema.index({ createdAt: -1 });

MarketplaceListingSchema.index({ status: 1 });
MarketplaceListingSchema.index({ category: 1 });
MarketplaceListingSchema.index({ price: 1 });
MarketplaceListingSchema.index({ featured: 1, priority: -1 });
MarketplaceListingSchema.index({ createdAt: -1 });

PortfolioItemSchema.index({ 'owner.userId': 1 });
PortfolioItemSchema.index({ assetId: 1 });
PortfolioItemSchema.index({ status: 1 });

// Create models
const AssetSubmission = mongoose.model('AssetSubmission', AssetSubmissionSchema);
const CertificateSubmission = mongoose.model('CertificateSubmission', CertificateSubmissionSchema);
const ProvenanceRecord = mongoose.model('ProvenanceRecord', ProvenanceRecordSchema);
const MarketplaceListing = mongoose.model('MarketplaceListing', MarketplaceListingSchema);
const PortfolioItem = mongoose.model('PortfolioItem', PortfolioItemSchema);

module.exports = {
  AssetSubmission,
  CertificateSubmission,
  ProvenanceRecord,
  MarketplaceListing,
  PortfolioItem
};