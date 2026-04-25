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

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

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
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

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
  if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

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
      'SELECT id, username, role, email, full_name, business_name, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
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

module.exports = { router, requireAuth, requireAdmin, requireSuperAdmin };
