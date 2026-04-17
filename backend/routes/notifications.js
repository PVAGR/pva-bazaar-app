const express = require('express');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveRecipientAddress(req) {
  return normalizeAddress(
    req.query.recipientAddress
      || req.body?.recipientAddress
      || req.user?.preferences?.defaultWalletAddress
      || req.user?.wallet?.generatedWalletAddress
      || ''
  );
}

function toClientNotification(doc) {
  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    read: doc.read ? 1 : 0,
    created_at: doc.createdAt,
    read_at: doc.readAt,
    meta: doc.meta || null,
  };
}

router.get('/badge', async (req, res) => {
  try {
    const recipientAddress = resolveRecipientAddress(req);
    if (!recipientAddress) {
      return res.json({ ok: true, unreadCount: 0 });
    }

    const unreadCount = await Notification.countDocuments({
      recipientAddress,
      read: false,
    });

    return res.json({ ok: true, unreadCount });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const recipientAddress = resolveRecipientAddress(req);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 200));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const unreadOnly = String(req.query.unreadOnly || '') === '1';

    if (!recipientAddress) {
      return res.json({ ok: true, notifications: [], total: 0, unreadCount: 0 });
    }

    const filter = {
      recipientAddress,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [rows, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientAddress, read: false }),
    ]);

    return res.json({
      ok: true,
      notifications: rows.map(toClientNotification),
      total,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/mark-read', async (req, res) => {
  const recipientAddress = resolveRecipientAddress(req);
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => String(id)) : [];

  try {
    if (!recipientAddress) {
      return res.status(400).json({ ok: false, error: 'recipientAddress is required' });
    }

    if (ids.length > 0) {
      await Notification.updateMany(
        {
          recipientAddress,
          _id: { $in: ids },
        },
        {
          $set: { read: true, readAt: new Date() },
        }
      );
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/mark-all-read', async (req, res) => {
  const recipientAddress = resolveRecipientAddress(req);

  try {
    if (!recipientAddress) {
      return res.status(400).json({ ok: false, error: 'recipientAddress is required' });
    }

    await Notification.updateMany(
      { recipientAddress, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const recipientAddress = resolveRecipientAddress(req);
  const id = String(req.params.id || '');

  try {
    if (!recipientAddress) {
      return res.status(400).json({ ok: false, error: 'recipientAddress is required' });
    }

    if (!id) {
      return res.status(400).json({ ok: false, error: 'id is required' });
    }

    await Notification.deleteOne({ _id: id, recipientAddress });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
