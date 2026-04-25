/**
 * Audit log routes — superadmin only.
 * Records sensitive actions: license approvals, transfers, user approvals, suspensions.
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireAuth, requireSuperAdmin } = require('./auth');

// GET /api/audit-log — paginated audit trail (superadmin only)
// Query params: limit (default 50), offset (default 0), action, target_type
router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
  const { limit = 50, offset = 0, action, target_type } = req.query;

  let query = `
    SELECT a.*, u.username AS actor_username
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE 1=1
  `;
  const params = [];

  if (action)      { query += ' AND a.action = ?';      params.push(action); }
  if (target_type) { query += ' AND a.target_type = ?'; params.push(target_type); }

  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  try {
    const rows = await getDb().all(query, params);
    // Parse detail JSON for each row
    const result = rows.map(r => ({
      ...r,
      detail: r.detail ? JSON.parse(r.detail) : null,
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
