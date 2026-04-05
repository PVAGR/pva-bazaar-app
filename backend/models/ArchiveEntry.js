
const mongoose = require('mongoose');


const ArchiveEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    category: { type: String, default: 'journal' },
    description: { type: String, default: '' }, // canonical
    content: { type: String, default: '' }, // canonical
    wordCount: { type: Number, default: 0 }, // canonical
    tags: [{ type: String }],
    media: [{ type: String }],
    location: { type: String, default: '' },
    externalId: { type: String, default: '' },
    // Legacy/compat fields
    contentHtml: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Compound index for stable pagination
ArchiveEntrySchema.index({ createdAt: -1, _id: -1 });
ArchiveEntrySchema.index({ createdAt: 1, _id: 1 });
// Text index for search
ArchiveEntrySchema.index({ title: 'text', description: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('ArchiveEntry', ArchiveEntrySchema);
