const mongoose = require('mongoose');

const promoterSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, minlength: 4, maxlength: 4 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    handle: { type: String, trim: true, maxlength: 80 },
    platform: { type: String, trim: true, maxlength: 40 },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    redemptions: [
      {
        itemId: { type: String },
        itemSlug: { type: String },
        itemTitle: { type: String },
        itemPriceCents: { type: Number, default: 0 },
        commissionPercent: { type: Number, default: 0 },
        commissionCents: { type: Number, default: 0 },
        buyerName: { type: String, default: '' },
        buyerEmail: { type: String, default: '' },
        buyerNote: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promoter', promoterSchema);
