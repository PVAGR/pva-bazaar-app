// backend/models/Article.js - Knowledge base articles, tutorials, stories
const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Content
  content: { type: String, required: true }, // Markdown
  excerpt: String,
  thumbnail: String,
  coverImage: String,

  // Categorization
  category: {
    type: String,
    enum: ['tutorial', 'story', 'news', 'guide', 'tips', 'how_to', 'inspiration', 'research'],
    required: true,
    index: true,
  },
  tags: [String],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },

  // Metadata
  readTime: Number, // minutes (calculated)
  wordCount: Number,
  language: { type: String, default: 'en' },

  // Engagement
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  likedBy: [mongoose.Schema.Types.ObjectId],

  // Comments & discussion
  comments: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      authorId: mongoose.Schema.Types.ObjectId,
      content: String,
      createdAt: Date,
      likes: { type: Number, default: 0 },
      replies: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          authorId: mongoose.Schema.Types.ObjectId,
          content: String,
          createdAt: Date,
        },
      ],
    },
  ],

  // Media
  images: [String],
  videos: [String],
  externalLinks: [
    {
      title: String,
      url: String,
      description: String,
    },
  ],

  // Related content
  relatedArticles: [mongoose.Schema.Types.ObjectId],
  relatedProducts: [mongoose.Schema.Types.ObjectId],
  relatedArtisans: [mongoose.Schema.Types.ObjectId],

  // Status & publishing
  published: { type: Boolean, default: false },
  publishedAt: Date,
  featured: { type: Boolean, default: false },
  featuredUntil: Date,
  archived: { type: Boolean, default: false },

  // Editorial
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvedAt: Date,
  flagged: { type: Boolean, default: false },
  flagReason: String,

  // SEO
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],

  // Ratings & reviews
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

  // Translations
  translations: {
    type: Map,
    of: {
      title: String,
      content: String,
      excerpt: String,
    },
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
articleSchema.index({ author: 1, published: 1 });
articleSchema.index({ category: 1, published: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ featured: 1, publishedAt: -1 });
articleSchema.index({ views: -1 });

articleSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Calculate read time (200 words per minute)
  if (this.content) {
    const words = this.content.trim().split(/\s+/).length;
    this.readTime = Math.ceil(words / 200);
    this.wordCount = words;
  }
  next();
});

module.exports = mongoose.model('Article', articleSchema);
