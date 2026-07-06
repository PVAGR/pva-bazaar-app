// backend/models/KnowledgeNode.js - Knowledge graph for linked concepts
const mongoose = require('mongoose');

const knowledgeNodeSchema = new mongoose.Schema({
  // Node identity
  title: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  type: {
    type: String,
    enum: ['concept', 'technique', 'tradition', 'material', 'tool', 'craftsperson', 'brand'],
    required: true,
    index: true,
  },

  // Content
  description: { type: String, required: true },
  content: String, // Markdown for detailed info
  image: String,
  thumbnail: String,

  // Origin & context
  origin: {
    country: String,
    region: String,
    culture: String,
  },
  historicalBackground: String,
  culturalSignificance: String,

  // Classification
  tags: [String],
  category: String,
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },

  // Contributors & collaboration
  creators: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      role: String, // Original creator, translator, editor
      contributedAt: Date,
    },
  ],
  communityEditable: { type: Boolean, default: true },
  editHistory: [
    {
      editorId: mongoose.Schema.Types.ObjectId,
      change: String,
      editedAt: Date,
    },
  ],

  // Knowledge graph: Links to other nodes
  linkedTo: [
    {
      nodeId: mongoose.Schema.Types.ObjectId,
      relationshipType: {
        type: String,
        enum: [
          'teaches',
          'uses',
          'related_to',
          'evolved_from',
          'part_of',
          'parent_of',
          'similar_to',
        ],
      },
      strength: Number, // 1-5, how strongly related
    },
  ],
  parents: [mongoose.Schema.Types.ObjectId], // Broader concepts
  children: [mongoose.Schema.Types.ObjectId], // More specific concepts

  // Resources & references
  articles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  videos: [String],
  externalResources: [
    {
      title: String,
      url: String,
      source: String,
      description: String,
    },
  ],
  relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductType' }],
  relatedArtisans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Engagement
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  followers: [mongoose.Schema.Types.ObjectId], // Users who follow to learn

  // Community feedback
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  reviews: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      rating: Number,
      helpful: Boolean,
      ratedAt: Date,
    },
  ],

  // Multi-language support
  language: { type: String, default: 'en' },
  translations: {
    type: Map,
    of: {
      title: String,
      description: String,
      content: String,
    },
  },

  // Status & curation
  published: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verifiedBy: mongoose.Schema.Types.ObjectId,
  flagged: { type: Boolean, default: false },
  flagReason: String,

  // SEO
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
knowledgeNodeSchema.index({ type: 1, published: 1 });
knowledgeNodeSchema.index({ tags: 1 });
knowledgeNodeSchema.index({ 'linkedTo.nodeId': 1 });
knowledgeNodeSchema.index({ views: -1 });
knowledgeNodeSchema.index({ language: 1 });

knowledgeNodeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('KnowledgeNode', knowledgeNodeSchema);
