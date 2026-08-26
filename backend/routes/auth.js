/* =============================================================================
   Auth Routes — Sessions & Google OAuth 2.0 / Gmail API OTP Authentication
   - 6-digit cryptographically secure OTP
   - 5-minute expiration
   - Rate limiting on OTP requests
   - Maximum 5 verification attempts
   - Secure server-side validation using SHA-256 hashing
   ============================================================================= */

const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/email');
const router = express.Router();

// ── In-memory session store ──────────────────────────────────────────────────
// Map<token, { user, createdAt }>
const sessions = new Map();

// ── In-memory OTP store ──────────────────────────────────────────────────────
// Map<email, { hash: string, expiresAt: number, attempts: number, lastRequestedAt: number, user: object }>
const otpStore = new Map();

// ── Demo users ───────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { id: '1', username: 'hariprasad', password: 'zeno123', name: 'Hariprasad S.', email: 'developer@zeno.ai', avatar: null },
  { id: '2', username: 'admin',      password: 'admin123', name: 'Admin User',    email: 'admin@zeno.ai',      avatar: null },
];

// ── Helper: Hash OTP code securely with SHA-256 ──────────────────────────────
function hashOTP(code) {
  return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
}

// ── Helper: Find user by email or username ────────────────────────────────────
function findUserByEmailOrUsername(identifier) {
  const clean = String(identifier || '').trim().toLowerCase();
  return DEMO_USERS.find(
    u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
  );
}

