const mongoose = require('mongoose');

const bountySchema = new mongoose.Schema({
  // Where this bounty was discovered
  platform: {
    type: String,
    enum: ['dework', 'github', 'reddit', 'discord', 'manual', 'other'],
    required: true,
  },
  platformId: { type: String }, // External task/issue ID
  platformUrl: { type: String }, // Direct link to the bounty

  // Task content
  title: { type: String, required: true },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  keywords: [{ type: String }], // which keywords triggered discovery

  // Payout details
  rewardAmount: { type: String }, // e.g. "500 USDC"
  rewardToken: { type: String }, // e.g. "USDC", "ETH"
  rewardRaw: { type: Number }, // numeric value for sorting
  chain: { type: String, default: 'base' },

  // Lifecycle
  status: {
    type: String,
    enum: [
      'discovered',
      'draft_ready',
      'pending_review',
      'approved',
      'submitted',
      'won',
      'lost',
      'skipped',
    ],
    default: 'discovered',
    index: true,
  },

  // AI-generated draft for HITL review
  draftContent: { type: String, default: '' },
  draftGeneratedAt: { type: Date },
  draftModel: { type: String, default: '' }, // which model generated it

  // Submission tracking
  submittedAt: { type: Date },
  submissionPayload: { type: mongoose.Schema.Types.Mixed },

  // Payout tracking
  payoutTxHash: { type: String },
  payoutAmount: { type: String },
  payoutWallet: { type: String },
  payoutConfirmedAt: { type: Date },

  // Human review
  reviewedBy: { type: String, default: '' },
  reviewNotes: { type: String, default: '' },
  reviewedAt: { type: Date },

  // Deadline
  expiresAt: { type: Date },

  // Raw data from source
  rawData: { type: mongoose.Schema.Types.Mixed, default: {} },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

bountySchema.index({ status: 1, createdAt: -1 });
bountySchema.index({ platform: 1, platformId: 1 }, { unique: true, sparse: true });

bountySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Bounty', bountySchema);
