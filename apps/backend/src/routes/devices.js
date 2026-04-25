/**
 * Device management routes.
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('./auth');
const EVENTS = require('../services/socketEvents');

const TRIAL_DAYS_DEFAULT = 7;

function computeLicenseStatus(device, now) {
  if (device.lic_expires_at !== undefined && device.lic_key !== null) {
    const daysLeft = device.lic_expires_at ? Math.ceil((device.lic_expires_at - now) / 86400) : null;
    return { license_status: 'active', license_days_left: daysLeft };
  }
  const trialDays = device.trial_days_override != null ? device.trial_days_override : TRIAL_DAYS_DEFAULT;
  if (trialDays === 0) return { license_status: 'trial_expired', license_days_left: 0 };
  const trialStart = device.trial_started_at;
  if (!trialStart) return { license_status: 'trial', license_days_left: trialDays };
  const trialEnd = trialStart + trialDays * 86400;
  if (now < trialEnd) return { license_status: 'trial', license_days_left: Math.ceil((trialEnd - now) / 86400) };
  return { license_status: 'trial_expired', license_days_left: 0 };
}

function formatConfig(cfg) {
  return {
    connection_mode:    cfg.connection_mode,
    rate_per_min:       cfg.rate_per_min,
    secs_per_coin:      cfg.secs_per_coin,
    coin_rates:         cfg.coin_rates,
    kiosk_mode:         cfg.kiosk_mode === 1 || cfg.kiosk_mode === true,
    floating_timer:     cfg.floating_timer === 1 || cfg.floating_timer === true,
    deep_freeze:        cfg.deep_freeze === 1 || cfg.deep_freeze === true,
    deep_freeze_grace:  cfg.deep_freeze_grace,
    alarm_wifi:         cfg.alarm_wifi === 1 || cfg.alarm_wifi === true,
    alarm_charger:      cfg.alarm_charger === 1 || cfg.alarm_charger === true,
    alarm_session_only: cfg.alarm_session_only === 1 || cfg.alarm_session_only === true,
    alarm_delay_secs:   cfg.alarm_delay_secs,
  };
}

// GET /api/devices
router.get('/', requireAuth, async (req, res) => {
  try {
    const db   = getDb();
    const now  = Math.floor(Date.now() / 1000);
    const role = req.user.role;
    const { account } = req.query;

    let ownerClause = '';
    const extraParams = [now];
    if (role === 'admin') {
      ownerClause = 'AND d.owner_user_id = ?';
      extraParams.push(req.user.id);
    } else if (role === 'superadmin' && account) {
      ownerClause = 'AND d.owner_user_id = ?';
      extraParams.push(account);
    }

    const rows = await db.all(`
      SELECT d.*, l.name AS location_name,
        (SELECT status FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS session_status,
        (SELECT id FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS active_session_id,
        (SELECT time_remaining_secs FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS time_remaining_secs,
        (SELECT payment_method FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS session_payment_method,
        lic.key         AS lic_key,
        lic.expires_at  AS lic_expires_at,
        lic.id          AS lic_id
      FROM devices d
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN licenses lic ON lic.device_id = d.id AND (lic.expires_at IS NULL OR lic.expires_at > ?)
      WHERE 1=1 ${ownerClause}
      ORDER BY d.created_at DESC
    `, extraParams);

    const devices = rows.map(d => {
      const { lic_key, lic_expires_at, lic_id, ...rest } = d;
      const { license_status, license_days_left } = computeLicenseStatus({ ...d, lic_key, lic_expires_at }, now);
      return { ...rest, license_status, license_days_left };
    });
    res.json(devices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/devices
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, location_id, android_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const db = getDb();
    const id = 'dev_' + uuidv4().replace(/-/g, '').slice(0, 12);
    await db.run(
      'INSERT INTO devices (id, name, location_id, android_id, owner_user_id) VALUES (?, ?, ?, ?, ?)',
      [id, name, location_id || 'loc_main', android_id || null, req.user.id]
    );
    try { await db.run('INSERT INTO device_configs (device_id) VALUES (?)', [id]); } catch (_) {}
    const device = await db.get('SELECT * FROM devices WHERE id = ?', [id]);
    res.status(201).json(device);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/devices/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const device = await db.get('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (req.user.role === 'admin' && device.owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(device);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/devices/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const { name, location_id, status } = req.body;
  try {
    const db = getDb();
    const device = await db.get('SELECT * FROM devices WHERE id = ?', [req.params.id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (req.user.role === 'admin' && device.owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await db.run(
      'UPDATE devices SET name = COALESCE(?, name), location_id = COALESCE(?, location_id), status = COALESCE(?, status) WHERE id = ?',
      [name || null, location_id || null, status || null, req.params.id]
    );
    res.json(await db.get('SELECT * FROM devices WHERE id = ?', [req.params.id]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/devices/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const device = await db.get('SELECT id, owner_user_id FROM devices WHERE id = ?', [req.params.id]);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (req.user.role === 'admin' && device.owner_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await db.run('DELETE FROM devices WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/devices/:id/fcm-token
router.patch('/:id/fcm-token', async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token) return res.status(400).json({ error: 'fcm_token required' });
  try {
    await getDb().run('UPDATE devices SET fcm_token = ? WHERE id = ?', [fcm_token, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/devices/:id/heartbeat
router.post('/:id/heartbeat', async (req, res) => {
  const { ip_address, android_id, session_id, time_remaining_secs } = req.body;
  try {
    const db = getDb();
    const hasSession = session_id && time_remaining_secs !== undefined;
    const prev = await db.get('SELECT status FROM devices WHERE id = ?', [req.params.id]);

    await db.run(`
      UPDATE devices SET
        last_seen  = unixepoch(),
        ip_address = COALESCE(?, ip_address),
        android_id = COALESCE(android_id, ?),
        status     = CASE WHEN ? THEN 'in_session'
                          WHEN status = 'in_session' THEN 'in_session'
                          ELSE 'online' END
      WHERE id = ?
    `, [ip_address || null, android_id || null, hasSession ? 1 : 0, req.params.id]);

    if (android_id) {
      await db.run(`
        UPDATE devices SET trial_started_at = (
          SELECT d2.trial_started_at FROM devices d2
          WHERE d2.android_id = ? AND d2.id != ? AND d2.trial_started_at IS NOT NULL
          LIMIT 1
        ) WHERE id = ? AND trial_started_at IS NULL
      `, [android_id, req.params.id, req.params.id]);
    }

    const newStatus = hasSession ? 'in_session' : (prev?.status === 'in_session' ? 'in_session' : 'online');
    if (prev && prev.status !== newStatus) {
      req.io?.to('dashboard').emit(EVENTS.DEVICE_STATUS, { device_id: req.params.id, status: newStatus });
    }

    if (hasSession) {
      const updated = await db.run(
        'UPDATE sessions SET time_remaining_secs = ? WHERE id = ? AND status IN (\'active\', \'paused\')',
        [time_remaining_secs, session_id]
      );
      if (updated.changes > 0) {
        const sess = await db.get('SELECT payment_method FROM sessions WHERE id = ?', [session_id]);
        if (sess?.payment_method === 'usb') {
          req.io?.to('dashboard').emit(EVENTS.SESSION_UPDATED, {
            session_id, device_id: req.params.id, time_remaining_secs, status: 'active',
          });
        }
      }
    }

    const pendingCfg = await db.get(`
      SELECT * FROM device_configs
      WHERE device_id = ? AND (applied_at IS NULL OR applied_at < updated_at)
    `, [req.params.id]);

    if (pendingCfg) {
      req.io?.to(`device:${req.params.id}`).emit('cmd:apply_config', formatConfig(pendingCfg));
    }

    res.json({ ok: true, pending_config: pendingCfg ? formatConfig(pendingCfg) : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
