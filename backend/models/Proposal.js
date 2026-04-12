const mongoose = require('mongoose');
const crypto = require('crypto');

const PROPOSAL_CATEGORIES = [
  'governance',
  'economy',
  'health',
  'learning',
  'housing',
  'justice',
  'culture',
  'infrastructure',
  'emergency',
];

const PROPOSAL_STATUSES = [
  'draft',
  'open',
  'endorsed',
  'in_deliberation',
  'voting',
  'accepted',
  'rejected',
  'needs_revision',
  'archived',
];

const OFFICIAL_DECISIONS = ['accepted', 'rejected', 'needs_revision', 'deferred'];
const EXECUTION_STATUSES = ['not_started', 'in_progress', 'completed', 'stalled'];

function randomProposalId() {
  const numeric = crypto.randomInt(0, 100000);
  return `PROP-${String(numeric).padStart(5, '0')}`;
}

const proposalSchema = new mongoose.Schema(
  {
    proposalId: { type: String, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, enum: PROPOSAL_CATEGORIES },
    problem: { type: String, required: true, trim: true, maxlength: 2000 },
    solution: { type: String, required: true, trim: true, maxlength: 2000 },
    expectedOutcome: { type: String, required: true, trim: true, maxlength: 1000 },
    estimatedCost: { type: String, default: '', trim: true },
    timeline: { type: String, default: '', trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: PROPOSAL_STATUSES, default: 'draft', index: true },
    endorsements: {
      type: [
        {
          citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          endorsedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    endorsementCount: { type: Number, default: 0 },
    endorsementThreshold: { type: Number, default: 10 },
    thresholdReachedAt: { type: Date, default: null },
    conferenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    officialResponse: {
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      decision: { type: String, enum: OFFICIAL_DECISIONS },
      explanation: { type: String, default: '', trim: true },
      respondedAt: { type: Date },
    },
    executionProject: {
      owner: { type: String, default: '', trim: true },
      milestones: { type: [String], default: [] },
      budget: { type: String, default: '', trim: true },
      status: { type: String, enum: EXECUTION_STATUSES, default: 'not_started' },
      updates: {
        type: [
          {
            text: { type: String, required: true, trim: true },
            postedAt: { type: Date, default: Date.now },
          },
        ],
        default: [],
      },
    },
    voteRecord: {
      yes: { type: Number, default: 0 },
      no: { type: Number, default: 0 },
      abstain: { type: Number, default: 0 },
      voters: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    },
    ipfsHash: { type: String, default: '', trim: true },
    isPublic: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

proposalSchema.index({ status: 1, category: 1, createdAt: -1 });
proposalSchema.index({ submittedBy: 1, createdAt: -1 });
proposalSchema.index({ endorsementCount: -1, createdAt: -1 });

proposalSchema.pre('validate', async function ensureProposalId(next) {
  if (this.proposalId) return next();

  let attempts = 0;
  while (attempts < 30) {
    const candidate = randomProposalId();
    // eslint-disable-next-line no-await-in-loop
    const exists = await this.constructor.exists({ proposalId: candidate });
    if (!exists) {
      this.proposalId = candidate;
      return next();
    }
    attempts += 1;
  }

  return next(new Error('Unable to generate unique proposalId'));
});

module.exports = mongoose.model('Proposal', proposalSchema);
module.exports.PROPOSAL_CATEGORIES = PROPOSAL_CATEGORIES;
module.exports.PROPOSAL_STATUSES = PROPOSAL_STATUSES;
module.exports.OFFICIAL_DECISIONS = OFFICIAL_DECISIONS;
module.exports.EXECUTION_STATUSES = EXECUTION_STATUSES;
