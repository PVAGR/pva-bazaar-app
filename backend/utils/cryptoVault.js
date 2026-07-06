const crypto = require('crypto');

function mustEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

function getKey32() {
  // Accept hex/base64/any string; derive a stable 32-byte key.
  const raw = mustEnv('OAUTH_TOKEN_ENC_KEY');
  const buf = Buffer.from(raw, /^[a-f\d]{64}$/i.test(raw) ? 'hex' : 'utf8');
  return crypto.createHash('sha256').update(buf).digest(); // 32 bytes
}

function encryptJson(json) {
  const key = getKey32();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(json || {}), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  };
}

function decryptJson(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.v !== 1) return null;
  const key = getKey32();
  const iv = Buffer.from(String(payload.iv || ''), 'base64');
  const tag = Buffer.from(String(payload.tag || ''), 'base64');
  const data = Buffer.from(String(payload.data || ''), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  try {
    return JSON.parse(dec.toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = { encryptJson, decryptJson };
