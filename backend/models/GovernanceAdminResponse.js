const mongoose = require('mongoose');

const governanceExecutionMilestoneSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  title: { type: String, default: '' },
  done: { type: Boolean, default: false },
}, { _id: false });

const governanceExecutionBlockSchema = new mongoose.Schema({
  owner: { type: String, default: '', trim: true, maxlength: 200 },
  milestones: { type: [governanceExecutionMilestoneSchema], default: [] },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  latestUpdate: { type: String, default: '', trim: true, maxlength: 4000 },
  completed: { type: Boolean, default: false },
}, { _id: false });

const governanceExecutionUpdateSchema = new mongoose.Schema({
  message: { type: String, default: '', trim: true, maxlength: 4000 },
  progressPercent: { type: Number, min: 0, max: 100 },
  milestone: { type: governanceExecutionMilestoneSchema, default: null },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const governanceAdminResponseSchema = new mongoose.Schema({
  proposalId: {
    type: String,
    required: true,
    trim: true,
    index: true,
    unique: true,
    maxlength: 200,
  },
  decision: {
    type: String,
    enum: ['public', 'conference_queue', 'accepted', 'rejected', 'needs_revision', 'in_execution', 'completed'],
    default: 'public',
  },
  reason: { type: String, default: '', trim: true, maxlength: 4000 },
  nextStep: { type: String, default: '', trim: true, maxlength: 4000 },
  targetTimeline: { type: String, default: '', trim: true, maxlength: 200 },
  executionBlock: { type: governanceExecutionBlockSchema, default: null },
  executionUpdates: { type: [governanceExecutionUpdateSchema], default: [] },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('GovernanceAdminResponse', governanceAdminResponseSchema);
