// backend/models/ForumThread.js - Discussion forums with categories
const mongoose = require('mongoose');

const forumCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  slug: { type: String, unique: true, sparse: true },
  description: String,
  icon: String, // emoji or URL
  color: String, // hex color
  topicGuidelines: String,
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Metadata
  threadCount: { type: Number, default: 0 },
  postCount: { type: Number, default: 0 },
  lastActivityAt: Date,

  // Settings
  requireModeration: { type: Boolean, default: false },
  allowAttachments: { type: Boolean, default: true },
  private: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const forumThreadSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumCategory',
    required: true,
    index: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Content
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: [String],

  // Engagement
  views: { type: Number, default: 0, index: true },
  likes: { type: Number, default: 0 },
  likedBy: [mongoose.Schema.Types.ObjectId],

  // Replies
  replies: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      authorId: mongoose.Schema.Types.ObjectId,
      content: String,
      createdAt: Date,
      likes: { type: Number, default: 0 },
      likedBy: [mongoose.Schema.Types.ObjectId],
    },
  ],
  replyCount: { type: Number, default: 0 },

  // Status & moderation
  pinned: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  solved: { type: Boolean, default: false },
  flagged: { type: Boolean, default: false },
  flagReason: String,

  // Author reputation
  authorReputation: { type: Number, default: 0 },
  helpfulCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
forumThreadSchema.index({ categoryId: 1, pinned: -1, createdAt: -1 });
forumThreadSchema.index({ authorId: 1, createdAt: -1 });
forumThreadSchema.index({ tags: 1 });
forumThreadSchema.index({ views: -1 });

// Auto-update updatedAt
forumThreadSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

forumCategorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = {
  ForumCategory: mongoose.model('ForumCategory', forumCategorySchema),
  ForumThread: mongoose.model('ForumThread', forumThreadSchema),
};
