const mongoose = require('mongoose');

/**
 * Template - Vetting prompts, intro emails, pitch copy
 * Pre-seeded with broker vetting templates for coffee, etc.
 */
const templateSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['vetting', 'intro', 'pitch'],
      default: 'vetting',
    },
    body: { type: String, required: true },
    commodityTags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commodity' }],
    stepTags: [{ type: String, enum: ['procurement', 'payment', 'shipping', 'sale'] }],
  },
  { timestamps: true },
);

templateSchema.index({ ownerId: 1, createdAt: -1 });
templateSchema.index({ ownerId: 1, type: 1 });

module.exports = mongoose.model('Template', templateSchema);
