const mongoose = require('mongoose');

const governanceProposalSupportSchema = new mongoose.Schema({
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GovernanceProposal',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

governanceProposalSupportSchema.index({ proposalId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('GovernanceProposalSupport', governanceProposalSupportSchema);
