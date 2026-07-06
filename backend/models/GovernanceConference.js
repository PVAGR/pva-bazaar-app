const mongoose = require('mongoose');

const governanceConferenceSchema = new mongoose.Schema(
  {
    cycleKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    cadence: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'biweekly',
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'closed', 'archived'],
      default: 'planned',
    },
    proposalFreezeAt: {
      type: Date,
    },
    debateStartsAt: {
      type: Date,
    },
    voteStartsAt: {
      type: Date,
    },
    voteEndsAt: {
      type: Date,
    },
    publishedAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

governanceConferenceSchema.index({ status: 1, voteStartsAt: 1 });

module.exports = mongoose.model('GovernanceConference', governanceConferenceSchema);
