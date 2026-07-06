const mongoose = require('mongoose');

/**
 * Commodity - Research hub for broker intelligence
 * Stores market data, red/green flags, notes for any commodity (coffee, gemstones, soapstone, etc.)
 */
const commoditySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: '' }, // coffee, gemstones, soapstone, malachite, etc.
    notes: { type: String, default: '' },
    marketData: {
      fobRange: { type: String, default: '' },
      sampleCostMax: { type: Number },
      certificationsNeeded: { type: String, default: '' },
      exportDocs: { type: String, default: '' },
    },
    redFlags: { type: [String], default: [] },
    greenFlags: { type: [String], default: [] },
    linkedTemplateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
    linkedContactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
  },
  { timestamps: true },
);

commoditySchema.index({ ownerId: 1, createdAt: -1 });
commoditySchema.index({ ownerId: 1, category: 1 });

module.exports = mongoose.model('Commodity', commoditySchema);
