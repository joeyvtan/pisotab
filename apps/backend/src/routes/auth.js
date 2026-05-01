/**
 * Auth routes — login, register, forgot/reset password, current user.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { emitBadges } = require('../services/badges');
const { sendPasswordReset, SMTP_CONFIGURED } = require('../services/mailer');

const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');

const JWT_SECRET  = process.env.JWT_SECRET || 'dev_secret';
const TOTP_ISSUER = process.env.TOTP_ISSUER || 'JJT PisoTab';

function validatePassword(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account pending approval. Please wait for a Super Admin to approve your account.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }

    // If 2FA is enabled, issue a short-lived temp token instead of full access
    if (user.totp_enabled) {
      const tempToken = jwt.sign({ id: user.id, totp_pending: true }, JWT_SECRET, { expiresIn: '5m' });
      return res.json({ requires_totp: true, temp_token: tempToken });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id, username: user.username, role: user.role,
        email: user.email || null, full_name: user.full_name || null,
        business_name: user.business_name || null, status: user.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, email, full_name, business_name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const db = getDb();
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    if (email) {
      const emailTaken = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (emailTaken) return res.status(409).json({ error: 'Email already registered' });
    }

    const id = 'usr_' + uuidv4().replace(/-/g, '').slice(0, 8);
    const hashed = bcrypt.hashSync(password, 10);
    await db.run(
      `INSERT INTO users (id, username, password, role, email, full_name, business_name, status)
       VALUES (?, ?, ?, 'admin', ?, ?, ?, 'pending')`,
      [id, username, hashed, email || null, full_name || null, business_name || null]
    );

    emitBadges(req.io);
    res.status(201).json({
      message: 'Registration successful. Your account is pending approval by a Super Admin.',
      user: { id, username, role: 'admin', status: 'pending' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });

  try {
    const db = getDb();
    const user = await db.get(
      'SELECT id, username, email, full_name FROM users WHERE username = ?', [username]
    );
    if (!user) return res.json({ message: 'If the account exists, a reset token has been issued.' });

    const token = uuidv4();
    const id = 'prt_' + uuidv4().replace(/-/g, '').slice(0, 8);
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    await db.run("UPDATE password_reset_tokens SET used_at = unixepoch() WHERE user_id = ? AND used_at IS NULL", [user.id]);
    await db.run(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [id, user.id, token, expiresAt]
    );

    if (SMTP_CONFIGURED && user.email) {
      sendPasswordReset(user, token).catch(() => {});
      return res.json({ message: 'A password reset link has been sent to your email.' });
    }
    res.json({ message: 'Reset token issued. Use it within 1 hour.', reset_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ error: 'token and new_password required' });
  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const record = await db.get(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > ?',
      [token, now]
    );
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hashed = bcrypt.hashSync(new_password, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, record.user_id]);
    await db.run('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?', [now, record.id]);

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get(
      'SELECT id, username, role, email, full_name, business_name, status, created_at, telegram_bot_token, telegram_chat_id, totp_enabled FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/auth/me/profile — update own email, full_name, business_name
router.patch('/me/profile', requireAuth, async (req, res) => {
  const { email, full_name, business_name } = req.body;
  try {
    const db = getDb();
    if (email) {
      const taken = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
      if (taken) return res.status(409).json({ error: 'Email already in use by another account' });
    }
    await db.run(
      `UPDATE users SET email = COALESCE(?, email), full_name = COALESCE(?, full_name), business_name = COALESCE(?, business_name) WHERE id = ?`,
      [email ?? null, full_name ?? null, business_name ?? null, req.user.id]
    );
    const updated = await db.get('SELECT id, username, role, email, full_name, business_name, status FROM users WHERE id = ?', [req.user.id]);
    res.json({ ok: true, user: updated });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/auth/me/telegram
router.patch('/me/telegram', requireAuth, async (req, res) => {
  const { telegram_bot_token, telegram_chat_id } = req.body;
  try {
    const db = getDb();
    await db.run(
      'UPDATE users SET telegram_bot_token = ?, telegram_chat_id = ? WHERE id = ?',
      [telegram_bot_token || null, telegram_chat_id || null, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password required' });
  }
  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const db = getDb();
    const user = await db.get('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = bcrypt.compareSync(current_password, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = bcrypt.hashSync(new_password, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/totp/verify — complete login with TOTP code (uses temp_token)
router.post('/totp/verify', async (req, res) => {
  const { temp_token, code } = req.body;
  if (!temp_token || !code) return res.status(400).json({ error: 'temp_token and code required' });
  try {
    let payload;
    try { payload = jwt.verify(temp_token, JWT_SECRET); } catch {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }
    if (!payload.totp_pending) return res.status(400).json({ error: 'Invalid token type' });

    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user || !user.totp_secret) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = speakeasy.totp.verify({
      secret: user.totp_secret, encoding: 'base32',
      token: String(code).replace(/\s/g, ''), window: 1,
    });
    if (!valid) return res.status(401).json({ error: 'Invalid verification code' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id, username: user.username, role: user.role,
        email: user.email || null, full_name: user.full_name || null,
        business_name: user.business_name || null, status: user.status,
      },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/totp/setup — generate a TOTP secret and QR code for the logged-in user
router.get('/totp/setup', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT username, totp_enabled FROM users WHERE id = ?', [req.user.id]);
    if (user?.totp_enabled) return res.status(400).json({ error: '2FA is already enabled' });

    const secret = speakeasy.generateSecret({
      name: `${TOTP_ISSUER} (${user?.username || req.user.id})`,
      issuer: TOTP_ISSUER, length: 20,
    });

    // Store the pending secret (not yet enabled — user must verify first)
    await db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret.base32, req.user.id]);

    const qr = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qr_code: qr });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/totp/enable — verify code then activate 2FA
router.post('/totp/enable', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const db = getDb();
    const user = await db.get('SELECT totp_secret, totp_enabled FROM users WHERE id = ?', [req.user.id]);
    if (!user?.totp_secret) return res.status(400).json({ error: 'Run setup first' });
    if (user.totp_enabled) return res.status(400).json({ error: '2FA already enabled' });

    const valid = speakeasy.totp.verify({
      secret: user.totp_secret, encoding: 'base32',
      token: String(code).replace(/\s/g, ''), window: 1,
    });
    if (!valid) return res.status(400).json({ error: 'Invalid code — check your authenticator app' });

    await db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [req.user.id]);
    res.json({ ok: true, message: '2FA enabled successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/totp/disable — disable 2FA (requires current TOTP code)
router.post('/totp/disable', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const db = getDb();
    const user = await db.get('SELECT totp_secret, totp_enabled FROM users WHERE id = ?', [req.user.id]);
    if (!user?.totp_enabled) return res.status(400).json({ error: '2FA is not enabled' });

    const valid = speakeasy.totp.verify({
      secret: user.totp_secret, encoding: 'base32',
      token: String(code).replace(/\s/g, ''), window: 1,
    });
    if (!valid) return res.status(400).json({ error: 'Invalid code' });

    await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [req.user.id]);
    res.json({ ok: true, message: '2FA disabled' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Middleware ────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
}

module.exports = { router, requireAuth, requireAdmin, requireSuperAdmin, validatePassword };
