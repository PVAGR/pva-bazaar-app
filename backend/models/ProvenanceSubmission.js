// backend/models/ProvenanceSubmission.js - Comprehensive provenance data model
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'processing', 'minted', 'published', 'rejected'],
      default: 'draft',
      index: true,
    },

    // STEP 0: Object Type Selection
    objectType: {
      type: String,
      enum: ['gemstone', 'jewelry', 'art', 'craft', 'collectible', 'food', 'material', 'other'],
      required: true,
    },

    // STEP 1: Material Truth
    materialTruth: {
      objectName: String,
      shortDescription: String,
      creationDate: Date,
      weight: {
        value: Number,
        unit: { type: String, enum: ['g', 'kg', 'ct', 'oz', 'lb'] },
      },
      dimensions: String, // e.g., "10x5x5 cm"
      materials: [String], // e.g., ["Gold", "Ruby", "Diamond"]

      // Adaptive fields by type
      gemstone: {
        species: String,
        variety: String,
        cut: String,
        clarity: String,
        treatment: String,
      },
      craft: {
        technique: String, // e.g., "wheel-thrown", "forged"
        toolsUsed: [String],
        firingTemperature: Number,
      },
      food: {
        originFarm: String,
        harvestDate: Date,
        organic: Boolean,
        roastDate: Date,
        roastLevel: String,
      },
      art: {
        medium: String,
        style: String,
        signatureLocation: String,
      },
    },

    // STEP 2: Human Narrative (The Soul)
    humanNarrative: {
      story: String, // Main narrative
      creatorStatement: String, // Creator intent
      journey: String, // Where it's been
      significance: String, // Why it matters
      culturalContext: String, // Cultural/historical background
      techniques: String, // Methods & processes used
      inspiration: String, // What inspired creation
    },

    // STEP 3: Verifiable Proof
    provenanceProof: {
      proofType: {
        type: String,
        enum: ['photos', 'documents', 'qr_scan', 'blockchain', 'certification', 'gps_location', 'combined'],
      },

      photos: [
        {
          url: String,
          caption: String,
          type: {
            type: String,
            enum: ['object', 'creator', 'workshop', 'process', 'certificate', 'other'],
          },
          metadata: {
            timestamp: Date,
            location: { latitude: Number, longitude: Number },
          },
        },
      ],

      documents: [
        {
          url: String,
          type: {
            type: String,
            enum: ['certificate', 'receipt', 'invoice', 'appraisal', 'patent', 'other'],
          },
          issuerName: String,
          issueDate: Date,
          verified: Boolean,
        },
      ],

      qrCode: {
        code: String,
        previousOwner: String,
        previousSubmission: mongoose.Schema.Types.ObjectId,
      },

      blockchainProof: {
        contractAddress: String,
        tokenId: String,
        chainId: Number,
        transactionHash: String,
      },

      gpsLocation: {
        latitude: Number,
        longitude: Number,
        accuracy: Number, // meters
        timestamp: Date,
        verified: Boolean,
      },

      certifierInfo: {
        certifierName: String,
        certifierRole: String,
        certificationDate: Date,
        certificationUrl: String,
      },
    },

    // STEP 4: Creator/Owner Information
    creatorInfo: {
      name: String,
      email: String,
      country: String,
      bio: String,
      isArtisan: Boolean,
      artisanRegistrationId: String,
      website: String,
      socialMedia: {
        instagram: String,
        twitter: String,
        website: String,
      },
    },

    // STEP 5: NFT & Marketplace
    nftData: {
      minted: { type: Boolean, default: false },
      contractAddress: String,
      tokenId: String,
      tokenURI: String,
      chainId: Number, // Base network
      mintedAt: Date,
      gasUsed: String,
      transactionHash: String,
    },

    marketplaceData: {
      listingId: mongoose.Schema.Types.ObjectId,
      shopId: mongoose.Schema.Types.ObjectId,
      autoCreateListing: { type: Boolean, default: true },
      suggestedPrice: Number,
      currency: { type: String, default: 'USD' },
    },

    // Metadata & Scoring
    completeness: {
      materialTruthScore: Number, // 0-100
      narrativeScore: Number, // 0-100
      proofScore: Number, // 0-100
      overallScore: Number, // 0-100
    },

    fraud: {
      flagged: Boolean,
      flagReason: String,
      confidenceScore: Number, // 0-100
      appealedAt: Date,
      appealResponse: String,
    },

    tags: [String],
    searchKeywords: [String],

    // History
    submissions: [
      {
        timestamp: Date,
        step: Number,
        changes: mongoose.Schema.Types.Mixed,
      },
    ],

    approvals: [
      {
        approverType: String, // 'admin', 'certifier', 'community'
        approvedAt: Date,
        notes: String,
      },
    ],
  },
  { timestamps: true }
);

// Indexes for efficient querying
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ objectType: 1 });
submissionSchema.index({ 'nftData.minted': 1 });
submissionSchema.index({ 'completeness.overallScore': -1 });
submissionSchema.index({ searchKeywords: 1 });
submissionSchema.index({ 'marketplaceData.listingId': 1 });

// Calculate completeness score
submissionSchema.methods.calculateCompleteness = function () {
  const scores = { material: 0, narrative: 0, proof: 0 };

  // Material truth scoring
  const mt = this.materialTruth;
  if (mt.objectName && mt.shortDescription && mt.materials.length) scores.material += 30;
  if (mt.creationDate && mt.weight && mt.dimensions) scores.material += 20;
  if (mt[this.objectType]) scores.material += 50;
  this.completeness.materialTruthScore = Math.min(scores.material, 100);

  // Narrative scoring
  const hn = this.humanNarrative;
  if (hn.story && hn.creatorStatement) scores.narrative += 40;
  if (hn.journey && hn.significance) scores.narrative += 30;
  if (hn.culturalContext && hn.inspiration) scores.narrative += 30;
  this.completeness.narrativeScore = Math.min(scores.narrative, 100);

  // Proof scoring
  const pp = this.provenanceProof;
  if (pp.photos && pp.photos.length >= 3) scores.proof += 40;
  if (pp.documents && pp.documents.length >= 1) scores.proof += 30;
  if (pp.blockchainProof) scores.proof += 20;
  if (pp.certifierInfo) scores.proof += 10;
  this.completeness.proofScore = Math.min(scores.proof, 100);

  // Overall
  this.completeness.overallScore =
    (this.completeness.materialTruthScore +
      this.completeness.narrativeScore +
      this.completeness.proofScore) /
    3;

  return this.completeness;
};

// Generate search keywords from submission
submissionSchema.methods.generateKeywords = function () {
  const keywords = new Set();

  // Add object type
  keywords.add(this.objectType);

  // Add materials
  if (this.materialTruth.materials) {
    this.materialTruth.materials.forEach((m) => keywords.add(m.toLowerCase()));
  }

  // Add country
  if (this.creatorInfo.country) {
    keywords.add(this.creatorInfo.country.toLowerCase());
  }

  // Add tags
  if (this.tags) {
    this.tags.forEach((t) => keywords.add(t.toLowerCase()));
  }

  // Add object name words
  if (this.materialTruth.objectName) {
    this.materialTruth.objectName.split(' ').forEach((word) => {
      if (word.length > 3) keywords.add(word.toLowerCase());
    });
  }

  this.searchKeywords = Array.from(keywords);
  return this.searchKeywords;
};

module.exports = mongoose.model('ProvenanceSubmission', submissionSchema);
