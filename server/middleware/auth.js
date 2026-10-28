const jwt = require('jsonwebtoken');

const LOCAL_DEV_SECRET = 'ocean_dev_secret_local_only_change_in_production_2026';
let warnedMissingSecret = false;

function isProductionEnv() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';
  if (!secret) {
    if (isProductionEnv()) {
      const err = new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be configured in production.');
      err.code = 'ERR_MISSING_JWT_SECRET';
      throw err;
    }
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn('⚠️ WARNING: JWT_SECRET is not set in environment variables. Using local development secret. Set a strong random JWT_SECRET in production.');
    }
    return LOCAL_DEV_SECRET;
  }
  if (isProductionEnv() && secret.length < 16) {
    const err = new Error('FATAL SECURITY ERROR: JWT_SECRET in production must be at least 16 characters long.');
    err.code = 'ERR_WEAK_JWT_SECRET';
    throw err;
  }
  return secret;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.code === 'ERR_MISSING_JWT_SECRET' || err.code === 'ERR_WEAK_JWT_SECRET') {
      console.error('Authentication configuration error:', err.message);
      return res.status(503).json({ error: 'Authentication service is not configured. Please set a strong JWT_SECRET in production.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid or revoked authentication token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
  getJwtSecret,
  get JWT_SECRET() {
    return getJwtSecret();
  }
};
