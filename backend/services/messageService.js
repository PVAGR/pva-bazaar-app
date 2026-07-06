// backend/services/messageService.js - Direct messaging system
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Send a message
 */
async function sendMessage(senderId, recipientId, messageData) {
  const recipient = await User.findById(recipientId);
  if (!recipient) throw new Error('Recipient not found');

  const sender = await User.findById(senderId);

  // Create or find conversation ID
  let conversationId = messageData.conversationId;
  if (!conversationId) {
    // Generate a conversation ID based on sender/recipient pair
    const pair = [senderId.toString(), recipientId.toString()].sort().join('-');
    conversationId = new mongoose.Types.ObjectId();
  }

  const message = new DirectMessage({
    conversationId,
    threadId: messageData.threadId,
    senderId,
    recipientId,
    shopId: messageData.shopId,
    productId: messageData.productId,
    orderId: messageData.orderId,
    message: messageData.message,
    messageType: messageData.messageType || 'text',
    attachments: messageData.attachments || [],
    senderName: sender?.name,
    senderAvatar: sender?.avatar,
    recipientName: recipient.name,
  });

  await message.save();

  return message;
}

/**
 * Get conversation thread
 */
async function getConversationThread(conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const messages = await DirectMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await DirectMessage.countDocuments({ conversationId });

  return {
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get all conversations for a user
 */
async function getUserConversations(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  // Find all unique conversations where user is participant
  const conversations = await DirectMessage.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId) },
          { recipientId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: '$conversationId',
        other: {
          $first: {
            $cond: [
              { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
              '$recipientId',
              '$senderId',
            ],
          },
        },
        lastMessage: { $first: '$message' },
        lastMessageAt: { $first: '$createdAt' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$recipientId', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$read', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  const total = await DirectMessage.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId) },
          { recipientId: new mongoose.Types.ObjectId(userId) },
        ],
      },
    },
    {
      $group: {
        _id: '$conversationId',
      },
    },
    {
      $count: 'count',
    },
  ]);

  return {
    conversations,
    pagination: {
      page,
      limit,
      total: total[0]?.count || 0,
      pages: Math.ceil((total[0]?.count || 0) / limit),
    },
  };
}

/**
 * Mark messages as read
 */
async function markConversationRead(conversationId, userId) {
  await DirectMessage.updateMany(
    {
      conversationId,
      recipientId: userId,
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
    },
  );
}

/**
 * Get unread message count for user
 */
async function getUnreadCount(userId) {
  const count = await DirectMessage.countDocuments({
    recipientId: userId,
    read: false,
  });

  return count;
}

/**
 * Search messages
 */
async function searchMessages(userId, query) {
  const results = await DirectMessage.find({
    $or: [{ senderId: userId }, { recipientId: userId }],
    message: { $regex: query, $options: 'i' },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return results;
}

/**
 * Delete message (soft delete)
 */
async function deleteMessage(messageId, userId) {
  const message = await DirectMessage.findById(messageId);
  if (!message) throw new Error('Message not found');

  if (message.senderId.toString() !== userId.toString()) {
    throw new Error('Unauthorized');
  }

  // Soft delete by clearing content
  message.message = '[Message deleted]';
  message.messageType = 'text';
  message.attachments = [];

  await message.save();
  return message;
}

module.exports = {
  sendMessage,
  getConversationThread,
  getUserConversations,
  markConversationRead,
  getUnreadCount,
  searchMessages,
  deleteMessage,
};
