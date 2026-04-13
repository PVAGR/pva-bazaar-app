/**
 * PendingChange Model
 * Tracks requested code changes awaiting user approval
 */

const mongoose = require('mongoose');

const pendingChangeSchema = new mongoose.Schema(
  {
    // Identification
    changeId: {
      type: String,
      unique: true,
      default: () => `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    
    // Change details
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    
    // Code change
    changeType: {
      type: String,
      enum: ['file-create', 'file-update', 'file-delete', 'pr-create', 'multi-file'],
      required: true,
    },
    
    // GitHub details
    filePath: String, // For single file changes
    repository: {
      owner: { type: String, default: 'PVAGR' },
      repo: { type: String, default: 'pva-bazaar-app' },
    },
    branch: { type: String, default: 'main' },
    baseBranch: { type: String, default: 'main' },
    
    // Content changes
    currentContent: String, // Before
    proposedContent: String, // After
    
    // Diff for review
    diff: String,
    
    // Multiple file changes
    files: {
      type: [{
        path: String,
        changeType: String,
        current: String,
        proposed: String,
      }],
      default: [],
    },
    
    // PR details
    pullRequest: {
      title: String,
      description: String,
      number: Number,
      url: String,
    },
    
    // AI reasoning
    reasoning: {
      model: String,
      provider: String,
      reasoning: String,
      confidence: { type: Number, min: 0, max: 1 },
    },
    
    // Approval workflow
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'executed', 'failed'],
      default: 'pending',
    },
    
    requestedBy: {
      userId: String,
      channel: { type: String, enum: ['telegram', 'api', 'webhook'], default: 'api' },
      channelId: String, // Telegram chat ID, etc.
    },
    
    approvedBy: {
      userId: String,
      timestamp: Date,
      notes: String,
    },
    
    rejectedBy: {
      userId: String,
      timestamp: Date,
      reason: String,
    },
    
    // Execution details
    execution: {
      status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'], default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      result: String,
      error: String,
      commitSha: String,
      prUrl: String,
    },
    
    // Metadata
    tags: [String],
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
  },
  {
    timestamps: true,
    collection: 'pending-changes',
  }
);

// Index for fast queries
pendingChangeSchema.index({ status: 1, createdAt: -1 });
pendingChangeSchema.index({ requestedBy: 1, status: 1 });
pendingChangeSchema.index({ changeId: 1 });
pendingChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

module.exports = mongoose.model('PendingChange', pendingChangeSchema);
