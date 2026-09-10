const FALLBACK_JWT_SECRET = 'pva-bazaar-fallback-secret-v1';

function isProduction() {
  return String(process.env.NODE_ENV || '').trim() === 'production';
}

function getConfiguredSecret() {
  return String(process.env.JWT_SECRET || '').trim();
}

/**
 * Resolve the JWT secret used to sign and verify auth tokens.
 *
 * In production the secret must come from the environment. If it is missing,
 * authentication FAILS CLOSED (throws) instead of silently signing tokens
 * with a public fallback value that anyone could use to forge sessions.
 * Outside production a well-known fallback keeps local development usable.
 */
function getJwtSecret() {
  const configured = getConfiguredSecret();
  if (configured) return configured;
  if (isProduction()) {
    throw new Error('JWT_SECRET is not configured. Production authentication is disabled (fail closed).');
  }
  return FALLBACK_JWT_SECRET;
}

function hasConfiguredJwtSecret() {
  return Boolean(getConfiguredSecret());
}

module.exports = {
  FALLBACK_JWT_SECRET,
  getJwtSecret,
  hasConfiguredJwtSecret,
  isProduction,
};