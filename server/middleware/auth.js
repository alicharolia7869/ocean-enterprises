const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
let warnedMissingSecret = false;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';
  if (!secret) {
    if (process.env.STRICT_JWT_SECRET === 'true' && isProduction) {
      console.error('FATAL SECURITY ERROR: JWT_SECRET environment variable is not defined in production.');
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be configured in production.');
    }
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn('⚠️ WARNING: JWT_SECRET is not set in environment variables. Using derived fallback secret. Set JWT_SECRET in .env for production.');
    }
    const seed = process.env.DATABASE_URL || process.env.VERCEL_PROJECT_ID || process.env.VERCEL_URL || 'ocean_dev_secret_local_only_change_in_production_2026';
    return crypto.createHmac('sha256', 'ocean_enterprises_jwt_signing_key_2026').update(String(seed)).digest('hex');
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
