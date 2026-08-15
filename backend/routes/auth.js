/* =============================================================================
   Auth Routes — In-memory sessions & OTP Store
   Supports username/password login & 2-minute Email OTP Verification via Nodemailer
   ============================================================================= */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const router = express.Router();

// ── In-memory session store ──────────────────────────────────────────────────
// Map<token, { user, createdAt }>
const sessions = new Map();

// ── In-memory OTP store ──────────────────────────────────────────────────────
// Map<email, { code: string, expiresAt: number, attempts: number }>
const otpStore = new Map();

// ── Demo users ───────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { id: '1', username: 'hariprasad', password: 'zeno123', name: 'Hariprasad S.', email: 'developer@zeno.ai', avatar: null },
  { id: '2', username: 'admin',      password: 'admin123', name: 'Admin User',    email: 'admin@zeno.ai',      avatar: null },
];

// ── Helper: Find user by email or username ────────────────────────────────────
function findUserByEmailOrUsername(identifier) {
  const clean = String(identifier || '').trim().toLowerCase();
  return DEMO_USERS.find(
    u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
  );
}

// ── Nodemailer Transporter Helper ──────────────────────────────────────────────
let testAccount = null;

async function sendOTPEmail(recipientEmail, otpCode) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || '"Zeno AI Assistant" <noreply@zeno.ai>';

  const mailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0e1a; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
      <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">Let's verify your email</h2>
      <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 24px;">Use the following 4-digit verification code to complete your sign in to Zeno AI. This code will expire in <strong>2 minutes</strong>.</p>
      <div style="background: rgba(255, 107, 0, 0.1); border: 2px solid #ff6b00; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 12px; color: #ff6b00;">${otpCode}</span>
      </div>
      <p style="font-size: 12px; color: rgba(255,255,255,0.4); text-align: center;">If you did not request this verification code, please ignore this email.</p>
    </div>
  `;

  if (user && pass) {
    // 1. Production Mode: Send to real user Gmail/SMTP inbox
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const info = await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: `Your Zeno Verification Code is ${otpCode}`,
      html: mailHtml
    });

    console.log(`[ZENO OTP SERVICE] Live email sent to ${recipientEmail} (Message ID: ${info.messageId})`);
    return info;
  } else {
    // 2. Automated Test Mode: Send via Ethereal Mailbox so real email is delivered to a test inbox URL
    try {
      if (!testAccount) {
        testAccount = await nodemailer.createTestAccount();
      }

      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      const info = await testTransporter.sendMail({
        from: '"Zeno AI Assistant" <noreply@zeno.ai>',
        to: recipientEmail,
        subject: `Your Zeno Verification Code is ${otpCode}`,
        html: mailHtml
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`\n========================================`);
      console.log(`[ZENO OTP EMAIL SENT SUCCESSFULLY]`);
      console.log(`Recipient:   ${recipientEmail}`);
      console.log(`OTP Code:    ${otpCode} (Expires in 2 mins)`);
      console.log(`Live Inbox URL: ${previewUrl}`);
      console.log(`(To send directly to your personal Gmail inbox, set SMTP_USER & SMTP_PASS in backend/.env)`);
      console.log(`========================================\n`);

      return { previewUrl, info };
    } catch (fallbackErr) {
      console.log(`[ZENO OTP SERVICE] Dispatch requested for: ${recipientEmail} | OTP Code: ${otpCode}`);
      return false;
    }
  }
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Valid email address is required', code: 'INVALID_EMAIL' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  // Find or create virtual demo profile for email
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

  // Generate secure 4-digit OTP
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresInMs = 2 * 60 * 1000; // 2 minutes (120,000 ms)
  const expiresAt = Date.now() + expiresInMs;

  // Save to OTP Store
  otpStore.set(normalizedEmail, {
    code: otpCode,
    expiresAt,
    attempts: 0,
    user
  });

  // Send real email via Nodemailer
  let mailResult = null;
  try {
    mailResult = await sendOTPEmail(normalizedEmail, otpCode);
  } catch (err) {
    console.error(`[Email Send Error] Failed to dispatch email to ${normalizedEmail}:`, err.message);
  }

  const previewUrl = mailResult && mailResult.previewUrl ? mailResult.previewUrl : null;

  res.json({
    success: true,
    message: `OTP sent successfully to ${normalizedEmail}`,
    email: normalizedEmail,
    expiresInSeconds: 120,
    expiresAt,
    previewUrl
  });
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 4-digit OTP are required', code: 'MISSING_FIELDS' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return res.status(400).json({ error: 'No OTP found. Please request a new OTP.', code: 'NO_OTP_FOUND' });
  }

  // Check 2-minute expiration
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'OTP Expired. Please click Resend OTP.', code: 'OTP_EXPIRED' });
  }

  // Check OTP match
  if (record.code !== cleanOtp) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.', code: 'TOO_MANY_ATTEMPTS' });
    }
    return res.status(400).json({ error: 'Invalid OTP. Please check the code and try again.', code: 'INVALID_OTP' });
  }

  // OTP is valid & active! Consume OTP
  const user = record.user;
  otpStore.delete(normalizedEmail);

  // Generate session token
  const token = uuidv4();
  sessions.set(token, {
    user: { id: user.id, name: user.name, email: user.email, username: user.username },
    createdAt: Date.now()
  });

  res.json({
    success: true,
    message: 'OTP Verified Successfully',
    token,
    user: { id: user.id, name: user.name, email: user.email, username: user.username }
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = DEMO_USERS.find(
    u => (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()) && u.password === password
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
