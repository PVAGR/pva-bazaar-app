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
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: { type: Date },
  },
  { _id: true }
);

const dealSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true },
    description: { type: String, default: '' },

    counterparty: {
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

    payments: { type: [dealPaymentSchema], default: [] },
    milestones: { type: [dealMilestoneSchema], default: [] },
    messages: { type: [dealMessageSchema], default: [] },
  },
  { timestamps: true }
);

dealSchema.index({ ownerId: 1, createdAt: -1 });
dealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Deal', dealSchema);

