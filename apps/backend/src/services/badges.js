/**
 * Badge counts helper.
 * Queries pending users + pending purchase requests and emits
 * badges:update to all dashboard sockets so the sidebar stays current.
 */
const { getDb } = require('../db');
const EVENTS = require('./socketEvents');

async function getBadgeCounts() {
  const db = getDb();
  const [u, r] = await Promise.all([
    db.get("SELECT COUNT(*) AS n FROM users WHERE status = 'pending'", []),
    db.get("SELECT COUNT(*) AS n FROM license_purchase_requests WHERE status = 'pending'", []),
  ]);
  return { pending_users: u?.n ?? 0, pending_requests: r?.n ?? 0 };
}

async function emitBadges(io) {
  try {
    const counts = await getBadgeCounts();
    io?.to('dashboard').emit(EVENTS.BADGES_UPDATE, counts);
  } catch (err) {
    console.error('[badges] emitBadges error:', err.message);
  }
}

module.exports = { getBadgeCounts, emitBadges };
