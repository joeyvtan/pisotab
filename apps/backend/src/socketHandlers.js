/**
 * Socket.IO server-side event handlers.
 * The dashboard connects here for real-time control.
 */
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const EVENTS = require('./services/socketEvents');
const { publishCommand } = require('./services/mqttBridge');
const { getBadgeCounts } = require('./services/badges');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    console.log('🔌 Socket connect attempt — auth:', JSON.stringify(socket.handshake.auth));
    const token    = socket.handshake.auth?.token || socket.handshake.query?.token;
    const deviceId = socket.handshake.auth?.device_id;

    // Android tablets authenticate with device_id only (no JWT)
    if (!token && deviceId) {
      socket.isDevice = true;
      socket.deviceId = deviceId;
      return next();
    }

    if (!token) return next(new Error('No auth token'));

    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    if (socket.isDevice) {
      console.log(`📱 Device connected: ${socket.deviceId}`);
      socket.join(`device:${socket.deviceId}`);
    } else {
      console.log(`🖥  Dashboard connected: user ${socket.user?.id}`);
      socket.join('dashboard');
      // Send current device state + badge counts on connect
      await sendCurrentState(socket);
      const badges = await getBadgeCounts();
      socket.emit('badges:update', badges);
    }

    // Dashboard commands
    socket.on(EVENTS.CMD_START, ({ device_id, duration_mins, amount_paid }) => {
      publishCommand(device_id, 'start_session', { duration_mins, amount_paid });
      io.to(`device:${device_id}`).emit(EVENTS.CMD_START, { duration_mins, amount_paid });
    });

    socket.on(EVENTS.CMD_PAUSE, async ({ session_id }) => {
      try {
        const s = await getDb().get('SELECT device_id FROM sessions WHERE id = ?', [session_id]);
        if (s) io.to(`device:${s.device_id}`).emit(EVENTS.CMD_PAUSE, { session_id });
      } catch (err) { console.error('[socket] CMD_PAUSE error:', err.message); }
    });

    socket.on(EVENTS.CMD_RESUME, async ({ session_id }) => {
      try {
        const s = await getDb().get('SELECT device_id FROM sessions WHERE id = ?', [session_id]);
        if (s) io.to(`device:${s.device_id}`).emit(EVENTS.CMD_RESUME, { session_id });
      } catch (err) { console.error('[socket] CMD_RESUME error:', err.message); }
    });

    socket.on(EVENTS.CMD_END, async ({ session_id }) => {
      try {
        const s = await getDb().get('SELECT device_id FROM sessions WHERE id = ?', [session_id]);
        if (s) {
          io.to(`device:${s.device_id}`).emit(EVENTS.CMD_END, { session_id });
          publishCommand(s.device_id, 'end_session', { session_id });
        }
      } catch (err) { console.error('[socket] CMD_END error:', err.message); }
    });

    socket.on(EVENTS.CMD_ADD_TIME, async ({ session_id, added_mins }) => {
      try {
        const s = await getDb().get('SELECT device_id FROM sessions WHERE id = ?', [session_id]);
        if (s) io.to(`device:${s.device_id}`).emit(EVENTS.CMD_ADD_TIME, { session_id, added_mins });
      } catch (err) { console.error('[socket] CMD_ADD_TIME error:', err.message); }
    });

    socket.on(EVENTS.CMD_LOCK, ({ device_id }) => {
      io.to(`device:${device_id}`).emit(EVENTS.CMD_LOCK, {});
      publishCommand(device_id, 'lock');
    });

    socket.on(EVENTS.CMD_UNLOCK, ({ device_id }) => {
      io.to(`device:${device_id}`).emit(EVENTS.CMD_UNLOCK, {});
      publishCommand(device_id, 'unlock');
    });

    // Remote config acknowledged by device — mark as applied
    socket.on('ack:config_applied', async ({ device_id }) => {
      if (!device_id) return;
      try {
        await getDb().run('UPDATE device_configs SET applied_at = unixepoch() WHERE device_id = ?', [device_id]);
      } catch (err) { console.error('[socket] ack:config_applied error:', err.message); }
    });

    socket.on('disconnect', async () => {
      if (socket.isDevice && socket.deviceId) {
        try {
          await getDb().run("UPDATE devices SET status = 'offline' WHERE id = ?", [socket.deviceId]);
          io.to('dashboard').emit(EVENTS.DEVICE_STATUS, { device_id: socket.deviceId, status: 'offline' });
        } catch (err) { console.error('[socket] disconnect error:', err.message); }
      }
    });
  });
}

const TRIAL_DAYS = 7;

function computeLicenseStatus(device, now) {
  if (device.lic_expires_at !== undefined && device.lic_key !== null) {
    const daysLeft = device.lic_expires_at ? Math.ceil((device.lic_expires_at - now) / 86400) : null;
    return { license_status: 'active', license_days_left: daysLeft };
  }
  const trialDays = device.trial_days_override != null ? device.trial_days_override : TRIAL_DAYS;
  if (trialDays === 0) return { license_status: 'trial_expired', license_days_left: 0 };
  const trialStart = device.trial_started_at;
  if (!trialStart) return { license_status: 'trial', license_days_left: trialDays };
  const trialEnd = trialStart + trialDays * 86400;
  if (now < trialEnd) return { license_status: 'trial', license_days_left: Math.ceil((trialEnd - now) / 86400) };
  return { license_status: 'trial_expired', license_days_left: 0 };
}

async function sendCurrentState(socket) {
  try {
    const db   = getDb();
    const now  = Math.floor(Date.now() / 1000);
    const role = socket.user?.role;
    const uid  = socket.user?.id;

    // Mirror the same owner scoping used by GET /api/devices
    let ownerClause = '';
    const params = [now];
    if (role === 'admin' || role === 'staff') {
      ownerClause = 'AND d.owner_user_id = ?';
      params.push(uid);
    }

    const rows = await db.all(
      `SELECT d.*, l.name AS location_name,
        (SELECT id FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS active_session_id,
        (SELECT time_remaining_secs FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS time_remaining_secs,
        (SELECT status FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS session_status,
        (SELECT payment_method FROM sessions WHERE device_id = d.id AND status IN ('active','paused') LIMIT 1) AS session_payment_method,
        lic.key        AS lic_key,
        lic.expires_at AS lic_expires_at
       FROM devices d
       LEFT JOIN locations l ON d.location_id = l.id
       LEFT JOIN licenses lic ON lic.device_id = d.id AND (lic.expires_at IS NULL OR lic.expires_at > ?)
       WHERE 1=1 ${ownerClause}`,
      params
    );

    const devices = rows.map(d => {
      const { lic_key, lic_expires_at, ...rest } = d;
      const { license_status, license_days_left } = computeLicenseStatus({ ...d, lic_key, lic_expires_at }, now);
      return { ...rest, license_status, license_days_left };
    });
    socket.emit('state:devices', devices);
  } catch (err) {
    console.error('[socket] sendCurrentState error:', err.message);
  }
}

module.exports = { registerSocketHandlers };
