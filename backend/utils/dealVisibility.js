const crypto = require('crypto');

function generatePublicDealId(length = 12) {
  const targetLength = Math.max(8, Number(length) || 12);
  const raw = crypto
    .randomBytes(16)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return raw.slice(0, targetLength);
}

function appendDealAuditEvent(deal, { eventType, actorUserId = null, payload = null }) {
  if (!deal || !eventType) return;
  const cleanType = String(eventType).trim().slice(0, 80);
  if (!cleanType) return;

  const event = {
    eventType: cleanType,
    actorUserId: actorUserId || null,
    createdAt: new Date(),
    payload: payload && typeof payload === 'object' ? payload : payload || null,
  };
  const existing = Array.isArray(deal.auditEvents) ? deal.auditEvents : [];
  deal.auditEvents = [...existing, event].slice(-200);
}

function sanitizeDealCounterparty(counterparty = {}) {
  return {
    name: String(counterparty?.name || ''),
    country: String(counterparty?.country || ''),
  };
}

function projectVerificationSummary(deal) {
  const participants = Array.isArray(deal?.verifiedParticipants)
    ? deal.verifiedParticipants.map((entry) => ({
        userId: String(entry?.userId || ''),
        verifiedAt: entry?.verifiedAt || null,
        method: String(entry?.method || 'jwt'),
        note: String(entry?.note || ''),
      }))
    : [];

  return {
    verificationCount: Number(deal?.verificationCount || participants.length || 0),
    verifiedParticipants: participants,
    lastVerifiedAt: participants.length ? participants[participants.length - 1].verifiedAt : null,
  };
}

function projectPublicDeal(deal) {
  const item = deal?.toObject ? deal.toObject() : { ...(deal || {}) };

  delete item.ownerId;
  delete item.mediatorId;
  delete item.counterpartyAccess;
  delete item.outboundDispatchQueue;
  delete item.messages;

  item.counterparty = sanitizeDealCounterparty(item.counterparty);
  delete item.counterparty.userId;
  delete item.counterparty.walletAddress;
  delete item.counterparty.contact;

  if (item.pva && typeof item.pva === 'object') {
    delete item.pva.notificationQueue;
  }

  item.verification = projectVerificationSummary(item);

  if (Array.isArray(item.auditEvents)) {
    item.auditEvents = item.auditEvents.map((entry) => ({
      eventType: String(entry?.eventType || ''),
      createdAt: entry?.createdAt || null,
      payload: entry?.payload || null,
    }));
  }

  return item;
}

module.exports = {
  appendDealAuditEvent,
  generatePublicDealId,
  projectPublicDeal,
  projectVerificationSummary,
};
