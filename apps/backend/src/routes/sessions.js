/**
 * Session management routes.
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('./auth');
const { notify } = require('../services/notifier');
const { sendToDevice } = require('../services/fcm');
const { getCurrentMultiplier } = require('../services/peakPricing');

function emitToDevice(req, device_id, event, payload = {}) {
  const room = `device:${device_id}`;
  const sockets = req.io?.sockets?.adapter?.rooms?.get(room);
  console.log(`📤 ${event} → ${room} (${sockets?.size ?? 0} socket(s))`);
  req.io?.to(room).emit(event, payload);
}

// GET /api/sessions
router.get('/', requireAuth, async (req, res) => {
  const { device_id, status, account, limit = 50, offset = 0 } = req.query;
  try {
    const db   = getDb();
    const role = req.user.role;
    let query = `
      SELECT s.*, d.name AS device_name, p.name AS tier_name
      FROM sessions s
      LEFT JOIN devices d ON s.device_id = d.id
      LEFT JOIN pricing_tiers p ON s.pricing_tier_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (role === 'admin' || role === 'staff') { query += ' AND d.owner_user_id = ?'; params.push(req.user.id); }
    else if (role === 'superadmin' && account) { query += ' AND d.owner_user_id = ?'; params.push(account); }
    if (device_id) { query += ' AND s.device_id = ?'; params.push(device_id); }
    if (status)    { query += ' AND s.status = ?';    params.push(status); }
    query += ' ORDER BY s.started_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    res.json(await db.all(query, params));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sessions
router.post('/', requireAuth, async (req, res) => {
  const { device_id, pricing_tier_id, duration_mins, amount_paid, payment_method } = req.body;
  if (!device_id || duration_mins === undefined || duration_mins === null) {
    return res.status(400).json({ error: 'device_id and duration_mins required' });
  }
  try {
    const db = getDb();
    const existing = await db.get(
      "SELECT id FROM sessions WHERE device_id = ? AND status IN ('active','paused')", [device_id]
    );
    if (existing) {
      await db.run("UPDATE sessions SET status='ended', ended_at=unixepoch(), time_remaining_secs=0 WHERE id=?", [existing.id]);
    }

    const id = 'ses_' + uuidv4().replace(/-/g, '').slice(0, 12);
    const now = Math.floor(Date.now() / 1000);
    const multiplier = await getCurrentMultiplier();
    const effectiveDurationMins = Math.round(duration_mins / multiplier);
    const durationSecs = effectiveDurationMins * 60;

    await db.run(
      'INSERT INTO sessions (id, device_id, pricing_tier_id, started_at, duration_mins, time_remaining_secs, payment_method, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, device_id, pricing_tier_id || null, now, effectiveDurationMins, durationSecs, payment_method || 'manual', amount_paid || 0]
    );
    await db.run("UPDATE devices SET status = 'in_session' WHERE id = ?", [device_id]);

    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [id]);
    if (payment_method !== 'usb') {
      emitToDevice(req, device_id, 'cmd:start', {
        session_id: id, duration_mins: effectiveDurationMins,
        duration_secs: durationSecs, amount_paid: amount_paid || 0,
      });
    }
    req.io?.to('dashboard').emit('session:started', { session });

    const device = await db.get('SELECT name, fcm_token FROM devices WHERE id = ?', [device_id]);
    const deviceName = device?.name || device_id;
    notify(`▶️ Session started on ${deviceName}\n${effectiveDurationMins} min | ₱${amount_paid || 0} (manual)${multiplier > 1 ? ` [peak ×${multiplier}]` : ''}`);
    sendToDevice(device?.fcm_token, '▶️ Session Started', `${duration_mins} min | ₱${amount_paid || 0}`);

    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/analytics — MUST be before /:id
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const db    = getDb();
    const role  = req.user.role;
    const since = Math.floor(Date.now() / 1000) - 30 * 24 * 3600;
    const { account } = req.query;

    let ownerJoin   = 'JOIN devices d ON s.device_id = d.id';
    let ownerClause = '';
    const scopeParam = [since];
    if (role === 'admin' || role === 'staff') { ownerClause = 'AND d.owner_user_id = ?'; scopeParam.push(req.user.id); }
    else if (role === 'superadmin' && account) { ownerClause = 'AND d.owner_user_id = ?'; scopeParam.push(account); }

    const hourly = await db.all(`
      SELECT
        CAST(strftime('%H', datetime(s.started_at, 'unixepoch', 'localtime')) AS INTEGER) AS hour,
        COUNT(*) AS sessions,
        ROUND(SUM(s.amount_paid), 2) AS revenue
      FROM sessions s ${ownerJoin}
      WHERE s.status = 'ended' AND s.started_at >= ? ${ownerClause}
      GROUP BY hour ORDER BY hour
    `, scopeParam);

    const byDevice = await db.all(`
      SELECT d.name AS device_name, COUNT(s.id) AS sessions,
        ROUND(SUM(s.amount_paid), 2) AS revenue, ROUND(AVG(s.duration_mins), 1) AS avg_mins
      FROM sessions s ${ownerJoin}
      WHERE s.status = 'ended' AND s.started_at >= ? ${ownerClause}
      GROUP BY s.device_id ORDER BY revenue DESC
    `, scopeParam);

    const byPayment = await db.all(`
      SELECT s.payment_method, COUNT(*) AS sessions, ROUND(SUM(s.amount_paid), 2) AS revenue
      FROM sessions s ${ownerJoin}
      WHERE s.status = 'ended' AND s.started_at >= ? ${ownerClause}
      GROUP BY s.payment_method
    `, scopeParam);

    res.json({ hourly, byDevice, byPayment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/revenue/summary — MUST be before /:id
router.get('/revenue/summary', requireAuth, async (req, res) => {
  try {
    const db   = getDb();
    const role = req.user.role;
    const { account } = req.query;

    let ownerJoin   = '';
    let ownerClause = '';
    const scopeParam = [];
    if (role === 'admin' || role === 'staff') {
      ownerJoin = 'JOIN devices d ON s.device_id = d.id';
      ownerClause = 'AND d.owner_user_id = ?'; scopeParam.push(req.user.id);
    } else if (role === 'superadmin' && account) {
      ownerJoin = 'JOIN devices d ON s.device_id = d.id';
      ownerClause = 'AND d.owner_user_id = ?'; scopeParam.push(account);
    }

    const rows = await db.all(`
      SELECT
        date(s.started_at, 'unixepoch') AS day,
        COUNT(*) AS session_count,
        SUM(s.amount_paid) AS total_revenue,
        SUM(s.duration_mins) AS total_mins
      FROM sessions s ${ownerJoin}
      WHERE s.status = 'ended' ${ownerClause}
      GROUP BY day ORDER BY day DESC LIMIT 30
    `, scopeParam);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/export — download all ended sessions as CSV
router.get('/export', requireAuth, async (req, res) => {
  try {
    const db   = getDb();
    const role = req.user.role;
    const { account } = req.query;

    let query = `
      SELECT s.id, d.name AS device, p.name AS pricing_tier,
             datetime(s.started_at, 'unixepoch') AS started_at,
             datetime(s.ended_at,   'unixepoch') AS ended_at,
             s.duration_mins, s.amount_paid, s.payment_method, s.status
      FROM sessions s
      LEFT JOIN devices d      ON s.device_id      = d.id
      LEFT JOIN pricing_tiers p ON s.pricing_tier_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (role === 'admin' || role === 'staff')     { query += ' AND d.owner_user_id = ?'; params.push(req.user.id); }
    else if (role === 'superadmin' && account)   { query += ' AND d.owner_user_id = ?'; params.push(account); }
    query += ' ORDER BY s.started_at DESC';

    const rows = await db.all(query, params);

    const headers = ['id', 'device', 'pricing_tier', 'started_at', 'ended_at', 'duration_mins', 'amount_paid', 'payment_method', 'status'];
    const escape  = v => (v == null ? '' : String(v).includes(',') ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv     = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sessions-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  try {
    const session = await getDb().get('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sessions/:id/pause
router.post('/:id/pause', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Session is not active' });
    await db.run("UPDATE sessions SET status = 'paused', paused_at = unixepoch() WHERE id = ?", [req.params.id]);
    emitToDevice(req, session.device_id, 'cmd:pause', { session_id: req.params.id });
    res.json({ ok: true, status: 'paused' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sessions/:id/resume
router.post('/:id/resume', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'paused') return res.status(400).json({ error: 'Session is not paused' });
    const now = Math.floor(Date.now() / 1000);
    const pausedSecs = session.paused_at ? now - session.paused_at : 0;
    await db.run(
      "UPDATE sessions SET status = 'active', paused_at = NULL, total_paused_ms = total_paused_ms + ? WHERE id = ?",
      [pausedSecs, req.params.id]
    );
    emitToDevice(req, session.device_id, 'cmd:resume', { session_id: req.params.id });
    res.json({ ok: true, status: 'active' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sessions/:id/end
router.post('/:id/end', async (req, res) => {
  try {
    const db = getDb();
    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'ended') return res.status(400).json({ error: 'Session already ended' });

    await db.run("UPDATE sessions SET status = 'ended', ended_at = unixepoch(), time_remaining_secs = 0 WHERE id = ?", [req.params.id]);
    await db.run("UPDATE devices SET status = 'online' WHERE id = ?", [session.device_id]);

    emitToDevice(req, session.device_id, 'cmd:end', { session_id: req.params.id });
    req.io?.to('dashboard').emit('session:ended', { session_id: req.params.id, device_id: session.device_id });

    const device = await db.get('SELECT name, fcm_token FROM devices WHERE id = ?', [session.device_id]);
    const deviceName = device?.name || session.device_id;
    notify(`⏹ Session ended on ${deviceName}\n${session.duration_mins || 0} min | ₱${session.amount_paid || 0}`);
    sendToDevice(device?.fcm_token, '⏹ Session Ended', `${session.duration_mins || 0} min | ₱${session.amount_paid || 0}`);

    res.json({ ok: true, status: 'ended' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/sessions/:id/add-time
router.post('/:id/add-time', requireAuth, async (req, res) => {
  const { added_mins, amount_paid } = req.body;
  if (!added_mins || added_mins <= 0) return res.status(400).json({ error: 'added_mins must be > 0' });
  try {
    const db = getDb();
    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const addedSecs = added_mins * 60;
    await db.run(
      'UPDATE sessions SET time_remaining_secs = time_remaining_secs + ?, duration_mins = duration_mins + ?, amount_paid = amount_paid + ? WHERE id = ?',
      [addedSecs, added_mins, amount_paid || 0, req.params.id]
    );
    const addId = 'add_' + uuidv4().replace(/-/g, '').slice(0, 12);
    await db.run(
      'INSERT INTO session_time_additions (id, session_id, added_by, added_secs, amount_paid) VALUES (?, ?, ?, ?, ?)',
      [addId, req.params.id, req.user.id, addedSecs, amount_paid || 0]
    );
    emitToDevice(req, session.device_id, 'cmd:add_time', { session_id: req.params.id, added_mins, added_secs: addedSecs });
    res.json({ ok: true, new_time_remaining_secs: session.time_remaining_secs + addedSecs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/sessions/:id/sync
router.patch('/:id/sync', async (req, res) => {
  const { time_remaining_secs } = req.body;
  if (time_remaining_secs === undefined) return res.status(400).json({ error: 'time_remaining_secs required' });
  try {
    await getDb().run('UPDATE sessions SET time_remaining_secs = ? WHERE id = ?', [time_remaining_secs, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
