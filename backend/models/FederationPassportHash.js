const mongoose = require('mongoose');

const federationPassportHashSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    passportHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passportCountryCode: { type: String, default: '', index: true },
    source: {
      type: String,
      enum: ['self-attested', 'admin-verified', 'system'],
      default: 'self-attested',
    },
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

federationPassportHashSchema.index({ passportCountryCode: 1, verifiedAt: -1 });

module.exports = mongoose.model('FederationPassportHash', federationPassportHashSchema);
