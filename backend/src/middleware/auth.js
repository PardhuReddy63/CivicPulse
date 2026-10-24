const jwt = require('jsonwebtoken');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required. Missing Bearer token.' }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await userRepository.findById(decoded.user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User belonging to token does not exist.' }
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated.' }
      });
    }

    if (!user.verified) {
      return res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_UNVERIFIED', message: 'Email not verified. Please complete OTP verification.' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.' }
    });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: requires one of roles [${allowedRoles.join(', ')}]. Current role: ${req.user?.role}`
        }
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
