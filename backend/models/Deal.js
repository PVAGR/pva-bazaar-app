const mongoose = require('mongoose');

/**
 * Deal
 * Off-chain deal record that can later be backed by an on-chain smart contract.
 * Keeps parties, milestones, payment schedule, and an audit-friendly message log.
 */

const dealMessageSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      enum: [
        'owner',
        'counterparty',
        'mediator',
        'system',
        'seller',
        'buyer',
        'creator',
        'shipper',
      ],
      default: 'owner',
    },
    authorWallet: { type: String, default: '' }, // optional (future: wallet-signed messages)
    text: { type: String, required: true },
    signature: { type: String, default: '' }, // future: EIP-191/EIP-712 signature
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
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
  { _id: true },
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
    assignedRole: {
      type: String,
      enum: ['any', 'buyer', 'seller', 'creator', 'shipper', 'mediator'],
      default: 'any',
    },
    evidenceValue: { type: String, default: '' },
    evidenceAuthorWallet: { type: String, default: '' }, // optional: wallet address that submitted evidence
    evidenceSignature: { type: String, default: '' }, // optional: signed evidence payload (EIP-191)
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: { type: Date },
  },
  { _id: true },
);

const dealMockTransferProofSchema = new mongoose.Schema(
  {
    actor: {
      type: String,
      enum: ['buyer', 'seller', 'creator', 'shipper', 'mediator', 'system'],
      default: 'system',
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
    screenshotUrl: { type: String, default: '' },
    confirmedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const dealDisputeEvidenceSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'creator', 'shipper', 'mediator', 'system'],
      default: 'system',
    },
    note: { type: String, default: '' },
    attachmentUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
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
  { _id: true },
);

const dealVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    verifiedAt: { type: Date, default: Date.now },
    method: { type: String, default: 'jwt' },
    note: { type: String, default: '' },
  },
  { _id: true },
);

const dealAuditEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true },
);

const dealPvaPartySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['buyer', 'creator', 'shipper'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    walletAddress: { type: String, default: '' },
  },
  { _id: true },
);

const dealPvaSplitSchema = new mongoose.Schema(
  {
    creatorPct: { type: Number, default: 45 },
    shipperPct: { type: Number, default: 35 },
    platformPct: { type: Number, default: 10 },
    bufferPct: { type: Number, default: 10 },
  },
  { _id: false },
);

const dealPvaCollateralSchema = new mongoose.Schema(
  {
    creatorStakePct: { type: Number, default: 50 },
    shipperStakePct: { type: Number, default: 50 },
    stakeMode: { type: String, enum: ['escrow', 'signature_commitment'], default: 'escrow' },
  },
  { _id: false },
);

const dealPvaRouteScoreSchema = new mongoose.Schema(
  {
    costScore: { type: Number, default: 0 },
    reliabilityScore: { type: Number, default: 0 },
    routeEfficiencyScore: { type: Number, default: 0 },
    consolidationScore: { type: Number, default: 0 },
    reputationScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    estimatedDays: { type: Number, default: 0 },
  },
  { _id: false },
);

const dealPvaCollateralOutcomeSchema = new mongoose.Schema(
  {
    decision: { type: String, enum: ['none', 'release', 'refund'], default: 'none' },
    executedAt: { type: Date },
    forfeitedParties: { type: [String], default: [] },
    creatorForfeitPct: { type: Number, default: 0 },
    shipperForfeitPct: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const dealPvaRoleAcceptanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const dealPvaWorkflowSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'draft',
        'awaiting_creator',
        'awaiting_shipper',
        'awaiting_buyer_confirmation',
        'ready_for_release',
        'complete',
        'cancelled',
      ],
      default: 'draft',
    },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const dealPvaNotificationSchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      enum: ['buyer', 'creator', 'shipper', 'seller', 'mediator', 'system'],
      default: 'system',
    },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    channel: { type: String, enum: ['in_app', 'email', 'telegram'], default: 'in_app' },
    eventType: { type: String, default: '' },
    subject: { type: String, default: '' },
    message: { type: String, default: '' },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    hiddenFromView: { type: Boolean, default: false },
    sentAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const dealPvaPayoutPreviewLineSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['creator', 'shipper', 'platform', 'buffer'], required: true },
    pct: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['projected', 'eligible', 'released', 'forfeited'],
      default: 'projected',
    },
  },
  { _id: false },
);

const dealSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional (future: broker role distinct from owner)

    publicId: { type: String, unique: true, sparse: true, index: true },
    publicVisible: { type: Boolean, default: false, index: true },

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

    // PVA multi-party supply-chain extension
    pva: {
      mode: { type: String, enum: ['classic', 'creator_shipper'], default: 'classic' },
      parties: { type: [dealPvaPartySchema], default: [] },
      split: { type: dealPvaSplitSchema, default: () => ({}) },
      collateral: { type: dealPvaCollateralSchema, default: () => ({}) },
      collateralOutcome: { type: dealPvaCollateralOutcomeSchema, default: () => ({}) },
      roleAcceptance: {
        creator: { type: dealPvaRoleAcceptanceSchema, default: () => ({}) },
        shipper: { type: dealPvaRoleAcceptanceSchema, default: () => ({}) },
        buyer: { type: dealPvaRoleAcceptanceSchema, default: () => ({}) },
      },
      workflow: { type: dealPvaWorkflowSchema, default: () => ({}) },
      notificationQueue: { type: [dealPvaNotificationSchema], default: [] },
      payoutPreview: { type: [dealPvaPayoutPreviewLineSchema], default: [] },
      routeScore: { type: dealPvaRouteScoreSchema, default: () => ({}) },
      algorithmVersion: { type: String, default: 'pva-v1' },
      planNotes: { type: String, default: '' },
    },

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
        enum: [
          'draft',
          'funded_mock',
          'funded_live',
          'awaiting_receipt',
          'buyer_confirmed',
          'released',
          'refunded',
          'disputed',
        ],
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
      status: {
        type: String,
        enum: ['none', 'open', 'resolved_release', 'resolved_refund'],
        default: 'none',
      },
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
      status: {
        type: String,
        enum: ['none', 'requested', 'assigned', 'approved', 'declined'],
        default: 'none',
      },
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
    verifiedParticipants: { type: [dealVerificationSchema], default: [] },
    verificationCount: { type: Number, default: 0 },
    auditEvents: { type: [dealAuditEventSchema], default: [] },
  },
  { timestamps: true },
);

dealSchema.index({ ownerId: 1, createdAt: -1 });
dealSchema.index({ status: 1, createdAt: -1 });
dealSchema.index({ publicId: 1 }, { unique: true, sparse: true });
dealSchema.index({ publicVisible: 1, createdAt: -1 });

module.exports = mongoose.model('Deal', dealSchema);
