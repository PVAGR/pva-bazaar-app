const mongoose = require('mongoose');

const ManuscriptVersionSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  version: { type: Number, required: true },
  manuscriptMarkdown: { type: String, default: '' },
  manuscriptUrl: { type: String, default: '' },
  manuscriptPdfUrl: { type: String, default: '' },
  manuscriptDocxUrl: { type: String, default: '' },
  manuscriptHtml: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  changeDescription: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

ManuscriptVersionSchema.index({ bookId: 1, version: -1 });

module.exports = mongoose.model('ManuscriptVersion', ManuscriptVersionSchema);
