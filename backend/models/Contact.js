const mongoose = require('mongoose');

const outreachLogSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
    response: { type: String, default: '' },
    status: { type: String, default: 'sent' }, // sent, replied, no_reply
  },
  { _id: true }
);

/**
 * Contact - CRM for suppliers, buyers, producers
 */
const contactSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    telegram: { type: String, default: '' },
    company: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    type: {
      type: String,
      enum: ['supplier', 'buyer', 'producer', 'distributor'],
      default: 'supplier',
    },
    commodities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commodity' }],
    notes: { type: String, default: '' },
    outreachLog: { type: [outreachLogSchema], default: [] },
    birthDate: { type: Date },
    birthTime: { type: String, default: '' },
    birthPlace: { type: String, default: '' },
  },
  { timestamps: true }
);

contactSchema.index({ ownerId: 1, createdAt: -1 });
contactSchema.index({ ownerId: 1, type: 1 });

module.exports = mongoose.model('Contact', contactSchema);
