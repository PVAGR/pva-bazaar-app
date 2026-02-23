const jwt = require('jsonwebtoken');

function isObjectIdHex(v) {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
}

const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'No authentication token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Many routes assume req.user.id is a Mongo ObjectId (stored in DB as userId/ObjectId).
    // Old tokens (or mis-issued tokens) can contain non-ObjectId ids and would otherwise
    // cause downstream CastErrors that look like random 500s.
    if (!decoded || !decoded.id || !isObjectIdHex(String(decoded.id))) {
      return res.status(401).json({
        ok: false,
        message: 'Invalid authentication token (subject). Please log in again.',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      ok: false,
      message: 'Invalid authentication token',
    });
  }
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
