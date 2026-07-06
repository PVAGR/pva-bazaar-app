// backend/routes/messages.js - Direct messaging system
const express = require('express');
const messageService = require('../services/messageService');

const router = express.Router();

/**
 * Middleware: Require authentication
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * POST /api/messages - Send message
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { recipientId, message, messageType, attachments, shopId, productId, orderId } = req.body;

    if (!recipientId || !message) {
      return res.status(400).json({ error: 'recipientId and message required' });
    }

    const newMessage = await messageService.sendMessage(req.user._id, recipientId, {
      message,
      messageType,
      attachments,
      shopId,
      productId,
      orderId,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/messages/conversations - Get all conversations for user
 */
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const result = await messageService.getUserConversations(req.user._id, page, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messages/unread - Get unread message count
 */
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const count = await messageService.getUnreadCount(req.user._id);
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messages/thread/:conversationId - Get conversation thread
 */
router.get('/thread/:conversationId', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    const result = await messageService.getConversationThread(
      req.params.conversationId,
      page,
      limit,
    );

    // Mark as read
    await messageService.markConversationRead(req.params.conversationId, req.user._id);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/:messageId/read - Mark single message as read
 */
router.post('/:messageId/read', requireAuth, async (req, res) => {
  try {
    const DirectMessage = require('../models/DirectMessage');
    const message = await DirectMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    message.read = true;
    message.readAt = new Date();
    await message.save();

    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/messages/:messageId - Delete message
 */
router.delete('/:messageId', requireAuth, async (req, res) => {
  try {
    const deletedMessage = await messageService.deleteMessage(req.params.messageId, req.user._id);
    res.json({ message: 'Message deleted', deletedMessage });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return res.status(403).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/messages/search - Search messages
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const results = await messageService.searchMessages(req.user._id, q);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
