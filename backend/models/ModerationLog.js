const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryArticle',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: { type: String, default: 'user', trim: true },
    action: {
      type: String,
      enum: ['submit', 'approve', 'reject', 'publish', 'update'],
      required: true,
      index: true,
    },
    beforeStatus: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
    },
    afterStatus: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
    },
    diffSummary: {
      addedLines: { type: Number, default: 0 },
      removedLines: { type: Number, default: 0 },
      changedLines: { type: Number, default: 0 },
      preview: { type: String, default: '' },
    },
    note: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

moderationLogSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
