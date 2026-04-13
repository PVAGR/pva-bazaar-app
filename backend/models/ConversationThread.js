const mongoose = require('mongoose');

const conversationThreadSchema = new mongoose.Schema(
  {
    // Conversation metadata
    title: { type: String, default: 'Conversation with Creator Agent' },
    description: { type: String, default: '' },
    
    // Ownership & access
    creatorId: { type: String, required: true }, // who owns this conversation
    participantId: { type: String, required: true }, // who is talking to the agent
    
    // Agent personality
    agentPersona: {
      name: { type: String, default: 'PVA Guardian' },
      role: { type: String, default: 'Creator\'s Agent & Guide' },
      context: { type: String, default: '' }, // Custom personality context
    },

    // Conversation state
    messages: [
      {
        id: String,
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        metadata: {
          tokens: Number,
          model: String,
          temperature: Number,
        },
      },
    ],

    // Memory & context
    systemPrompt: { type: String, default: '' },
    contextWindow: {
      recentChanges: [String], // Recent git commits, feature changes
      platformState: Object, // Current platform state snapshot
      userPreferences: Object,
    },

    // AI settings
    aiModel: { type: String, default: 'llama3.1' },
    temperature: { type: Number, default: 0.35, min: 0, max: 2 },
    maxTokens: { type: Number, default: 2000 },

    // Status
    isActive: { type: Boolean, default: true },
    lastActivityAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },

    // Tags and categorization
    tags: [String],
    category: { type: String, default: 'general' },

    // Permissions
    isPublic: { type: Boolean, default: false },
    allowedUsers: [String],
  },
  {
    timestamps: true,
    collection: 'conversation_threads',
  }
);

// Indexes
conversationThreadSchema.index({ creatorId: 1, createdAt: -1 });
conversationThreadSchema.index({ participantId: 1, createdAt: -1 });
conversationThreadSchema.index({ lastActivityAt: -1 });
conversationThreadSchema.index({ isActive: 1, creatorId: 1 });
conversationThreadSchema.index({ 'messages.timestamp': -1 });

module.exports = mongoose.model('ConversationThread', conversationThreadSchema);
