const mongoose = require('mongoose');

/**
 * Agent Billing Schedule Model
 * Defines recurring payments and maintenance schedules
 * - Monthly infrastructure costs
 * - Weekly backups
 * - Daily health checks
 * - Contingency fund management
 */

const agentBillingScheduleSchema = new mongoose.Schema({
  // Schedule Identity
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutonomousAgent',
    required: true,
    index: true
  },

  scheduleName: {
    type: String,
    required: true
  },

  description: String,

  // Billing Details
  vendor: {
    type: String,
    enum: [
      'railway',           // Infrastructure
      'mongodb',           // Database
      'sendgrid',         // Email
      'stripe',           // Payments
      'aws_s3',           // Storage
      'aws_cloudfront',   // CDN
      'sentry',           // Error tracking
      'datadog',          // Monitoring
      'github',           // Repository
      'domain_registry',  // Domain renewal
      'backup_service',   // Backup provider
      'security_scanning',// Security
      'cdn_provider',     // CDN service
      'custom'            // Custom vendor
    ],
    required: true,
    index: true
  },

  vendorEmail: String,
  vendorApiKey: String, // Encrypted

  // Amount & Frequency
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'USD'
  },

  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'one_time'],
    required: true
  },

  dayOfWeek: Number, // 0-6 for weekly (0 = Sunday)
  dayOfMonth: Number, // 1-31 for monthly
  dayOfYear: Number, // 1-365 for yearly

  // Active Schedule
  active: {
    type: Boolean,
    default: true,
    index: true
  },

  // Timing
  nextBillingDate: {
    type: Date,
    required: true,
    index: true
  },

  lastBilledAt: Date,
  startDate: { type: Date, default: Date.now },
  endDate: Date, // undefined = indefinite

  // Retry Policy
  failureHandling: {
    retryOnFailure: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 },
    retryDelayMinutes: { type: Number, default: 60 },
    escalateAfterFailures: { type: Boolean, default: true }
  },

  // Payment Method Preference
  preferredPaymentMethod: {
    type: String,
    enum: ['paypal', 'crypto', 'cashapp', 'card', 'bank', 'auto']
  },

  // Approval Requirements
  requiresApproval: {
    type: Boolean,
    default: false
  },

  approvalThreshold: Number, // Only require approval if > this amount

  // Notifications
  notifications: {
    notifyBeforeBilling: { type: Boolean, default: true },
    notifyBeforeMinutes: { type: Number, default: 60 },
    notifyOnSuccess: { type: Boolean, default: false },
    notifyOnFailure: { type: Boolean, default: true }
  },

  // Budget Tracking
  budgetCategory: String, // 'infrastructure', 'services', 'contingency'
  monthlyBudgetAllocation: Number,
  quarterlyBudgetAllocation: Number,
  yearlyBudgetAllocation: Number,

  // Historical Data
  totalBilled: { type: Number, default: 0 },
  successfulBillings: { type: Number, default: 0 },
  failedBillings: { type: Number, default: 0 },
  consecutiveFailures: { type: Number, default: 0 },
  averagePaymentTime: Number, // In minutes

  // Invoice Details
  invoiceDetails: {
    invoiceUrl: String,
    invoiceFormat: String, // 'pdf', 'email', 'api'
    invoiceReceipientEmail: String,
    includeInFinancialReports: { type: Boolean, default: true }
  },

  // AI-Driven Optimization
  aiOptimization: {
    enabled: { type: Boolean, default: true },
    optimizeForCost: { type: Boolean, default: true },
    optimizeForSpeed: { type: Boolean, default: false },
    alternativePaymentMethods: [String], // Fallback methods
    estimatedSavings: Number
  },

  // Related Transactions
  recentTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentTransaction'
  }],

  // Tags & Categories
  tags: [String],
  category: String,

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,

  // Audit
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId,
  lastModifiedBy: mongoose.Schema.Types.ObjectId

}, {
  collection: 'agent_billing_schedules',
  timestamps: true
});

// Indexes
agentBillingScheduleSchema.index({ agentId: 1, active: 1 });
agentBillingScheduleSchema.index({ nextBillingDate: 1, active: 1 });
agentBillingScheduleSchema.index({ vendor: 1 });
agentBillingScheduleSchema.index({ frequency: 1 });
agentBillingScheduleSchema.index({ 'failureHandling.escalateAfterFailures': 1 });

// Methods
agentBillingScheduleSchema.methods.calculateNextBillingDate = function() {
  const today = new Date();
  const nextDate = new Date(today);

  switch (this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      const daysUntilNextWeek = (this.dayOfWeek - nextDate.getDay() + 7) % 7;
      nextDate.setDate(nextDate.getDate() + (daysUntilNextWeek || 7));
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(this.dayOfMonth);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      nextDate.setDate(this.dayOfMonth);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setMonth(nextDate.getMonth());
      nextDate.setDate(this.dayOfMonth);
      break;
  }

  return nextDate;
};

agentBillingScheduleSchema.methods.markBilled = function() {
  this.lastBilledAt = new Date();
  this.successfulBillings += 1;
  this.consecutiveFailures = 0;
  this.totalBilled += this.amount;
  this.nextBillingDate = this.calculateNextBillingDate();
  return this.save();
};

agentBillingScheduleSchema.methods.markFailed = function() {
  this.consecutiveFailures += 1;
  if (this.failureHandling.escalateAfterFailures &&
      this.consecutiveFailures >= this.failureHandling.maxRetries) {
    // Mark for escalation
    return { escalate: true, reason: 'Max retries exceeded' };
  }
  return this.save();
};

agentBillingScheduleSchema.methods.isOverdue = function() {
  return this.nextBillingDate <= new Date() && this.active;
};

agentBillingScheduleSchema.methods.daysUntilBilling = function() {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((this.nextBillingDate - now) / msPerDay);
};

module.exports = mongoose.model('AgentBillingSchedule', agentBillingScheduleSchema);
