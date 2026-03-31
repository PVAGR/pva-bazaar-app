const mongoose = require('mongoose');

const libraryDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'general', index: true },
    domain: { type: String, default: 'general', index: true },
    skillLevel: {
      type: String,
      enum: ['intro', 'intermediate', 'advanced'],
      default: 'intro',
    },
    language: { type: String, default: 'en' },
    tags: [{ type: String, trim: true }],
    visibility: {
      type: String,
      enum: ['public', 'admin-only'],
      default: 'public',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    storage: {
      primary: {
        provider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
        localFilename: { type: String, default: '' },
      },
      backup: {
        provider: { type: String, enum: ['local', 'none'], default: 'none' },
        url: { type: String, default: '' },
        localFilename: { type: String, default: '' },
      },
    },
    file: {
      originalName: { type: String, default: '' },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: 'application/octet-stream' },
      checksumSha256: { type: String, default: '' },
    },
    downloadCount: { type: Number, default: 0 },
    createdBy: { type: String, default: 'admin' },
  },
  { timestamps: true },
);

libraryDocumentSchema.index({ createdAt: -1, _id: -1 });
libraryDocumentSchema.index({ title: 'text', description: 'text', tags: 'text', category: 'text', domain: 'text' });

module.exports = mongoose.model('LibraryDocument', libraryDocumentSchema);