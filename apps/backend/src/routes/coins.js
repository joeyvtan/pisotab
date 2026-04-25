/**
 * Coin event routes — called by ESP32 when coins are inserted.
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

router.post('/', async (req, res) => {
  const { device_id, coin_value, pulses, credited_secs } = req.body;
  if (!device_id || !coin_value || !credited_secs) {
    return res.status(400).json({ error: 'device_id, coin_value, credited_secs required' });
  }
  try {
    const db = getDb();
    const coinId = 'coin_' + uuidv4().replace(/-/g, '').slice(0, 12);
    await db.run(
      'INSERT INTO coin_events (id, device_id, coin_value, pulses, credited_secs) VALUES (?, ?, ?, ?, ?)',
      [coinId, device_id, coin_value, pulses || 1, credited_secs]
    );

    const session = await db.get(
      "SELECT * FROM sessions WHERE device_id = ? AND status IN ('active','paused')", [device_id]
    );

    if (session) {
      await db.run(
        'UPDATE sessions SET time_remaining_secs = time_remaining_secs + ?, duration_mins = duration_mins + ?, amount_paid = amount_paid + ? WHERE id = ?',
        [credited_secs, Math.floor(credited_secs / 60), coin_value, session.id]
      );
      const addId = 'add_' + uuidv4().replace(/-/g, '').slice(0, 12);
      await db.run(
        "INSERT INTO session_time_additions (id, session_id, added_by, added_secs, amount_paid) VALUES (?, ?, 'coin', ?, ?)",
        [addId, session.id, credited_secs, coin_value]
      );
      return res.json({ ok: true, action: 'time_added', session_id: session.id, credited_secs });
    }

    const pricing = await db.get(
      'SELECT * FROM pricing_tiers WHERE amount_pesos <= ? AND is_active = 1 ORDER BY amount_pesos DESC LIMIT 1',
      [coin_value]
    );
    const sesId = 'ses_' + uuidv4().replace(/-/g, '').slice(0, 12);
    const now = Math.floor(Date.now() / 1000);
    await db.run(
      "INSERT INTO sessions (id, device_id, pricing_tier_id, started_at, duration_mins, time_remaining_secs, payment_method, amount_paid) VALUES (?, ?, ?, ?, ?, ?, 'coin', ?)",
      [sesId, device_id, pricing?.id || null, now, Math.floor(credited_secs / 60), credited_secs, coin_value]
    );
    await db.run("UPDATE devices SET status = 'in_session' WHERE id = ?", [device_id]);
    res.json({ ok: true, action: 'session_started', session_id: sesId, credited_secs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