// ── Helper: Validate email format ────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({
      error: 'Please enter a valid email address.',
      code: 'INVALID_EMAIL'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  // 1. Rate Limiting Protection (Minimum 45s between OTP requests)
  const existingRecord = otpStore.get(normalizedEmail);
  const RESEND_COOLDOWN_MS = 45 * 1000;

  if (existingRecord && existingRecord.lastRequestedAt) {
    const elapsed = now - existingRecord.lastRequestedAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSecs = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSecs}s before requesting another OTP.`,
        code: 'RATE_LIMITED',
        retryAfterSeconds: waitSecs
      });
    }
  }

  // 2. Invalidate any existing OTP for this email
  if (existingRecord) {
    otpStore.delete(normalizedEmail);
  }

  // 3. Find or create virtual demo profile for user
  let user = findUserByEmailOrUsername(normalizedEmail);
  if (!user) {
    const namePart = normalizedEmail.split('@')[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    user = {
      id: `user_${Date.now()}`,
      username: namePart,
      name: formattedName,
      email: normalizedEmail,
      avatar: null
    };
  }

  // 4. Generate cryptographically secure random 4-digit OTP (1000 - 9999)
  const otpCode = crypto.randomInt(1000, 10000).toString();
  const OTP_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
  const expiresAt = now + OTP_EXPIRATION_MS;

  // 5. Store hashed OTP on server
  otpStore.set(normalizedEmail, {
    hash: hashOTP(otpCode),
    expiresAt,
    attempts: 0,
    lastRequestedAt: now,
    user
  });

  // 6. Dispatch email using Google OAuth 2.0 / SMTP / Dev-console fallback
  try {
    const mailResult = await emailService.sendOTPEmail(normalizedEmail, otpCode, 5);

    return res.json({
      success: true,
      message: `A 4-digit verification code was sent to ${normalizedEmail}`,
      email: normalizedEmail,
      expiresInSeconds: 300,
      expiresAt,
      previewUrl: mailResult && mailResult.previewUrl ? mailResult.previewUrl : null,
      // In dev mode (no email configured) return OTP so user can proceed without email
      devOtp: mailResult && mailResult.devOtp ? mailResult.devOtp : undefined
    });
  } catch (err) {
    // Invalidate stored OTP if dispatch failed
    otpStore.delete(normalizedEmail);

    console.error(`[Email Dispatch Error for ${normalizedEmail}]:`, err.message);

    // Provide clean, actionable error response
    let userMsg = 'Failed to deliver OTP email. Please check your Google OAuth server configuration.';
    if (err.message.includes('not fully configured')) {
      userMsg = 'Google OAuth credentials not configured on backend. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env';
    } else if (err.message.includes('invalid_grant') || err.message.includes('authentication failed')) {
      userMsg = 'Google OAuth authentication failed. Refresh token may be expired or invalid.';
    }

    return res.status(500).json({
      error: userMsg,
      code: 'EMAIL_DISPATCH_FAILED'
    });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      error: 'Email and 4-digit verification code are required.',
      code: 'MISSING_FIELDS'
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  // Validate format (exactly 4 digits)
  if (!/^\d{4}$/.test(cleanOtp)) {
    return res.status(400).json({
      error: 'Please enter a valid 4-digit verification code.',
      code: 'INVALID_FORMAT'
    });
  }

  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return res.status(400).json({
      error: 'No active OTP found. Please request a new code.',
      code: 'NO_OTP_FOUND'
    });
  }

  // 1. Check 5-minute expiration
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({
      error: 'OTP expired. Please request a new code.',
      code: 'OTP_EXPIRED'
    });
  }

  // 2. Check maximum 5 attempts
  if (record.attempts >= 5) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({
      error: 'Too many incorrect attempts. Please request a new code.',
      code: 'TOO_MANY_ATTEMPTS'
    });
  }

  // 3. Verify OTP using constant-time hash comparison
  const providedHash = hashOTP(cleanOtp);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(providedHash, 'hex'),
    Buffer.from(record.hash, 'hex')
  );

  if (!isMatch) {
    record.attempts += 1;
    const remaining = 5 - record.attempts;
    if (remaining <= 0) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        error: 'Too many incorrect attempts. Please request a new code.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }
    return res.status(400).json({
      error: `Invalid verification code. (${remaining} attempt${remaining > 1 ? 's' : ''} left)`,
      code: 'INVALID_OTP',
      remainingAttempts: remaining
    });
  }

  // 4. OTP verified successfully! Invalidate OTP immediately
  const user = record.user;
  otpStore.delete(normalizedEmail);

  // 5. Generate secure session token
  const token = uuidv4();
  sessions.set(token, {
    user: { id: user.id, name: user.name, email: user.email, username: user.username },
    createdAt: Date.now()
  });

  return res.json({
    success: true,
    message: 'OTP Verified Successfully',
    token,
    user: { id: user.id, name: user.name, email: user.email, username: user.username }
  });
});

// ── POST /api/auth/register (User Creation / Sign Up) ───────────────────────────
router.post('/register', (req, res) => {
  const { name, email, username, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Full name, email, and password are required.',
      code: 'MISSING_FIELDS'
    });
  }

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanUsername = String(username || cleanEmail.split('@')[0]).trim().toLowerCase();
  const cleanPassword = String(password);

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      error: 'Please enter a valid email address.',
      code: 'INVALID_EMAIL'
    });
  }

  if (cleanPassword.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters long.',
      code: 'WEAK_PASSWORD'
    });
  }

  if (confirmPassword !== undefined && cleanPassword !== String(confirmPassword)) {
    return res.status(400).json({
      error: 'Passwords do not match. Please verify.',
      code: 'PASSWORD_MISMATCH'
    });
  }

  // Check if username or email is already registered
  const existingUser = DEMO_USERS.find(
    u => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername
  );

  if (existingUser) {
    const isEmailTaken = existingUser.email.toLowerCase() === cleanEmail;
    return res.status(409).json({
      error: isEmailTaken 
        ? 'An account with this email already exists. Please sign in.' 
        : 'This username is already taken. Please choose another.',
      code: isEmailTaken ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN'
    });
  }

  // Create new user profile
  const newUser = {
    id: `user_${Date.now()}`,
    username: cleanUsername,
    password: cleanPassword,
    name: cleanName,
    email: cleanEmail,
    avatar: null,
    createdAt: Date.now()
  };

  DEMO_USERS.push(newUser);

  // Generate session token
  const token = uuidv4();
  sessions.set(token, {
    user: { id: newUser.id, name: newUser.name, email: newUser.email, username: newUser.username },
    createdAt: Date.now()
  });

  return res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, username: newUser.username }
  });
});

// Alias for /register
router.post('/signup', (req, res, next) => {
  req.url = '/register';
  router.handle(req, res, next);
});

// ── POST /api/auth/login (Password alternative) ───────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and password required', code: 'MISSING_FIELDS' });
  }

  const cleanIdentifier = String(username).trim().toLowerCase();
  const user = DEMO_USERS.find(
    u => (u.username.toLowerCase() === cleanIdentifier || u.email.toLowerCase() === cleanIdentifier) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password', code: 'INVALID_CREDENTIALS' });
  }

  const token = uuidv4();
  sessions.set(token, {
    user: { id: user.id, name: user.name, email: user.email, username: user.username },
    createdAt: Date.now()
  });

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, username: user.username }
  });
});

// ── DELETE /api/auth/logout ───────────────────────────────────────────────────
router.delete('/logout', (req, res) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) sessions.delete(token);
  return res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { user } = sessions.get(token);
  return res.json({ user });
});

module.exports = router;
module.exports.sessions = sessions;
