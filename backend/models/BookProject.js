const mongoose = require('mongoose');

const bookAssetSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['cloudinary', 'local'],
      default: 'local',
    },
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    localFilename: { type: String, default: '' },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    checksumSha256: { type: String, default: '' },
  },
  { _id: false },
);

const bookProjectSchema = new mongoose.Schema(
  {
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    subtitle: { type: String, default: '' },
    authorName: { type: String, default: '' },
    slug: { type: String, trim: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    genre: { type: String, default: 'general', index: true },
    audience: { type: String, default: 'general', index: true },
    language: { type: String, default: 'en' },
    manuscriptMarkdown: { type: String, default: '' },
    frontCover: { type: bookAssetSchema, default: {} },
    backCover: { type: bookAssetSchema, default: {} },
    webHtml: { type: String, default: '' },
    wordCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    lastRenderedAt: { type: Date },
    publishedVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

bookProjectSchema.index({ slug: 1, status: 1 });
bookProjectSchema.index({ authorId: 1, updatedAt: -1 });

module.exports = mongoose.model('BookProject', bookProjectSchema);
