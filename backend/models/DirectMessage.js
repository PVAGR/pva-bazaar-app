// backend/models/DirectMessage.js - Buyer-seller messaging system
const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  // Conversation identifier
  conversationId: { type: mongoose.Schema.Types.ObjectId, index: true }, // Group multiple messages
  threadId: String, // Alternative thread identifier

  // Participants
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Context
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', sparse: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', sparse: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', sparse: true },

  // Message content
  message: { type: String, required: true },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'product_inquiry', 'order_update'],
    default: 'text',
  },

  // Attachments
  attachments: [
    {
      filename: String,
      url: String,
      mimeType: String,
      size: Number,
    },
  ],

  // Message status
  read: { type: Boolean, default: false },
  readAt: Date,
  delivered: { type: Boolean, default: true },
  deliveredAt: { type: Date, default: Date.now },

  // Sender info (denormalized for display)
  senderName: String,
  senderAvatar: String,
  recipientName: String,

  // Engagement
  liked: { type: Boolean, default: false },
  flagged: { type: Boolean, default: false },
  flagReason: String,

  // Quick reply suggestions (seller automation)
  suggestedReplies: [String],

  // Forwarded or edited
  forwardedFrom: mongoose.Schema.Types.ObjectId,
  editedAt: Date,
  editHistory: [
    {
      message: String,
      editedAt: Date,
    },
  ],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// Index for common queries
directMessageSchema.index({ conversationId: 1, createdAt: 1 });
directMessageSchema.index({ senderId: 1, recipientId: 1 });
directMessageSchema.index({ senderId: 1, read: 1 });
directMessageSchema.index({ recipientId: 1, read: 1 });
directMessageSchema.index({ orderId: 1 });

// Auto-update updatedAt
directMessageSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DirectMessage', directMessageSchema);
