const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipientAddress: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['SALE', 'ROYALTY', 'SYSTEM', 'INFO'],
      default: 'INFO',
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipientAddress: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
