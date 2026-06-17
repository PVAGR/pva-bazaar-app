const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../lib/jwtSecret');

// Middleware to check for a valid admin session via HttpOnly cookie
module.exports = function adminSession(req, res, next) {
  const cookieToken = req.cookies && req.cookies.admin_token;
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const token = cookieToken || bearerToken;

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Not authenticated (no token)' });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Forbidden (not admin)' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired session' });
  }
};
