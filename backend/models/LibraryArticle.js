const mongoose = require('mongoose');

const articleSnapshotSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      required: true,
    },
    markdown: { type: String, default: '' },
    frontmatter: { type: mongoose.Schema.Types.Mixed, default: {} },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewNote: { type: String, default: '' },
    gitCommitHash: { type: String, default: '' },
    ipfsCid: { type: String, default: '' },
    renderedHtml: { type: String, default: '' },
  },
  { _id: false },
);

const libraryArticleSchema = new mongoose.Schema(
  {
    slug: { type: String, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    markdown: { type: String, required: true, default: '' },
    frontmatter: { type: mongoose.Schema.Types.Mixed, default: {} },
    quickFacts: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    version: { type: Number, default: 1 },
    renderedHtml: { type: String, default: '' },
    ipfsCid: { type: String, default: '' },
    ipfsGatewayUrl: { type: String, default: '' },
    gitCommitHash: { type: String, default: '' },
    lastSubmittedAt: { type: Date },
    lastPublishedAt: { type: Date },
    rejectedReason: { type: String, default: '' },
    moderationNote: { type: String, default: '' },
    versionHistory: { type: [articleSnapshotSchema], default: [] },
  },
  { timestamps: true },
);

libraryArticleSchema.index({ slug: 1, status: 1 });
libraryArticleSchema.index({ updatedAt: -1, _id: -1 });
libraryArticleSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LibraryArticle', libraryArticleSchema);
