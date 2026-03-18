const jwt = require('jsonwebtoken');

// Middleware to check for a valid admin session via HttpOnly cookie
module.exports = function adminSession(req, res, next) {
  const token = req.cookies && req.cookies.admin_token;
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Not authenticated (no token)' });
  }
  try {
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
