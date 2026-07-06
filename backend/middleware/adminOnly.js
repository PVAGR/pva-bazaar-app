const requireAdmin = function (req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Admin access required' });
  }
  next();
};

module.exports = requireAdmin;
module.exports.requireAdmin = requireAdmin;
