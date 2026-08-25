// Promoter / consignment-ambassador program.
// Anyone can sign up, get a 4-character token + QR, share marketplace items,
// and earn a tiered share (5-50% by price) when a buyer orders with their code.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const Promoter = require('../models/Promoter');
const Artifact = require('../models/Artifact');
const { sendCustomEmail } = require('../service/emailService');

const ADMIN_INBOX = process.env.PROMOTER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'pvaglobalreach@gmail.com';
const SITE_URL = process.env.PUBLIC_SITE_URL || process.env.ALLOWED_ORIGIN || 'https://pvabazaar.org';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no lookalikes (I L O 0 1)

function commissionPercentForPriceCents(priceCents) {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return 5;
  if (priceCents >= 50000) return 50; // $500+
  if (priceCents >= 20000) return 30; // $200+
  if (priceCents >= 10000) return 20; // $100+
  if (priceCents >= 5000) return 10; // $50+
  return 5;
}

function generateCode() {
  const bytes = crypto.randomBytes(4);
  let code = '';
  for (let i = 0; i < 4; i += 1) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

async function uniqueCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateCode();
    // eslint-disable-next-line no-await-in-loop
    const existing = await Promoter.findOne({ code }).lean();
    if (!existing) return code;
  }
  throw new Error('Could not allocate a promoter code, try again');
}

function publicPromoter(doc) {
  return {
    code: doc.code,
    name: doc.name,
    shareUrl: `${SITE_URL}/#/partnerships?promoter=${doc.code}`,
    redemptions: (doc.redemptions || []).length,
    earnedCents: (doc.redemptions || []).reduce((sum, r) => sum + (r.commissionCents || 0), 0),
  };
}

