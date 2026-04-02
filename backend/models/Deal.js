const mongoose = require('mongoose');

/**
 * Deal
 * Off-chain deal record that can later be backed by an on-chain smart contract.
 * Keeps parties, milestones, payment schedule, and an audit-friendly message log.
 */

const dealMessageSchema = new mongoose.Schema(
  {
    author: { type: String, enum: ['owner', 'counterparty', 'mediator', 'system'], default: 'owner' },
    authorWallet: { type: String, default: '' }, // optional (future: wallet-signed messages)
    text: { type: String, required: true },
    signature: { type: String, default: '' }, // future: EIP-191/EIP-712 signature
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dealPaymentSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    dueOn: { type: Date },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    payerWallet: { type: String, default: '' },
    payeeWallet: { type: String, default: '' },
    txHash: { type: String, default: '' },
  },
  { _id: true }
);

const dealMilestoneSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    evidenceType: {
      type: String,
      enum: ['none', 'tracking_number', 'document', 'message'],
      default: 'none',
    },
    evidenceValue: { type: String, default: '' },
    evidenceAuthorWallet: { type: String, default: '' }, // optional: wallet address that submitted evidence
    evidenceSignature: { type: String, default: '' }, // optional: signed evidence payload (EIP-191)
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: { type: Date },
  },
  { _id: true }
);

const dealMockTransferProofSchema = new mongoose.Schema(
  {
    actor: { type: String, enum: ['buyer', 'seller', 'mediator', 'system'], default: 'system' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
    screenshotUrl: { type: String, default: '' },
    confirmedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dealDisputeEvidenceSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['buyer', 'seller', 'mediator', 'system'], default: 'system' },
    note: { type: String, default: '' },
    attachmentUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dealOutboundDispatchSchema = new mongoose.Schema(
  {
    packetId: { type: String, required: true },
    packetHash: { type: String, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targets: { type: [String], default: [] },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    nextAttemptAt: { type: Date },
    sentAt: { type: Date },
    lastStatusCode: { type: Number },
    lastError: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dealSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional (future: broker role distinct from owner)

    title: { type: String, required: true },
    description: { type: String, default: '' },

    counterparty: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: '' },
      country: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
      contact: { type: String, default: '' }, // optional email/telegram/etc
    },

    // Deal terms
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    mediatorFeePct: { type: Number, default: 0 },

    // Smart contract (future)
    chainId: { type: Number }, // e.g. 8453 Base
    tokenAddress: { type: String, default: '' }, // ERC20 token address or empty for native
    contractAddress: { type: String, default: '' }, // deployed contract address

    status: { type: String, enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' },

    // Counterparty access (foundation for "join link" flow).
    counterpartyAccess: {
      inviteJtiHash: { type: String, default: '' },
      inviteCreatedAt: { type: Date },
      inviteExpiresAt: { type: Date },
      joinedAt: { type: Date },
    },

    escrow: {
      fundingMode: { type: String, enum: ['mock', 'live'], default: 'mock' },
      status: {
        type: String,
        enum: ['draft', 'funded_mock', 'funded_live', 'awaiting_receipt', 'buyer_confirmed', 'released', 'refunded', 'disputed'],
        default: 'draft',
      },
      fundedAmount: { type: Number, default: 0 },
      fundedCurrency: { type: String, default: 'USD' },
      fundedAt: { type: Date },
      releasedAt: { type: Date },
      refundedAt: { type: Date },
      releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      mockTransferProofs: { type: [dealMockTransferProofSchema], default: [] },
    },

    dispute: {
      status: { type: String, enum: ['none', 'open', 'resolved_release', 'resolved_refund'], default: 'none' },
      openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      openedAt: { type: Date },
      reason: { type: String, default: '' },
      details: { type: String, default: '' },
      evidence: { type: [dealDisputeEvidenceSchema], default: [] },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: { type: Date },
      resolutionCode: { type: String, default: '' },
      resolutionNote: { type: String, default: '' },
      resolutionHash: { type: String, default: '' },
    },

    mediation: {
      mode: { type: String, enum: ['none', 'platform', 'custom'], default: 'none' },
      status: { type: String, enum: ['none', 'requested', 'assigned', 'approved', 'declined'], default: 'none' },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      assignedAt: { type: Date },
      customRequest: {
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        contact: { type: String, default: '' },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String, default: '' },
      },
      approvalNote: { type: String, default: '' },
    },

    payments: { type: [dealPaymentSchema], default: [] },
    milestones: { type: [dealMilestoneSchema], default: [] },
    messages: { type: [dealMessageSchema], default: [] },
    outboundDispatchQueue: { type: [dealOutboundDispatchSchema], default: [] },
  },
  { timestamps: true }
);

dealSchema.index({ ownerId: 1, createdAt: -1 });
dealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Deal', dealSchema);

