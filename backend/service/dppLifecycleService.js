const mongoose = require('mongoose');
const DigitalProductPassport = require('../models/DigitalProductPassport');

function normalizeOccurredAt(value) {
  const dt = value ? new Date(value) : new Date();
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return metadata;
}

async function findPassportForArtifact({ artifactId, artifactSlug }) {
  const filterOr = [];
  if (artifactSlug) filterOr.push({ artifactSlug: String(artifactSlug).trim() });
  if (artifactId && mongoose.isValidObjectId(artifactId)) {
    filterOr.push({ artifactId: String(artifactId) });
  }
  if (filterOr.length === 0) return null;
  return DigitalProductPassport.findOne({ $or: filterOr });
}

async function appendLifecycleEventForArtifact({
  artifactId,
  artifactSlug,
  type = 'custom',
  actorDid = '',
  location = '',
  notes = '',
  txHash = '',
  externalRef = '',
  metadata = {},
  occurredAt,
}) {
  const passport = await findPassportForArtifact({ artifactId, artifactSlug });
  if (!passport) {
    return { ok: true, skipped: true, reason: 'passport_not_found' };
  }
  if (passport.status !== 'active') {
    return { ok: true, skipped: true, reason: `passport_${passport.status}` };
  }

  const extRef = String(externalRef || '').trim();
  if (extRef) {
    const duplicate = Array.isArray(passport.lifecycleEvents) && passport.lifecycleEvents.some((event) => {
      return String(event.externalRef || '') === extRef && String(event.type || '') === String(type || 'custom');
    });
    if (duplicate) {
      return { ok: true, skipped: true, reason: 'duplicate_external_ref', passportDid: passport.passportDid };
    }
  }

  passport.lifecycleEvents.push({
    type: String(type || 'custom'),
    actorDid: String(actorDid || ''),
    location: String(location || ''),
    notes: String(notes || ''),
    txHash: String(txHash || ''),
    externalRef: extRef,
    metadata: sanitizeMetadata(metadata),
    occurredAt: normalizeOccurredAt(occurredAt),
  });
  passport.passportVersion = Number(passport.passportVersion || 1) + 1;
  await passport.save();

  return { ok: true, passportDid: passport.passportDid, passportVersion: passport.passportVersion };
}

module.exports = {
  appendLifecycleEventForArtifact,
};
