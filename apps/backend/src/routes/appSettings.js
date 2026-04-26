/**
 * App settings routes — key/value store for platform feature flags.
 * GET  /api/app-settings         requireAuth     — returns all settings
 * PATCH /api/app-settings/:key   requireSuperAdmin — update a single setting
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireAuth, requireSuperAdmin } = require('./auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all('SELECT key, value FROM app_settings', []);
    const result = {};
    for (const row of rows) result[row.key] = row.value;
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:key', requireAuth, requireSuperAdmin, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value required' });

  try {
    const db = getDb();
    // Upsert — create the key if it doesn't exist yet
    await db.run(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, String(value)]
    );
    res.json({ key, value: String(value) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
