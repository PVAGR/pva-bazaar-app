// backend/models/AIAgentBot.js - AI help conversations and onboarding
const mongoose = require('mongoose');

const aiAgentBotSchema = new mongoose.Schema({
  // User & context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  topic: {
    type: String,
    enum: [
      'pricing',
      'registration',
      'shipping',
      'compliance',
      'marketing',
      'onboarding',
      'product_setup',
      'general',
    ],
    required: true,
  },
  sessionId: String, // Track conversation threads

  // Conversation
  conversation: [
    {
      role: { type: String, enum: ['user', 'assistant'] },
      message: String,
      timestamp: { type: Date, default: Date.now },
      attachments: [String], // URLs, file references
    },
  ],

  // Resolution
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  satisfactionRating: Number, // 1-5 stars
  satisfactionComment: String,

  // Metadata
  source: {
    type: String,
    enum: ['seller_dashboard', 'onboarding', 'help_page', 'live_chat', 'email'],
    default: 'help_page',
  },
  language: { type: String, default: 'en' },

  // Follow-up
  actionTaken: String, // Did user implement suggestion?
  followUpNeeded: Boolean,
  followUpAt: Date,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

aiAgentBotSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AIAgentBot', aiAgentBotSchema);
