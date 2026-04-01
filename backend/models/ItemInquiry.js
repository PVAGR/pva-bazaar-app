const mongoose = require('mongoose');

const itemInquirySchema = new mongoose.Schema({
  artifact: { type: mongoose.Schema.Types.ObjectId, ref: 'Artifact', index: true },
  itemSlug: { type: String, default: '', index: true },
  itemName: { type: String, default: '' },
  itemSku: { type: String, default: '' },
  itemSnapshotUrl: { type: String, default: '' },
  requesterName: { type: String, required: true, trim: true },
  requesterEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
  requesterCompany: { type: String, default: '', trim: true },
  message: { type: String, required: true, trim: true },
  quantityRequested: { type: Number, default: 1 },
  requestType: {
    type: String,
    enum: ['sample', 'availability', 'bulk', 'custom'],
    default: 'sample',
  },
  reservationRequested: { type: Boolean, default: false },
  reservationApplied: { type: Boolean, default: false },
  reservationReleasedAt: { type: Date },
  status: {
    type: String,
    enum: ['new', 'contacted', 'reserved', 'closed'],
    default: 'new',
    index: true,
  },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

itemInquirySchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model('ItemInquiry', itemInquirySchema);
