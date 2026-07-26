/* =============================================================================
   Auth Middleware — In-memory session validation (no database)
   ============================================================================= */

// Shared in-memory session store (imported from auth route)
const { sessions } = require('../routes/auth');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const session = sessions.get(token);

  // Check expiry (24 hours)
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
  }

  req.user  = session.user;
  req.token = token;
  next();
};
