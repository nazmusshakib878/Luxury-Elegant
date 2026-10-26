const { verifyToken } = require('../utils/security');

/**
 * Middleware to extract and verify auth token from Authorization header or 't' query parameter.
 */
function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    // Token must be in the Authorization header only (never a query string, which is logged).
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    req.user = verifyToken(token);
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Restrict access to authenticated users with given roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Login required' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}

const requireAdmin = requireRole('admin');
const requireStaffOrAdmin = requireRole('admin', 'staff');
const requireAuth = requireRole();

module.exports = {
  authenticateUser,
  requireRole,
  requireAdmin,
  requireStaffOrAdmin,
  requireAuth,
};
