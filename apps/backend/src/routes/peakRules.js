/**
 * Peak pricing rules CRUD — admin only.
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('./auth');

router.get('/', requireAuth, async (_req, res) => {
  try {
    res.json(await getDb().all('SELECT * FROM peak_rules ORDER BY created_at DESC'));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, days_of_week, start_hour, end_hour, multiplier } = req.body;
  if (!name || start_hour === undefined || end_hour === undefined || !multiplier) {
    return res.status(400).json({ error: 'name, start_hour, end_hour, multiplier required' });
  }
  if (multiplier <= 0) return res.status(400).json({ error: 'multiplier must be > 0' });
  try {
    const db = getDb();
    const id = 'peak_' + uuidv4().replace(/-/g, '').slice(0, 12);
    await db.run(
      'INSERT INTO peak_rules (id, name, days_of_week, start_hour, end_hour, multiplier) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, days_of_week ?? '0,1,2,3,4,5,6', Number(start_hour), Number(end_hour), Number(multiplier)]
    );
    res.status(201).json(await db.get('SELECT * FROM peak_rules WHERE id = ?', [id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, days_of_week, start_hour, end_hour, multiplier, is_active } = req.body;
  try {
    const db = getDb();
    const rule = await db.get('SELECT * FROM peak_rules WHERE id = ?', [req.params.id]);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    await db.run(
      'UPDATE peak_rules SET name = COALESCE(?, name), days_of_week = COALESCE(?, days_of_week), start_hour = COALESCE(?, start_hour), end_hour = COALESCE(?, end_hour), multiplier = COALESCE(?, multiplier), is_active = COALESCE(?, is_active) WHERE id = ?',
      [name ?? null, days_of_week ?? null,
       start_hour !== undefined ? Number(start_hour) : null,
       end_hour   !== undefined ? Number(end_hour)   : null,
       multiplier !== undefined ? Number(multiplier)  : null,
       is_active  !== undefined ? Number(is_active)   : null,
       req.params.id]
    );
    res.json(await db.get('SELECT * FROM peak_rules WHERE id = ?', [req.params.id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    if (!await db.get('SELECT id FROM peak_rules WHERE id = ?', [req.params.id])) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    await db.run('DELETE FROM peak_rules WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
