/**
 * Notification inbox routes.
 */
const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');
const { requireAuth } = require('./auth');

// GET /api/notifications — returns notifications for the logged-in user
// Superadmin sees global (user_id = null) + their own.
// Admin/staff see only their own.
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const isSuperAdmin = req.user.role === 'superadmin';
    const query = isSuperAdmin
      ? `SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 100`
      : `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`;
    res.json(await db.all(query, [req.user.id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const isSuperAdmin = req.user.role === 'superadmin';
    const row = isSuperAdmin
      ? await db.get(`SELECT COUNT(*) AS count FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND read = 0`, [req.user.id])
      : await db.get(`SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0`, [req.user.id]);
    res.json({ count: row?.count ?? 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    await db.run(`UPDATE notifications SET read = 1 WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const isSuperAdmin = req.user.role === 'superadmin';
    if (isSuperAdmin) {
      await db.run(`UPDATE notifications SET read = 1 WHERE user_id = ? OR user_id IS NULL`, [req.user.id]);
    } else {
      await db.run(`UPDATE notifications SET read = 1 WHERE user_id = ?`, [req.user.id]);
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/notifications/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await getDb().run(`DELETE FROM notifications WHERE id = ?`, [req.params.id]);
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
