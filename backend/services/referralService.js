/**
 * referralService
 * Core engine for the automatic referral / kickback program.
 *
 * - Issues a persistent referral code per email and emails it to the owner.
 * - Resolves active codes during checkout so orders carry attribution.
 * - Settles commission automatically on paid orders (idempotent), writing a
 *   Payout row (status 'ready') and emailing the referrer.
 * - Reverses commission on refunds.
 *
 * It runs for free on the existing Node backend + MongoDB + SMTP — no
 * subscription, no in-memory state.
 */

const crypto = require('crypto');
const ReferralCode = require('../models/ReferralCode');
const Payout = require('../models/Payout');
const {
  sendReferralCodeEmail,
  sendReferralCommissionEmail,
} = require('../service/emailService');

const DEFAULT_COMMISSION_RATE = 0.1; // 10% of the sale price

function normalizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function isValidCodeFormat(code) {
  return /^[A-Z0-9]{6,16}$/.test(code);
}

/** Generate a unique referral code (SVGB lookalikes that are unambiguous). */
async function generateReferralCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const raw = crypto.randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[raw[i] % alphabet.length];
    }
    const existing = await ReferralCode.findOne({ code }).lean();
    if (!existing) return code;
  }
  // Extremely unlikely fallback
  return `PVA${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function calculateCommission(amountCents, rate = DEFAULT_COMMISSION_RATE) {
  const safeRate = Number.isFinite(Number(rate)) && Number(rate) > 0 ? Number(rate) : DEFAULT_COMMISSION_RATE;
  const safeAmount = Math.max(0, Number(amountCents) || 0);
  return {
    commissionRate: safeRate,
    commissionAmountCents: Math.round(safeAmount * safeRate),
  };
}

/**
 * Register (or re-fetch) a referral code for an email address.
 * Sends the code to the owner by email. Returns { record, referralUrl }.
 */
async function registerReferral({ email, name, siteUrl = 'https://pvabazaar.org' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const error = new Error('A valid email address is required');
    error.status = 400;
    throw error;
  }

  let record = await ReferralCode.findOne({ email: normalizedEmail });
  if (!record) {
    const code = await generateReferralCode();
    record = await ReferralCode.create({
      email: normalizedEmail,
      name: String(name || '').trim(),
      code,
      status: 'active',
      commissionRate: DEFAULT_COMMISSION_RATE,
    });
  }

  // Email the code so the owner always has it (works with unlimited people;
  // their record lives in the database, not app memory).
  const referralUrl = `${siteUrl.replace(/\/$/, '')}/?ref=${encodeURIComponent(record.code)}`;
  try {
    const result = await sendReferralCodeEmail({
      to: normalizedEmail,
      name: record.name || normalizedEmail,
      code: record.code,
      referralUrl,
      siteUrl: siteUrl.replace(/\/$/, ''),
    });
    if (result && result.success) {
      record.emailsSent = (record.emailsSent || 0) + 1;
      record.lastEmailedAt = new Date();
      await record.save();
    }
  } catch (err) {
    console.warn('[referralService] Failed to email referral code:', err?.message || err);
  }

  return { record: record.toPublicJSON(), referralUrl };
}

/** Resolve an active referral code to its record (or null). */
async function resolveActiveReferral(code) {
  const normalized = normalizeCode(code);
  if (!normalized || !isValidCodeFormat(normalized)) return null;
  const record = await ReferralCode.findOne({ code: normalized, status: 'active' }).lean();
  return record || null;
}

/**
 * Settle the commission kickback for an already-paid order that carries
 * attribution. Idempotent: only settles once per order (based on
 * attribution.commissionAmountCents being 0). Never throws — failures are
 * logged so the payment flow is never blocked.
 */
async function settleReferralForOrder(order, options = {}) {
  try {
    const attribution = order.attribution || {};
    if (!attribution.referralCode) return { settled: false, reason: 'no_referral' };
    if (attribution.commissionAmountCents > 0) return { settled: false, reason: 'already_settled' };

    const record = await resolveActiveReferral(attribution.referralCode);
    if (!record) return { settled: false, reason: 'code_inactive' };

    const amountCents = Number(options.amountCents ?? order.amountTotal);
    const currency = options.currency || order.currency || 'usd';
    const rate = Number(attribution.commissionRate) || record.commissionRate || DEFAULT_COMMISSION_RATE;
    const { commissionAmountCents } = calculateCommission(amountCents, rate);

    if (commissionAmountCents <= 0) return { settled: false, reason: 'zero_commission' };

    const itemName = options.itemName || (order.itemSnapshot && order.itemSnapshot.name) || 'PVA Bazaar item';

    // Stamp the order (single source of truth for the payout engine).
    order.attribution.commissionRate = rate;
    order.attribution.commissionAmountCents = commissionAmountCents;
    order.attribution.creatorHandle = order.attribution.creatorHandle || record.code;
    order.attribution.creatorEmail = order.attribution.creatorEmail || record.email;
    order.attribution.attributedAt = order.attribution.attributedAt || new Date();
    await order.save();

    // Accumulate on the referral record.
    record.sales = (record.sales || 0) + 1;
    record.totalCommissionsCents = (record.totalCommissionsCents || 0) + commissionAmountCents;
    record.pendingCents = (record.pendingCents || 0) + commissionAmountCents;
    record.pendingOrders = record.pendingOrders || [];
    record.pendingOrders.push({
      orderId: String(order._id),
      itemName,
      totalCents: amountCents,
      commissionCents: commissionAmountCents,
      currency,
    });
    await ReferralCode.updateOne(
      { _id: record._id },
      {
        $set: {
          sales: record.sales,
          totalCommissionsCents: record.totalCommissionsCents,
          pendingCents: record.pendingCents,
        },
        $push: {
          pendingOrders: {
            orderId: String(order._id),
            itemName,
            totalCents: amountCents,
            commissionCents: commissionAmountCents,
            currency,
          },
        },
      }
    );

    // Automatic Payout row so admins can settle (status 'ready').
    try {
      await Payout.create({
        batchId: `auto_${order._id}`,
        status: 'ready',
        payoutPeriod: { startDate: new Date(), endDate: new Date() },
        creatorHandle: record.code,
        creatorEmail: record.email,
        totalCommissionsCents: commissionAmountCents,
        netPayoutCents: commissionAmountCents,
        attributionIds: [order._id],
        orderCount: 1,
        adminNotes: 'automatic_referral_settlement',
      });
    } catch (payoutErr) {
      console.warn('[referralService] Payout creation failed (duplicate batch?):', payoutErr?.message || payoutErr);
    }

    // Tell the referrer a sale happened and what they earned.
    try {
      await sendReferralCommissionEmail({
        to: record.email,
        name: record.name || record.email,
        itemName,
        amountCents,
        commissionCents: commissionAmountCents,
        currency,
        referralUrl: `${(options.siteUrl || 'https://pvabazaar.org').replace(/\/$/, '')}/?ref=${encodeURIComponent(record.code)}`,
      });
    } catch (emailErr) {
      console.warn('[referralService] Commission email failed:', emailErr?.message || emailErr);
    }

    return { settled: true, commissionRate: rate, commissionAmountCents };
  } catch (err) {
    console.error('[referralService] Settlement error:', err?.message || err);
    return { settled: false, reason: 'error', error: err.message };
  }
}

/** Reverse a settlement when an attributed order is refunded. */
async function reverseReferralForOrder(order) {
  try {
    const attribution = order.attribution || {};
    if (!attribution.referralCode || attribution.commissionAmountCents <= 0) {
      return { reversed: false, reason: 'nothing_to_reverse' };
    }

    const record = await ReferralCode.findOne({ code: attribution.referralCode });
    if (record) {
      const cents = attribution.commissionAmountCents;
      record.totalCommissionsCents = Math.max(0, (record.totalCommissionsCents || 0) - cents);
      record.pendingCents = Math.max(0, (record.pendingCents || 0) - cents);
      record.sales = Math.max(0, (record.sales || 0) - 1);
      record.pendingOrders = (record.pendingOrders || []).filter(
        (entry) => entry && String(entry.orderId) !== String(order._id)
      );
      await record.save();
    }

    await Payout.updateMany(
      { batchId: `auto_${order._id}` },
      { $set: { status: 'failed', failureReason: 'order_refunded' } }
    ).catch(() => {});

    // Clear so a future settlement does not double-count.
    order.attribution.commissionAmountCents = 0;
    await order.save().catch(() => {});
    return { reversed: true };
  } catch (err) {
    console.error('[referralService] Reversal error:', err?.message || err);
    return { reversed: false, reason: 'error', error: err.message };
  }
}

/** Build an earnings summary for a given email address (owner lookup). */
async function getReferralStatsByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const record = await ReferralCode.findOne({ email: normalizedEmail });
  if (!record) return null;
  return record.toPublicJSON();
}

module.exports = {
  DEFAULT_COMMISSION_RATE,
  normalizeCode,
  isValidCodeFormat,
  generateReferralCode,
  calculateCommission,
  registerReferral,
  resolveActiveReferral,
  settleReferralForOrder,
  reverseReferralForOrder,
  getReferralStatsByEmail,
};