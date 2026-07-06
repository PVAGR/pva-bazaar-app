const mongoose = require('mongoose');

/**
 * Agent Transaction Model
 * Logs all autonomous financial transactions
 * - Payments to vendors
 * - Wallet transfers
 * - Balance syncs
 * - Failed attempts
 */

const agentTransactionSchema = new mongoose.Schema(
  {
    // Transaction Identity
    transactionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Agent Reference
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutonomousAgent',
      required: true,
      index: true,
    },

    // Transaction Type
    type: {
      type: String,
      enum: [
        'bill_payment', // Pay vendor
        'wallet_transfer', // Move between wallets
        'deposit', // Add funds from external
        'withdrawal', // Send funds out
        'balance_sync', // Sync wallet balance
        'fee', // Transaction fee
        'refund', // Refund received
        'emergency_transfer', // Emergency funds move
      ],
      required: true,
      index: true,
    },

    // Amount & Currency
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDC', 'DAI'],
      default: 'USD',
    },
    amountInUSD: {
      type: Number,
      required: true, // Normalized to USD for tracking
    },

    // Payment Method
    paymentMethod: {
      type: String,
      enum: ['paypal', 'crypto', 'cashapp', 'stripe', 'card', 'bank'],
      required: true,
    },

    // Source & Destination
    from: {
      method: String,
      identifier: String, // email, wallet address, etc
      balance: Number, // Before transaction
    },
    to: {
      vendor: String, // 'railway', 'mongodb', 'stripe', etc
      method: String, // Payment method of vendor
      identifier: String,
      wallet: String,
    },

    // Transaction Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },

    // Reason/Intent
    reason: {
      type: String,
      enum: [
        'infrastructure_payment', // Railway, AWS, etc
        'database_payment', // MongoDB Atlas
        'email_service_payment', // SendGrid
        'payment_processor_fee', // Stripe
        'monitoring_payment', // Sentry, uptime
        'domain_renewal', // GoDaddy, Route53
        'backup_service', // EBS, S3
        'emergency_fix', // Urgent issue
        'balance_rebalance', // Move to better method
        'scheduled_maintenance', // Regular maintenance
        'contingency_fund', // Emergency reserve
        'test_transaction', // Testing
      ],
      required: true,
    },

    // Vendor/Bill Details
    billDetails: {
      vendor: String,
      invoiceNumber: String,
      invoiceUrl: String,
      dueDate: Date,
      recurringBill: { type: Boolean, default: false },
      billingCycle: String, // monthly, weekly, daily
      nextDueDate: Date,
    },

    // Crypto Specific
    cryptoDetails: {
      txHash: String,
      gasPrice: Number,
      gasLimit: Number,
      totalGasCost: Number,
      blockchain: String,
      confirmations: { type: Number, default: 0 },
      requiredConfirmations: Number,
      exchangeRate: Number, // At time of transaction
    },

    // Fees
    fees: {
      processingFee: { type: Number, default: 0 },
      networkFee: { type: Number, default: 0 },
      conversionFee: { type: Number, default: 0 },
      totalFee: { type: Number, default: 0 },
    },

    // Result
    result: {
      success: Boolean,
      confirmationId: String,
      receiptUrl: String,
      errorMessage: String,
      retryCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 },
    },

    // Decision Making (if AI was involved)
    aiDecision: {
      madeByAI: { type: Boolean, default: false },
      confidence: Number,
      reasoning: String,
      model: String,
      approvedByAdmin: Boolean,
      adminNotes: String,
    },

    // Balances After
    balancesAfter: {
      paypal: Number,
      crypto: Number,
      cashapp: Number,
      card: Number,
      bank: Number,
      total: Number,
    },

    // Timestamps
    initiatedAt: { type: Date, required: true },
    processedAt: Date,
    completedAt: Date,
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    tags: [String],
    categories: [String],
  },
  {
    collection: 'agent_transactions',
    timestamps: true,
  },
);

// Indexes
agentTransactionSchema.index({ agentId: 1, createdAt: -1 });
agentTransactionSchema.index({ status: 1, type: 1 });
agentTransactionSchema.index({ type: 1, createdAt: -1 });
agentTransactionSchema.index({ 'billDetails.vendor': 1 });
agentTransactionSchema.index({ 'result.success': 1 });
agentTransactionSchema.index({ paymentMethod: 1 });

// Methods
agentTransactionSchema.methods.calculateTotalCost = function () {
  return this.amount + this.fees.totalFee;
};

agentTransactionSchema.methods.markCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

agentTransactionSchema.methods.markFailed = function (errorMessage) {
  this.status = 'failed';
  this.result.errorMessage = errorMessage;
  return this.save();
};

agentTransactionSchema.methods.retry = function () {
  if (this.result.retryCount < this.result.maxRetries) {
    this.result.retryCount += 1;
    this.status = 'pending';
    this.processedAt = null;
    return this.save();
  }
  return null;
};

module.exports = mongoose.model('AgentTransaction', agentTransactionSchema);