// POST /api/promoters/signup - create a promoter account + 4-char token
router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const handle = String(req.body?.handle || '').trim();
    const platform = String(req.body?.platform || '').trim();

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Name and a valid email are required.' });
    }

    const existing = await Promoter.findOne({ email }).lean();
    if (existing) {
      return res.json({ ok: true, existing: true, promoter: publicPromoter(existing) });
    }

    const code = await uniqueCode();
    const promoter = await Promoter.create({ code, name, email, handle, platform });
    return res.status(201).json({ ok: true, promoter: publicPromoter(promoter) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/promoters/qr/:code - PNG QR code pointing at the promoter share link
router.get('/qr/:code.png', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const promoter = await Promoter.findOne({ code }).lean();
    if (!promoter) return res.status(404).json({ ok: false, error: 'Unknown promoter code' });

    // qrcode is an optional runtime dep; generate without failing the module.
    let qr;
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      qr = require('qrcode');
    } catch (err) {
      return res.status(503).json({ ok: false, error: 'QR generation unavailable' });
    }
    const target = `${SITE_URL}/#/partnerships?promoter=${code}`;
    const png = await qr.toBuffer(target, { width: 512, margin: 2, color: { dark: '#0f3b2d', light: '#e8f4f0' } });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(png);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/promoters/public/:code - banner info for item pages
router.get('/public/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const promoter = await Promoter.findOne({ code, status: 'active' }).lean();
    if (!promoter) return res.status(404).json({ ok: false, error: 'Unknown promoter code' });
    return res.json({ ok: true, promoter: { code: promoter.code, name: promoter.name, handle: promoter.handle } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/promoters/mine/:code - promoter's own redemption ledger
router.get('/mine/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const promoter = await Promoter.findOne({ code }).lean();
    if (!promoter) return res.status(404).json({ ok: false, error: 'Unknown promoter code' });
    return res.json({ ok: true, promoter: publicPromoter(promoter), redemptions: promoter.redemptions || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/promoters/redeem - buyer submits a promoter code with their order intent
router.post('/redeem', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const itemRef = String(req.body?.itemId || req.body?.itemSlug || '').trim();
    const buyerName = String(req.body?.buyerName || '').trim().slice(0, 120);
    const buyerEmail = String(req.body?.buyerEmail || '').trim().toLowerCase().slice(0, 200);
    const buyerNote = String(req.body?.buyerNote || '').trim().slice(0, 600);

    if (!code || !itemRef) return res.status(400).json({ ok: false, error: 'Promoter code and item are required.' });
    if (!buyerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return res.status(400).json({ ok: false, error: 'Buyer name and a valid email are required.' });
    }

    const promoter = await Promoter.findOne({ code, status: 'active' });
    if (!promoter) return res.status(404).json({ ok: false, error: 'Unknown promoter code.' });

    const item = await Artifact.findOne({
      $or: [{ slug: itemRef }, { _id: mongooseSafeId(itemRef) }],
      status: 'published',
    }).lean();
    if (!item) return res.status(404).json({ ok: false, error: 'Item not found or not published.' });

    const priceCents = item.priceCents || (item.price ? Math.round(Number(item.price) * 100) : 0);
    const percent = commissionPercentForPriceCents(priceCents);
    const commissionCents = Math.round((priceCents * percent) / 100);

    promoter.redemptions = promoter.redemptions || [];
    promoter.redemptions.push({
      itemId: String(item._id),
      itemSlug: item.slug || '',
      itemTitle: item.name || item.title || '',
      itemPriceCents: priceCents,
      commissionPercent: percent,
      commissionCents,
      buyerName,
      buyerEmail,
      buyerNote,
      createdAt: new Date(),
    });
    await promoter.save();

    const itemUrl = `${SITE_URL}/#/marketplace/${encodeURIComponent(item.slug || String(item._id))}`;
    const summary = [
      'PROMOTER ORDER INTENT',
      `Promoter: ${promoter.name} (code ${promoter.code})${promoter.handle ? ` · @${promoter.handle}` : ''}`,
      `Item: ${item.name || item.title} (${item.slug || item._id})`,
      `List price: $${(priceCents / 100).toFixed(2)}`,
      `Promoter share: ${percent}% = $${(commissionCents / 100).toFixed(2)}`,
      `Buyer: ${buyerName} <${buyerEmail}>`,
      buyerNote ? `Buyer note: ${buyerNote}` : '',
      `Item page: ${itemUrl}`,
      `Promoter link: ${SITE_URL}/#/partnerships?promoter=${promoter.code}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Admin inbox - the consignment desk.
    try {
      await sendCustomEmail({
        to: ADMIN_INBOX,
        subject: `[Promoter ${promoter.code}] ${item.name || item.title} - ${percent}% deal ($${(commissionCents / 100).toFixed(2)})`,
        text: summary,
      });
    } catch (emailErr) {
      console.warn('[promoters] admin email failed (redemption still recorded):', emailErr.message);
    }

    // Buyer confirmation.
    try {
      await sendCustomEmail({
        to: buyerEmail,
        subject: `Your request for "${item.name || item.title}" was received`,
        text: `Hi ${buyerName},\n\nWe received your order interest in "${item.name || item.title}" shared by ${promoter.name} (code ${promoter.code}).\nOur consignment desk will reply to this email shortly to confirm details, shipping, and payment.\n\n- PVA Bazaar`,
      });
    } catch (emailErr) {
      console.warn('[promoters] buyer email failed (non-critical):', emailErr.message);
    }

    return res.status(201).json({
      ok: true,
      promoter: { code: promoter.code, name: promoter.name },
      item: { title: item.name || item.title, slug: item.slug || '', priceCents },
      commissionPercent: percent,
      commissionCents,
      message: 'Received. Our consignment desk will follow up by email.',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

function mongooseSafeId(value) {
  try {
    if (!/^[a-f\d]{24}$/i.test(value)) return null;
    return new (require('mongoose').Types.ObjectId)(value);
  } catch (_) {
    return null;
  }
}

module.exports = router;
