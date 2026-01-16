const mongoose = require('mongoose');

const ArchiveEntrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, default: Date.now },
    contentHtml: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    tags: [{ type: String }],
    category: { type: String, default: 'journal' },
    location: { type: String, default: '' },
    externalId: { type: String, default: '' },
    media: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('ArchiveEntry', ArchiveEntrySchema);
