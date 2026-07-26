/* =============================================================================
   Auth Routes — In-memory sessions (no database)
   Sessions live only while server runs. Chat history lives in localStorage.
   ============================================================================= */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// ── In-memory session store ──────────────────────────────────────────────────
// Map<token, { user, createdAt }>
const sessions = new Map();

// ── Demo users (in-memory, no DB) ────────────────────────────────────────────
const DEMO_USERS = [
  { id: '1', username: 'hariprasad', password: 'zeno123', name: 'Hariprasad S.', email: 'developer@zeno.ai', avatar: null },
  { id: '2', username: 'admin',      password: 'admin123', name: 'Admin User',    email: 'admin@zeno.ai',      avatar: null },
];

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = DEMO_USERS.find(
    u => u.username === username.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
  }

  const token = uuidv4();
  sessions.set(token, {
    user: { id: user.id, name: user.name, email: user.email, username: user.username },
    createdAt: Date.now()
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, username: user.username }
  });
});

// ── DELETE /api/auth/logout ───────────────────────────────────────────────────
router.delete('/logout', (req, res) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { user } = sessions.get(token);
  res.json({ user });
});

// Export sessions so middleware can access it
module.exports = router;
module.exports.sessions = sessions;
