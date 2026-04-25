const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('./auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const role = req.user.role;
    const { account } = req.query;
    let rows;
    if (role === 'admin') {
      rows = await db.all('SELECT * FROM locations WHERE owner_user_id = ? OR owner_user_id IS NULL ORDER BY name', [req.user.id]);
    } else if (role === 'superadmin' && account) {
      rows = await db.all('SELECT * FROM locations WHERE owner_user_id = ? OR owner_user_id IS NULL ORDER BY name', [account]);
    } else {
      rows = await db.all('SELECT * FROM locations ORDER BY name');
    }
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const db = getDb();
    const id = 'loc_' + uuidv4().replace(/-/g, '').slice(0, 8);
    await db.run('INSERT INTO locations (id, name, address, owner_user_id) VALUES (?, ?, ?, ?)', [id, name, address || null, req.user.id]);
    res.status(201).json(await db.get('SELECT * FROM locations WHERE id = ?', [id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const loc = await db.get('SELECT id, owner_user_id FROM locations WHERE id = ?', [req.params.id]);
    if (!loc) return res.status(404).json({ error: 'Location not found' });
    if (req.user.role === 'admin' && loc.owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await db.run('DELETE FROM locations WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
