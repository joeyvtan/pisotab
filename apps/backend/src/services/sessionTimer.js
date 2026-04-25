/**
 * Server-side session tick engine.
 * Every second, decrement time_remaining_secs for all active sessions.
 * Emits real-time updates via Socket.IO and ends sessions when time runs out.
 */
const { getDb } = require('../db');
const { notify } = require('./notifier');
const EVENTS = require('./socketEvents');

let io = null;

function startSessionTimer(_io) {
  io = _io;
  setInterval(tick, 1000);
  console.log('⏱  Session timer started');
}

async function tick() {
  try {
    const db = getDb();
    // Exclude USB sessions: they count UP on the device, have no countdown to manage,
    // and would be immediately ended by this timer since they start with time_remaining_secs=0.
    const activeSessions = await db.all(
      `SELECT s.*, d.name AS device_name
       FROM sessions s
       JOIN devices d ON s.device_id = d.id
       WHERE s.status = 'active' AND s.payment_method != 'usb'`,
      []
    );

    for (const session of activeSessions) {
      const newTime = session.time_remaining_secs - 1;

      if (newTime <= 0) {
        // Session expired
        await db.run(
          "UPDATE sessions SET status = 'ended', ended_at = unixepoch(), time_remaining_secs = 0 WHERE id = ?",
          [session.id]
        );
        await db.run("UPDATE devices SET status = 'online' WHERE id = ?", [session.device_id]);

        io?.emit(EVENTS.SESSION_ENDED, { session_id: session.id, device_id: session.device_id });
        notify(`⏰ Session ended on ${session.device_name}. Time expired.`);
      } else {
        await db.run('UPDATE sessions SET time_remaining_secs = ? WHERE id = ?', [newTime, session.id]);

        io?.emit(EVENTS.SESSION_UPDATED, {
          session_id: session.id,
          device_id: session.device_id,
          time_remaining_secs: newTime,
          status: 'active',
        });

        // Warn at 60 secs remaining
        if (newTime === 60) {
          notify(`⚠️ 1 minute remaining on ${session.device_name}`);
        }
      }
    }
  } catch (err) {
    console.error('[sessionTimer] tick error:', err.message);
  }
}

module.exports = { startSessionTimer };
