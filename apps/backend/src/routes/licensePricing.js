/**
 * License pricing routes.
 * Superadmin sets custom pricing per user or platform-wide defaults.
 * user_id = NULL means it is the platform default (shown to all admins).
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireSuperAdmin } = require('./auth');

// GET /api/license-pricing — returns all pricing rules
// If called by an admin, also returns the effective price for their account
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT lp.*, u.username AS user_username
       FROM license_pricing lp
       LEFT JOIN users u ON u.id = lp.user_id
       ORDER BY lp.user_id IS NULL DESC, lp.created_at ASC`,
      []
    );

    // Resolve the effective price for the calling user:
    // user-specific rule takes priority over the platform default
    const userRule    = rows.find(r => r.user_id === req.user.id);
    const defaultRule = rows.find(r => r.user_id === null);
    const effective   = userRule || defaultRule || null;

    res.json({ pricing: rows, effective });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message || 'Server error' }); }
});

// POST /api/license-pricing — superadmin creates a pricing rule
// body: { user_id, plan, price_pesos, duration_days }
// user_id omitted / null = platform default
router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
  const { user_id, plan, price_pesos, duration_days } = req.body;
  if (price_pesos === undefined || price_pesos === null) {
    return res.status(400).json({ error: 'price_pesos required' });
  }

  try {
    const db = getDb();

    // If user_id provided, verify they exist and are an admin
    if (user_id) {
      const target = await db.get('SELECT id, role FROM users WHERE id = ?', [user_id]);
      if (!target) return res.status(404).json({ error: 'User not found' });
      if (target.role !== 'admin') return res.status(400).json({ error: 'Pricing can only be set for admin accounts' });
    }

    // Replace existing rule for same user+plan combination
    // Use separate queries for NULL vs non-NULL user_id to avoid ? IS NULL PostgreSQL issues
    const planVal = plan || 'paid';
    const userIdVal = user_id || null;
    const existing = userIdVal
      ? await db.get('SELECT id FROM license_pricing WHERE plan = ? AND user_id = ?', [planVal, userIdVal])
      : await db.get('SELECT id FROM license_pricing WHERE plan = ? AND user_id IS NULL', [planVal]);

    const id = existing?.id || ('lpr_' + uuidv4().replace(/-/g, '').slice(0, 8));

    if (existing) {
      await db.run(
        'UPDATE license_pricing SET price_pesos = ?, duration_days = ? WHERE id = ?',
        [price_pesos, duration_days || null, id]
      );
    } else {
      await db.run(
        `INSERT INTO license_pricing (id, user_id, plan, price_pesos, duration_days)
         VALUES (?, ?, ?, ?, ?)`,
        [id, user_id || null, plan || 'paid', price_pesos, duration_days || null]
      );
    }

    res.status(201).json(await db.get('SELECT * FROM license_pricing WHERE id = ?', [id]));
  } catch (err) { console.error(err); res.status(500).json({ error: err.message || 'Server error' }); }
});

// DELETE /api/license-pricing/:id — superadmin removes a pricing rule
router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { changes } = await getDb().run('DELETE FROM license_pricing WHERE id = ?', [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: 'Pricing rule not found' });
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
