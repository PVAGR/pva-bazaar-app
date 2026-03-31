const mongoose = require('mongoose');

const libraryTaxonomySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    categories: [{ type: String, trim: true }],
    domains: [{ type: String, trim: true }],
    roles: [{ type: String, trim: true }],
    domainRoles: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, default: 'admin' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('LibraryTaxonomy', libraryTaxonomySchema);