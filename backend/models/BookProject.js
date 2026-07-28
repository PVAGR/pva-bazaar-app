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
    category: { type: String, default: 'General' }, // e.g., 'Knowledge Archive', 'Agriculture', 'Philosophy'
    genre: { type: String, default: 'general', index: true },
    audience: { type: String, default: 'general', index: true },
    language: { type: String, default: 'en' },
    manuscriptMarkdown: { type: String, default: '' },
    manuscriptUrl: { type: String, default: '' }, // Cloudinary raw URL for manuscript files
    manuscriptType: { type: String, default: '' }, // 'pdf', 'html', 'docx', 'raw'
    manuscriptPdfUrl: { type: String, default: '' }, // Cloudinary raw URL for PDF version
    manuscriptDocxUrl: { type: String, default: '' }, // Cloudinary raw URL for DOCX version
    manuscriptHtml: { type: String, default: '' }, // Cloudinary raw URL for HTML version
    mirrors: {
      type: {
        archiveOrg: { type: String, default: '' },
        ipfs: { type: String, default: '' },
        ipfsCid: { type: String, default: '' },
        storacha: { type: String, default: '' },
        pinata: { type: String, default: '' },
        github: { type: String, default: '' },
      },
      default: {},
    },
    format: {
      type: String,
      enum: ['md', 'txt', 'pdf', 'docx', 'html', ''],
      default: '',
    },
    fileSize: { type: Number, default: 0 },
    coverUrl: { type: String, default: '' }, // Cloudinary image URL for cover
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
    isApproved: { type: Boolean, default: true }, // For future contributor queue
    publishedAt: { type: Date },
    lastRenderedAt: { type: Date },
    publishedVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

bookProjectSchema.index({ slug: 1, status: 1 });
bookProjectSchema.index({ authorId: 1, updatedAt: -1 });

module.exports = mongoose.model('BookProject', bookProjectSchema);
