const mongoose = require('mongoose');

/**
 * Autonomous Agent Model
 * Represents the self-maintaining agent that can operate the platform independently
 * - Manages payments and billings
 * - Sends and receives emails
 * - Controls crypto wallets
 * - Pays for infrastructure autonomously
 */

const agentSchema = new mongoose.Schema(
  {
    // Agent Identity
    name: {
      type: String,
      default: 'PVA Bazaar Autonomous Agent',
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    emailPassword: {
      type: String,
      required: true, // Encrypted
      select: false,
    },

    // Agent Status & Operations
    status: {
      type: String,
      enum: ['inactive', 'active', 'paused', 'maintenance', 'error'],
      default: 'active',
    },
    operationsEnabled: {
      type: Boolean,
      default: true,
    },

    // Financial Management
    primaryPaymentMethod: {
      type: String,
      enum: ['paypal', 'crypto', 'cashapp', 'stripe', 'card'],
      default: 'paypal',
    },

    // PayPal Integration
    paypal: {
      email: String,
      clientId: String, // Encrypted
      clientSecret: String, // Encrypted
      connected: { type: Boolean, default: false },
      balance: { type: Number, default: 0 },
      lastSyncedAt: Date,
    },

    // Crypto Wallets (Multiple coins supported)
    cryptoWallets: [
      {
        coin: {
          type: String,
          enum: ['ethereum', 'bitcoin', 'polygon', 'solana', 'usdc', 'dai'],
          required: true,
        },
        address: String,
        privateKeyEncrypted: String, // Never exposed
        balance: Number,
        network: String,
        lastSyncedAt: Date,
      },
    ],

    // CashApp Integration
    cashapp: {
      tag: String, // e.g., $PVABazaarAgent
      connected: { type: Boolean, default: false },
      apiKey: String, // Encrypted
      balance: { type: Number, default: 0 },
      lastSyncedAt: Date,
    },

    // Card on File
    card: {
      lastFourDigits: String,
      expiryMonth: Number,
      expiryYear: Number,
      connected: { type: Boolean, default: false },
      tokenId: String, // Encrypted Stripe token
      billingAddress: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String,
      },
    },

    // Bank Account (for transfers)
    bankAccount: {
      accountNumber: String, // Encrypted
      routingNumber: String, // Encrypted
      bankName: String,
      accountType: String, // checking, savings
      connected: { type: Boolean, default: false },
    },

    // Autonomous Maintenance Config
    maintenanceConfig: {
      autoPayBills: { type: Boolean, default: true },
      autoScaleInfra: { type: Boolean, default: true },
      autoMonitor: { type: Boolean, default: true },
      autoBackup: { type: Boolean, default: true },
      autoUpdateDependencies: { type: Boolean, default: true },
      monthlyBudget: { type: Number, default: 100 }, // USD
      emergencyBudget: { type: Number, default: 500 }, // For critical issues
    },

    // Scheduled Operations
    scheduledPayments: [
      {
        vendor: String, // 'railway', 'mongodb', 'stripe', 'aws', etc
        amount: Number,
        currency: { type: String, default: 'USD' },
        frequency: String, // 'monthly', 'weekly', 'daily'
        nextPaymentDate: Date,
        active: { type: Boolean, default: true },
      },
    ],

    // Financial Limits & Safety
    limits: {
      maxSinglePayment: { type: Number, default: 500 },
      maxDailySpend: { type: Number, default: 1000 },
      maxMonthlySpend: { type: Number, default: 5000 },
      requiredApprovalAbove: { type: Number, default: 1000 }, // Admin approval for large payments
      canAutoSpend: { type: Boolean, default: true },
    },

    // Balance Tracking
    totalBalanceUSD: { type: Number, default: 0 },
    balanceByMethod: {
      paypal: { type: Number, default: 0 },
      crypto: { type: Number, default: 0 },
      cashapp: { type: Number, default: 0 },
      card: { type: Number, default: 0 },
      bank: { type: Number, default: 0 },
    },

    // Transaction History (Reference to AgentTransaction)
    recentTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgentTransaction',
      },
    ],

    // Notifications
    notificationSettings: {
      alertOnLowBalance: { type: Boolean, default: true },
      lowBalanceThreshold: { type: Number, default: 100 },
      alertOnFailedPayment: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      webhook: { type: Boolean, default: true },
    },

    // Admin Controls
    adminApprovalRequired: {
      largePayments: { type: Boolean, default: true },
      newPaymentMethod: { type: Boolean, default: true },
      configChanges: { type: Boolean, default: true },
    },

    // Audit Trail
    auditLog: [
      {
        action: String,
        timestamp: { type: Date, default: Date.now },
        user: mongoose.Schema.Types.ObjectId,
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // AI Integration (for smart decision making)
    aiSettings: {
      useAIForPaymentDecisions: { type: Boolean, default: true },
      aiModel: { type: String, default: 'claude-3-sonnet' },
      decisionThresholdConfidence: { type: Number, default: 0.85 },
    },

    // Health & Performance
    healthStatus: {
      lastHealthCheckAt: Date,
      fullySynced: { type: Boolean, default: false },
      allPaymentMethodsConnected: { type: Boolean, default: false },
      sufficientFundsAvailable: { type: Boolean, default: false },
    },

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastActiveAt: Date,
    uptime: { type: Number, default: 100 }, // Percentage
  },
  {
    collection: 'autonomous_agents',
    timestamps: true,
  },
);

// Indexes
agentSchema.index({ email: 1 });
agentSchema.index({ status: 1 });
agentSchema.index({ 'cryptoWallets.coin': 1 });
agentSchema.index({ createdAt: -1 });
agentSchema.index({ lastActiveAt: -1 });

// Methods
agentSchema.methods.getActivePaymentMethods = function () {
  const active = [];
  if (this.paypal?.connected) active.push('paypal');
  if (this.cashapp?.connected) active.push('cashapp');
  if (this.card?.connected) active.push('card');
  if (this.bankAccount?.connected) active.push('bank');
  if (this.cryptoWallets?.length > 0) active.push('crypto');
  return active;
};

agentSchema.methods.getTotalBalance = function () {
  return (
    this.balanceByMethod.paypal +
    this.balanceByMethod.crypto +
    this.balanceByMethod.cashapp +
    this.balanceByMethod.card +
    this.balanceByMethod.bank
  );
};

agentSchema.methods.canMakePayment = function (amount) {
  const totalBalance = this.getTotalBalance();
  const canAfford = totalBalance >= amount;
  const withinLimit = amount <= this.limits.maxSinglePayment;
  const operationsEnabled = this.operationsEnabled && this.status === 'active';

  return canAfford && withinLimit && operationsEnabled;
};

agentSchema.methods.logAction = function (action, user, details = {}) {
  this.auditLog.push({
    action,
    user,
    details,
    timestamp: new Date(),
  });
  return this.save();
};

module.exports = mongoose.model('AutonomousAgent', agentSchema);
