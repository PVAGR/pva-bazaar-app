const crypto = require('crypto');

function generateItemAccessCode() {
  const groups = Array.from({ length: 4 }, () => crypto.randomBytes(2).toString('hex').toUpperCase());
  return `PVA-${groups.join('-')}`;
}

function hashItemAccessCode(code = '') {
  return crypto.createHash('sha256').update(String(code || ''), 'utf8').digest('hex');
}

function formatAccessCodeHint(code = '') {
  const value = String(code || '').trim();
  if (!value) return '';
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function ensureItemAccessCode(artifact = {}) {
  const stewardship = artifact.stewardship || {};
  const existingCode = String(stewardship.accessCode || '').trim();
  const accessCode = existingCode || generateItemAccessCode();
  const nextStewardship = {
    ...stewardship,
    accessCode,
    accessCodeHash: hashItemAccessCode(accessCode),
    accessCodeHint: formatAccessCodeHint(accessCode),
    accessCodeIssuedAt: stewardship.accessCodeIssuedAt || new Date(),
    claimCodeHint: stewardship.claimCodeHint || formatAccessCodeHint(accessCode),
  };

  artifact.stewardship = nextStewardship;
  return artifact;
}

function matchesItemAccessCode(artifact = {}, code = '') {
  const value = String(code || '').trim();
  if (!value) return false;
  const accessCode = String(artifact?.stewardship?.accessCode || '').trim();
  const accessCodeHash = String(artifact?.stewardship?.accessCodeHash || '').trim();
  return Boolean(
    (accessCode && accessCode === value) ||
    (accessCodeHash && hashItemAccessCode(value) === accessCodeHash),
  );
}

module.exports = {
  ensureItemAccessCode,
  formatAccessCodeHint,
  generateItemAccessCode,
  hashItemAccessCode,
  matchesItemAccessCode,
};
