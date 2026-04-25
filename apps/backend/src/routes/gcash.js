/**
 * GCash settings routes.
 * Any authenticated user can read (to display payment info on Buy License page).
 * Only superadmin can update.
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireAuth, requireSuperAdmin } = require('./auth');

// GET /api/gcash-settings — returns current GCash payment details
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const settings = await db.get("SELECT * FROM gcash_settings WHERE id = 'gcash_main'", []);
    // Return empty defaults if not yet configured
    res.json(settings || { id: 'gcash_main', gcash_name: '', gcash_number: '', qr_image_url: null });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/gcash-settings — superadmin updates GCash payment details
router.patch('/', requireAuth, requireSuperAdmin, async (req, res) => {
  const { gcash_name, gcash_number, qr_image_url } = req.body;
  if (!gcash_name && !gcash_number) {
    return res.status(400).json({ error: 'gcash_name or gcash_number required' });
  }

  try {
    const db = getDb();
    const existing = await db.get("SELECT id FROM gcash_settings WHERE id = 'gcash_main'", []);
    const now = Math.floor(Date.now() / 1000);

    if (existing) {
      await db.run(
        `UPDATE gcash_settings SET
          gcash_name   = COALESCE(?, gcash_name),
          gcash_number = COALESCE(?, gcash_number),
          qr_image_url = COALESCE(?, qr_image_url),
          updated_by   = ?,
          updated_at   = ?
        WHERE id = 'gcash_main'`,
        [gcash_name || null, gcash_number || null, qr_image_url || null, req.user.id, now]
      );
    } else {
      await db.run(
        `INSERT INTO gcash_settings (id, gcash_name, gcash_number, qr_image_url, updated_by, updated_at)
         VALUES ('gcash_main', ?, ?, ?, ?, ?)`,
        [gcash_name || '', gcash_number || '', qr_image_url || null, req.user.id, now]
      );
    }

    res.json(await db.get("SELECT * FROM gcash_settings WHERE id = 'gcash_main'", []));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
