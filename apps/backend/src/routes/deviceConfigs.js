/**
 * Remote device configuration routes (Phase 11).
 * Allows admins to view and push settings to registered tablets remotely.
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('./auth');

function ownerGuard(req, res, device) {
  if (!device) return res.status(404).json({ error: 'Device not found' });
  if (req.user.role === 'admin' && device.owner_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  return null;
}

function formatConfig(cfg) {
  return {
    device_id:          cfg.device_id,
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
    updated_at:         cfg.updated_at,
    applied_at:         cfg.applied_at,
    config_pending:     cfg.applied_at === null || cfg.applied_at < cfg.updated_at,
  };
}

// GET /api/devices/:id/config
router.get('/:id/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const device = await db.get('SELECT id, owner_user_id FROM devices WHERE id = ?', [req.params.id]);
    const err = ownerGuard(req, res, device);
    if (err) return;

    // Ensure a config row exists (idempotent)
    await db.run('INSERT OR IGNORE INTO device_configs (device_id) VALUES (?)', [req.params.id]);
    const cfg = await db.get('SELECT * FROM device_configs WHERE device_id = ?', [req.params.id]);
    res.json(formatConfig(cfg));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/devices/:id/config — update settings and push to device
router.patch('/:id/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const device = await db.get('SELECT id, owner_user_id FROM devices WHERE id = ?', [req.params.id]);
    const err = ownerGuard(req, res, device);
    if (err) return;

    const {
      connection_mode, rate_per_min, secs_per_coin, coin_rates,
      kiosk_mode, floating_timer, deep_freeze, deep_freeze_grace,
      alarm_wifi, alarm_charger, alarm_session_only, alarm_delay_secs,
    } = req.body;

    // Upsert config — applied_at reset to NULL so device knows it's pending
    await db.run(
      `INSERT INTO device_configs (device_id,
        connection_mode, rate_per_min, secs_per_coin, coin_rates,
        kiosk_mode, floating_timer, deep_freeze, deep_freeze_grace,
        alarm_wifi, alarm_charger, alarm_session_only, alarm_delay_secs,
        updated_at, applied_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), NULL)
       ON CONFLICT(device_id) DO UPDATE SET
         connection_mode    = excluded.connection_mode,
         rate_per_min       = excluded.rate_per_min,
         secs_per_coin      = excluded.secs_per_coin,
         coin_rates         = excluded.coin_rates,
         kiosk_mode         = excluded.kiosk_mode,
         floating_timer     = excluded.floating_timer,
         deep_freeze        = excluded.deep_freeze,
         deep_freeze_grace  = excluded.deep_freeze_grace,
         alarm_wifi         = excluded.alarm_wifi,
         alarm_charger      = excluded.alarm_charger,
         alarm_session_only = excluded.alarm_session_only,
         alarm_delay_secs   = excluded.alarm_delay_secs,
         updated_at         = unixepoch(),
         applied_at         = NULL`,
      [
        req.params.id,
        connection_mode ?? 'esp32',
        rate_per_min ?? 1.0,
        secs_per_coin ?? 300,
        coin_rates ?? '[]',
        kiosk_mode ? 1 : 0,
        floating_timer ? 1 : 0,
        deep_freeze ? 1 : 0,
        deep_freeze_grace ?? 30,
        alarm_wifi ? 1 : 0,
        alarm_charger ? 1 : 0,
        alarm_session_only ? 1 : 0,
        alarm_delay_secs ?? 30,
      ]
    );

    const cfg = await db.get('SELECT * FROM device_configs WHERE device_id = ?', [req.params.id]);
    const formatted = formatConfig(cfg);

    // Attempt immediate socket push if device is online
    const io = req.io;
    const deviceRoom = `device:${req.params.id}`;
    const roomSockets = io?.sockets?.adapter?.rooms?.get(deviceRoom);
    const deviceOnline = roomSockets && roomSockets.size > 0;
    if (deviceOnline) {
      io.to(deviceRoom).emit('cmd:apply_config', formatted);
    }

    res.json({ ...formatted, pushed: deviceOnline ?? false });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/devices/:id/remote-cmd — send a fire-and-forget command
router.post('/:id/remote-cmd', requireAuth, requireAdmin, async (req, res) => {
  const { cmd } = req.body;
  const allowed = ['restart_app', 'restart_device', 'lock_screen'];
  if (!allowed.includes(cmd)) {
    return res.status(400).json({ error: `Unknown command. Allowed: ${allowed.join(', ')}` });
  }

  try {
    const db = getDb();
    const device = await db.get('SELECT id, owner_user_id FROM devices WHERE id = ?', [req.params.id]);
    const err = ownerGuard(req, res, device);
    if (err) return;

    const io = req.io;
    const deviceRoom = `device:${req.params.id}`;
    const roomSockets = io?.sockets?.adapter?.rooms?.get(deviceRoom);
    const sent = roomSockets && roomSockets.size > 0;

    if (sent) {
      io.to(deviceRoom).emit(`cmd:${cmd}`, {});
    }

    res.json({ sent: sent ?? false, cmd });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
