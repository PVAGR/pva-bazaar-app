const mongoose = require('mongoose');

const governanceProposalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    problem: {
      type: String,
      default: '',
      trim: true,
      maxlength: 3000,
    },
    solution: {
      type: String,
      default: '',
      trim: true,
      maxlength: 3000,
    },
    expectedOutcome: {
      type: String,
      default: '',
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'public_discussion',
        'threshold_reached',
        'conference_queue',
        'agenda_published',
        'vote_window',
        'outcome_published',
        'archived',
      ],
      default: 'public_discussion',
    },
    outcome: {
      type: String,
      enum: ['accepted', 'planned', 'deferred', 'rejected', null],
      default: null,
    },
    outcomeRationale: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    plannedTargetDate: {
      type: Date,
    },
    tags: {
      type: [String],
      default: [],
    },
    cycleKey: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    supportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    voteCounts: {
      yes: { type: Number, default: 0, min: 0 },
      no: { type: Number, default: 0, min: 0 },
      abstain: { type: Number, default: 0, min: 0 },
    },
    voteWindow: {
      startsAt: { type: Date },
      endsAt: { type: Date },
    },
    onChain: {
      chainId: { type: Number },
      contractAddress: { type: String, trim: true, default: '' },
      proposalRef: { type: String, trim: true, default: '' },
      tallyTxHash: { type: String, trim: true, default: '' },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    queuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

governanceProposalSchema.index({ status: 1, updatedAt: -1 });
governanceProposalSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('GovernanceProposal', governanceProposalSchema);
