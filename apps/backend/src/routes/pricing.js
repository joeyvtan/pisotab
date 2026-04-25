/**
 * Pricing tier routes.
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('./auth');

router.get('/', async (_req, res) => {
  try {
    res.json(await getDb().all('SELECT * FROM pricing_tiers WHERE is_active = 1 ORDER BY amount_pesos ASC'));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, amount_pesos, duration_mins } = req.body;
  if (!name || !amount_pesos || !duration_mins) {
    return res.status(400).json({ error: 'name, amount_pesos, duration_mins required' });
  }
  try {
    const db = getDb();
    const id = 'tier_' + uuidv4().replace(/-/g, '').slice(0, 8);
    await db.run('INSERT INTO pricing_tiers (id, name, amount_pesos, duration_mins) VALUES (?, ?, ?, ?)',
      [id, name, amount_pesos, duration_mins]);
    res.status(201).json(await db.get('SELECT * FROM pricing_tiers WHERE id = ?', [id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, amount_pesos, duration_mins, is_active } = req.body;
  try {
    const db = getDb();
    await db.run(
      'UPDATE pricing_tiers SET name = COALESCE(?, name), amount_pesos = COALESCE(?, amount_pesos), duration_mins = COALESCE(?, duration_mins), is_active = COALESCE(?, is_active) WHERE id = ?',
      [name || null, amount_pesos ?? null, duration_mins ?? null, is_active ?? null, req.params.id]
    );
    res.json(await db.get('SELECT * FROM pricing_tiers WHERE id = ?', [req.params.id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await getDb().run('DELETE FROM pricing_tiers WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
