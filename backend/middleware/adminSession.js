const jwt = require('jsonwebtoken');

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
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ ok: false, message: 'JWT secret not configured' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Forbidden (not admin)' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired session' });
  }
};
