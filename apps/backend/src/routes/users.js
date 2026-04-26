/**
 * User management routes.
 * Superadmin: full control (list all, approve, suspend, delete).
 * Admin: can create and delete staff accounts only.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin, requireSuperAdmin, validatePassword } = require('./auth');
const { emitBadges } = require('../services/badges');
const { sendAccountApproved } = require('../services/mailer');

// GET /api/users — list all users
// Superadmin sees everyone; admin sees only staff under them
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const isSuperAdmin = req.user.role === 'superadmin';
    const query = isSuperAdmin
      ? `SELECT id, username, role, email, full_name, business_name, status, created_at
         FROM users ORDER BY created_at ASC`
      : `SELECT id, username, role, email, full_name, business_name, status, created_at
         FROM users WHERE role = 'staff' ORDER BY created_at ASC`;
    res.json(await db.all(query, []));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/users — create a staff account (admin or superadmin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role, email, full_name, business_name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  // Admins can only create staff; superadmin can create admin, staff, or superadmin
  const allowedRoles = req.user.role === 'superadmin' ? ['superadmin', 'admin', 'staff'] : ['staff'];
  const assignedRole = allowedRoles.includes(role) ? role : 'staff';

  try {
    const db = getDb();
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const id = 'usr_' + uuidv4().replace(/-/g, '').slice(0, 8);
    const hashed = bcrypt.hashSync(password, 10);
    await db.run(
      `INSERT INTO users (id, username, password, role, email, full_name, business_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [id, username, hashed, assignedRole, email || null, full_name || null, business_name || null]
    );

    res.status(201).json({ id, username, role: assignedRole, status: 'approved' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/users/:id/approve — superadmin approves a pending account
router.patch('/:id/approve', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT id, status FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'approved') return res.status(400).json({ error: 'Already approved' });

    const now = Math.floor(Date.now() / 1000);
    await db.run(
      `UPDATE users SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`,
      [req.user.id, now, req.params.id]
    );

    // Send approval email (fire-and-forget — never blocks the response)
    const approved = await db.get('SELECT username, email, full_name FROM users WHERE id = ?', [req.params.id]);
    sendAccountApproved(approved).catch(() => {});

    emitBadges(req.io);
    res.json({ ok: true, status: 'approved' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/users/:id/suspend — superadmin suspends an account
router.patch('/:id/suspend', requireAuth, requireSuperAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot suspend your own account' });
  }
  try {
    const db = getDb();
    const user = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.run("UPDATE users SET status = 'suspended' WHERE id = ?", [req.params.id]);
    res.json({ ok: true, status: 'suspended' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/users/:id/role — superadmin changes a user's role
router.patch('/:id/role', requireAuth, requireSuperAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }
  const { role } = req.body;
  const validRoles = ['superadmin', 'admin', 'staff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be superadmin, admin, or staff' });
  }
  try {
    const db = getDb();
    const user = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ ok: true, role });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/users/:id — delete a user (cannot delete self)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    // Admin can only delete staff; superadmin can delete anyone (except themselves)
    if (req.user.role === 'admin') {
      const target = await getDb().get('SELECT role FROM users WHERE id = ?', [req.params.id]);
      if (target && target.role !== 'staff') {
        return res.status(403).json({ error: 'Admins can only delete staff accounts' });
      }
    }
    await getDb().run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
