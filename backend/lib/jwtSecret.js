const FALLBACK_JWT_SECRET = 'pva-bazaar-fallback-secret-v1';

function getJwtSecret() {
  const configured = String(process.env.JWT_SECRET || '').trim();
  return configured || FALLBACK_JWT_SECRET;
}

function hasConfiguredJwtSecret() {
  return Boolean(String(process.env.JWT_SECRET || '').trim());
}

module.exports = {
  FALLBACK_JWT_SECRET,
  getJwtSecret,
  hasConfiguredJwtSecret,
};
