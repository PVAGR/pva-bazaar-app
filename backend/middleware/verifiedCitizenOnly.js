const User = require('../models/User');

module.exports = async function verifiedCitizenOnly(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id).select('passportStatus governanceToken');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const isVerifiedCitizen = user.passportStatus === 'verified' && user.governanceToken === true;
    if (!isVerifiedCitizen) {
      return res.status(403).json({ ok: false, message: 'Verified citizen access required' });
    }

    req.verifiedCitizen = true;
    return next();
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
};
