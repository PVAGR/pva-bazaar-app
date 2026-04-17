const mongoose = require('mongoose');

const federationPresenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, default: '' },
    societalId: { type: String, default: '' },
    passportStatus: { type: String, default: 'unverified' },
    citizenRole: { type: String, default: 'citizen' },
    country: { type: String, default: '', index: true },
    countryCode: { type: String, default: '', index: true },
    jobTitle: { type: String, default: '' },
    introRecommendedRole: { type: String, default: '' },
    introScore: { type: Number, default: 0 },
    careerTopRoles: { type: [String], default: [] },
    careerTopDomains: { type: [String], default: [] },
    lastSource: { type: String, enum: ['manual', 'ip-lookup', 'passport', 'system'], default: 'manual' },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
  },
);

federationPresenceSchema.index({ countryCode: 1, lastSeenAt: -1 });
federationPresenceSchema.index({ lastSeenAt: -1 });

module.exports = mongoose.model('FederationPresence', federationPresenceSchema);
