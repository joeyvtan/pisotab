const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin, requireSuperAdmin } = require('./auth');

const TRIAL_DAYS = 7;

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return 'PTAB-' + groups.join('-');
}

// GET /api/licenses/check/:device_id — no auth (called by tablet on startup)
router.get('/check/:device_id', async (req, res) => {
  try {
    const db = getDb();
    const device = await db.get('SELECT * FROM devices WHERE id = ?', [req.params.device_id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const now = Math.floor(Date.now() / 1000);

    // Check for active paid license first
    const license = await db.get(
      'SELECT * FROM licenses WHERE device_id = ? AND (expires_at IS NULL OR expires_at > ?)',
      [req.params.device_id, now]
    );

    if (license) {
      const daysLeft = license.expires_at ? Math.ceil((license.expires_at - now) / 86400) : null;
      return res.json({ status: 'active', plan: 'paid', days_left: daysLeft, key: license.key });
    }

    // trial_days_override=0 means admin force-expired the device — check before setting trial clock.
    const trialDays = device.trial_days_override != null ? device.trial_days_override : TRIAL_DAYS;
    if (trialDays === 0) {
      return res.json({ status: 'trial_expired', plan: 'trial', days_left: 0 });
    }

    // Trial clock starts on first call to this endpoint — not from device.created_at.
    // This prevents existing devices (registered before licensing was added) from
    // immediately showing "Trial Expired" on their first check.
    let trialStart = device.trial_started_at;
    if (!trialStart) {
      trialStart = now;
      await db.run('UPDATE devices SET trial_started_at = ? WHERE id = ?', [trialStart, device.id]);
    }

    const trialEnd = trialStart + trialDays * 86400;
    if (now < trialEnd) {
      return res.json({ status: 'trial', plan: 'trial', days_left: Math.ceil((trialEnd - now) / 86400) });
    }

    return res.json({ status: 'trial_expired', plan: 'trial', days_left: 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/licenses/activate — no auth (called by tablet when admin enters a key)
router.post('/activate', async (req, res) => {
  const { device_id, license_key } = req.body;
  if (!device_id || !license_key) return res.status(400).json({ error: 'device_id and license_key required' });

  try {
    const db = getDb();
    const device = await db.get('SELECT * FROM devices WHERE id = ?', [device_id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const license = await db.get('SELECT * FROM licenses WHERE key = ?', [license_key.trim().toUpperCase()]);
    if (!license) return res.status(404).json({ error: 'Invalid license key' });
    if (license.device_id && license.device_id !== device_id) {
      return res.status(409).json({ error: 'License key already activated on another device' });
    }

    // Ownership check: if the key is assigned to a specific admin, the device must belong to that same admin
    if (license.owner_user_id && device.owner_user_id && license.owner_user_id !== device.owner_user_id) {
      return res.status(403).json({ error: 'This license key belongs to a different admin account' });
    }

    await db.run('UPDATE licenses SET device_id = ? WHERE key = ?', [device_id, license.key]);

    const now = Math.floor(Date.now() / 1000);
    const daysLeft = license.expires_at ? Math.ceil((license.expires_at - now) / 86400) : null;
    res.json({ ok: true, status: 'active', plan: 'paid', days_left: daysLeft });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/licenses/available — admin sees their unbound (not yet activated) license keys
router.get('/available', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await getDb().all(
      `SELECT id, key, plan, expires_at, created_at
       FROM licenses
       WHERE owner_user_id = ? AND device_id IS NULL
         AND (expires_at IS NULL OR expires_at > unixepoch())
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/licenses — admin sees own licenses; superadmin sees all
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const isSuperAdmin = req.user.role === 'superadmin';

    const query = `
      SELECT l.*, d.name AS device_name, u.username AS owner_username
      FROM licenses l
      LEFT JOIN devices d ON d.id = l.device_id
      LEFT JOIN users u ON u.id = l.owner_user_id
      ${isSuperAdmin ? '' : 'WHERE l.owner_user_id = ?'}
      ORDER BY l.created_at DESC
    `;
    const rows = await db.all(query, isSuperAdmin ? [] : [req.user.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/licenses/trial/:device_id — admin only — manage trial for a device with no paid license
router.patch('/trial/:device_id', requireAuth, requireAdmin, async (req, res) => {
  const { reset, trial_days } = req.body;
  try {
    const db = getDb();
    if (!await db.get('SELECT id FROM devices WHERE id = ?', [req.params.device_id])) {
      return res.status(404).json({ error: 'Device not found' });
    }
    if (reset) {
      await db.run('UPDATE devices SET trial_started_at = NULL WHERE id = ?', [req.params.device_id]);
    }
    if (trial_days !== undefined) {
      const val = Number(trial_days);
      // val=0 means "force expired immediately" — store 0 explicitly (not null, which resets to default)
      await db.run('UPDATE devices SET trial_days_override = ? WHERE id = ?', [
        val >= 0 ? val : null,
        req.params.device_id,
      ]);
      // When forcing expired (0 days), also anchor trial_started_at so the check route sees it as expired
      if (val === 0) {
        await db.run('UPDATE devices SET trial_started_at = 1 WHERE id = ?', [req.params.device_id]);
      }
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/licenses/:id/unbind — admin only — detach from device so key can be reused
router.patch('/:id/unbind', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { changes } = await getDb().run('UPDATE licenses SET device_id = NULL WHERE id = ?', [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: 'License not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/licenses/:id/deactivate — admin only — immediately expire the key
router.patch('/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { changes } = await getDb().run(
      'UPDATE licenses SET expires_at = ? WHERE id = ?',
      [Math.floor(Date.now() / 1000) - 1, req.params.id]
    );
    if (changes === 0) return res.status(404).json({ error: 'License not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/licenses/:id — admin only — hard delete
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { changes } = await getDb().run('DELETE FROM licenses WHERE id = ?', [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: 'License not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/licenses/:id/transfer — superadmin transfers license ownership between admin accounts
router.post('/:id/transfer', requireAuth, requireSuperAdmin, async (req, res) => {
  const { to_user_id } = req.body;
  if (!to_user_id) return res.status(400).json({ error: 'to_user_id required' });

  try {
    const db = getDb();
    const license = await db.get('SELECT * FROM licenses WHERE id = ?', [req.params.id]);
    if (!license) return res.status(404).json({ error: 'License not found' });

    const toUser = await db.get('SELECT id, role FROM users WHERE id = ?', [to_user_id]);
    if (!toUser) return res.status(404).json({ error: 'Target user not found' });
    if (toUser.role !== 'admin' && toUser.role !== 'superadmin') {
      return res.status(400).json({ error: 'License can only be transferred to an admin account' });
    }

    const fromUserId = license.owner_user_id;
    await db.run('UPDATE licenses SET owner_user_id = ? WHERE id = ?', [to_user_id, req.params.id]);

    // Record in license_transfers audit table
    const transferId = 'ltr_' + uuidv4().replace(/-/g, '').slice(0, 8);
    await db.run(
      `INSERT INTO license_transfers (id, license_id, from_user_id, to_user_id, transferred_by)
       VALUES (?, ?, ?, ?, ?)`,
      [transferId, req.params.id, fromUserId || null, to_user_id, req.user.id]
    );

    res.json({ ok: true, license_id: req.params.id, from_user_id: fromUserId, to_user_id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/licenses/generate — superadmin only
router.post('/generate', requireAuth, requireSuperAdmin, async (req, res) => {
  const { expires_days } = req.body;  // null/undefined = lifetime
  try {
    const db = getDb();
    const key = generateKey();
    const id = 'lic_' + crypto.randomBytes(4).toString('hex');
    const expiresAt = expires_days ? Math.floor(Date.now() / 1000) + expires_days * 86400 : null;
    await db.run(
      'INSERT INTO licenses (id, key, plan, expires_at, created_at) VALUES (?, ?, ?, ?, unixepoch())',
      [id, key, 'paid', expiresAt]
    );
    res.json({ id, key, expires_at: expiresAt });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
