const mongoose = require('mongoose');

/**
 * ShopFollower Model
 * Tracks followers/subscribers of shops
 */

const ShopFollowerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Notification preferences
    notificationsEnabled: { type: Boolean, default: true },
    notifyOnNewProduct: { type: Boolean, default: true },
    notifyOnPromotion: { type: Boolean, default: true },
    notifyOnEvent: { type: Boolean, default: false },

    // Engagement
    followedAt: { type: Date, default: Date.now },
    lastNotificationSentAt: Date,
  },
  { timestamps: true }
);

// Unique constraint: one follow per user per shop
ShopFollowerSchema.index({ shopId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ShopFollower', ShopFollowerSchema);
