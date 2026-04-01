const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Artifact = require('../models/Artifact');
const ItemInquiry = require('../models/ItemInquiry');
const adminSession = require('../middleware/adminSession');
const { generalLimiter } = require('../middleware/rateLimit');

function toSafeText(input, max = 500) {
  return String(input || '').trim().slice(0, max);
}

function toSafeEmail(input) {
  return String(input || '').trim().toLowerCase().slice(0, 255);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

async function findArtifactBySlugOrId(slugOrId) {
  let artifact = null;
  if (mongoose.Types.ObjectId.isValid(String(slugOrId))) {
    artifact = await Artifact.findById(String(slugOrId));
  }
  if (!artifact) {
    artifact = await Artifact.findOne({ slug: String(slugOrId) });
  }
  return artifact;
}

async function applyReservation(artifact, quantityRequested) {
  if (!artifact) return false;

  if (artifact.isUnique) {
    if (artifact.availabilityStatus !== 'available') return false;
    artifact.availabilityStatus = 'reserved';
    await artifact.save();
    return true;
  }

  const requested = Math.max(1, Number(quantityRequested) || 1);
  const stockQty = Number(artifact.stockQty || 0);
  const reservedQty = Number(artifact.reservedQty || 0);
  const remaining = Math.max(0, stockQty - reservedQty);
  const reserveNow = Math.min(requested, remaining);
  if (reserveNow <= 0) return false;

  artifact.reservedQty = reservedQty + reserveNow;
  artifact.bulkQuantity = Math.max(0, stockQty - artifact.reservedQty);
  artifact.availabilityStatus = artifact.bulkQuantity > 0 ? 'available' : 'reserved';
  await artifact.save();
  return true;
}

async function releaseReservation(artifact, quantityRequested) {
  if (!artifact) return false;

  if (artifact.isUnique) {
    if (artifact.availabilityStatus === 'reserved') {
      artifact.availabilityStatus = 'available';
      await artifact.save();
      return true;
    }
    return false;
  }

  const releaseQty = Math.max(1, Number(quantityRequested) || 1);
  const currentReserved = Math.max(0, Number(artifact.reservedQty || 0));
  if (currentReserved <= 0) return false;

  const released = Math.min(releaseQty, currentReserved);
  artifact.reservedQty = Math.max(0, currentReserved - released);
  const stockQty = Math.max(0, Number(artifact.stockQty || 0));
  artifact.bulkQuantity = Math.max(0, stockQty - artifact.reservedQty);
  artifact.availabilityStatus = artifact.bulkQuantity > 0 ? 'available' : 'reserved';
  await artifact.save();
  return true;
}

// POST /api/item-inquiries
router.post('/', generalLimiter, async (req, res) => {
  try {
    const slugOrId = toSafeText(req.body?.slugOrId, 120);
    const requesterName = toSafeText(req.body?.requesterName, 120);
    const requesterEmail = toSafeEmail(req.body?.requesterEmail);
    const requesterCompany = toSafeText(req.body?.requesterCompany, 160);
    const message = toSafeText(req.body?.message, 2000);
    const quantityRequested = Math.max(1, Number(req.body?.quantityRequested) || 1);
    const requestType = ['sample', 'availability', 'bulk', 'custom'].includes(req.body?.requestType)
      ? req.body.requestType
      : 'sample';
    const reservationRequested = Boolean(req.body?.reservationRequested);

    if (!slugOrId) return res.status(400).json({ ok: false, error: 'Missing item id or slug' });
    if (!requesterName) return res.status(400).json({ ok: false, error: 'Missing requester name' });
    if (!isValidEmail(requesterEmail)) return res.status(400).json({ ok: false, error: 'Invalid requester email' });
    if (!message) return res.status(400).json({ ok: false, error: 'Missing message' });

    const artifact = await findArtifactBySlugOrId(slugOrId);
    if (!artifact || artifact.status !== 'published') {
      return res.status(404).json({ ok: false, error: 'Item not found' });
    }

    let reservationApplied = false;
    if (reservationRequested) {
      reservationApplied = await applyReservation(artifact, quantityRequested);
    }

    const inquiry = await ItemInquiry.create({
      artifact: artifact._id,
      itemSlug: artifact.slug || '',
      itemName: artifact.name || artifact.title || '',
      itemSku: artifact.sku || '',
      itemSnapshotUrl: `/marketplace/${encodeURIComponent(artifact.slug || String(artifact._id))}`,
      requesterName,
      requesterEmail,
      requesterCompany,
      message,
      quantityRequested,
      requestType,
      reservationRequested,
      reservationApplied,
      status: reservationApplied ? 'reserved' : 'new',
    });

    return res.status(201).json({
      ok: true,
      inquiry: {
        id: String(inquiry._id),
        status: inquiry.status,
        reservationApplied,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/item-inquiries (admin only)
router.get('/', adminSession, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 30, 100));
    const status = toSafeText(req.query.status, 30).toLowerCase();
    const q = toSafeText(req.query.q, 120);
    const filter = {};
    if (status && ['new', 'contacted', 'reserved', 'closed'].includes(status)) {
      filter.status = status;
    }
    if (q) {
      const rx = new RegExp(q, 'i');
      filter.$or = [
        { itemName: rx },
        { itemSku: rx },
        { requesterName: rx },
        { requesterEmail: rx },
        { requesterCompany: rx },
        { message: rx },
      ];
    }

    const rows = await ItemInquiry.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      items: rows.map((row) => ({
        id: String(row._id),
        artifactId: row.artifact ? String(row.artifact) : '',
        itemSlug: row.itemSlug,
        itemName: row.itemName,
        itemSku: row.itemSku,
        requesterName: row.requesterName,
        requesterEmail: row.requesterEmail,
        requesterCompany: row.requesterCompany,
        message: row.message,
        quantityRequested: row.quantityRequested,
        requestType: row.requestType,
        reservationRequested: Boolean(row.reservationRequested),
        reservationApplied: Boolean(row.reservationApplied),
        reservationReleasedAt: row.reservationReleasedAt || null,
        status: row.status,
        createdAt: row.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /api/item-inquiries/:id/status (admin only)
router.patch('/:id/status', adminSession, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    const status = toSafeText(req.body?.status, 30).toLowerCase();
    const notes = toSafeText(req.body?.notes, 2000);
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, error: 'Invalid inquiry id' });
    if (!['new', 'contacted', 'reserved', 'closed'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const inquiry = await ItemInquiry.findById(id);
    if (!inquiry) return res.status(404).json({ ok: false, error: 'Inquiry not found' });

    inquiry.status = status;
    if (notes) inquiry.notes = notes;
    await inquiry.save();

    return res.json({ ok: true, inquiry: { id: String(inquiry._id), status: inquiry.status } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/item-inquiries/:id/release-reservation (admin only)
router.post('/:id/release-reservation', adminSession, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid inquiry id' });
    }

    const inquiry = await ItemInquiry.findById(id);
    if (!inquiry) return res.status(404).json({ ok: false, error: 'Inquiry not found' });
    if (!inquiry.reservationApplied) {
      return res.status(400).json({ ok: false, error: 'No active reservation on this inquiry' });
    }

    const artifact = inquiry.artifact ? await Artifact.findById(inquiry.artifact) : null;
    if (!artifact) {
      return res.status(404).json({ ok: false, error: 'Associated artifact not found' });
    }

    const released = await releaseReservation(artifact, inquiry.quantityRequested);
    if (!released) {
      return res.status(400).json({ ok: false, error: 'Reservation could not be released' });
    }

    inquiry.reservationApplied = false;
    inquiry.reservationReleasedAt = new Date();
    if (inquiry.status === 'reserved') inquiry.status = 'contacted';
    await inquiry.save();

    return res.json({
      ok: true,
      inquiry: {
        id: String(inquiry._id),
        status: inquiry.status,
        reservationApplied: false,
      },
      artifact: {
        id: String(artifact._id),
        availabilityStatus: artifact.availabilityStatus,
        reservedQty: Number(artifact.reservedQty || 0),
        bulkQuantity: Number(artifact.bulkQuantity || 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
