/**
 * MQTT bridge — connects to local broker (Mosquitto / EMQX).
 * ESP32 devices publish coin events here.
 * Topics:
 *   pisotab/coins/{device_id}     ← ESP32 publishes coin inserts
 *   pisotab/devices/{device_id}/cmd → Server publishes commands to device
 *   pisotab/devices/{device_id}/status ← ESP32/Android publishes heartbeats
 */
const mqtt = require('mqtt');
const { getDb } = require('../db');
const { notify } = require('./notifier');
const EVENTS = require('./socketEvents');
const { v4: uuidv4 } = require('uuid');
const { getCurrentMultiplier } = require('./peakPricing');

let mqttClient = null;
let io = null;

function startMqttBridge(_io) {
  io = _io;
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.warn('⚠️  MQTT_BROKER_URL not set — MQTT bridge disabled');
    return;
  }

  mqttClient = mqtt.connect(brokerUrl, {
    clientId: 'pisotab-server',
    reconnectPeriod: 5000,
  });

  mqttClient.on('connect', () => {
    console.log('✅ MQTT connected to', brokerUrl);
    mqttClient.subscribe('pisotab/coins/#');
    mqttClient.subscribe('pisotab/devices/#/status');
  });

  mqttClient.on('message', (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());
      handleMqttMessage(topic, data).catch(err => console.error('[MQTT] handleMqttMessage error:', err.message));
    } catch (e) {
      console.error('MQTT parse error:', e.message);
    }
  });

  mqttClient.on('error', (e) => console.error('MQTT error:', e.message));
}

async function handleMqttMessage(topic, data) {
  const db = getDb();

  // Coin insert: pisotab/coins/{device_id}
  const coinMatch = topic.match(/^pisotab\/coins\/(.+)$/);
  if (coinMatch) {
    const device_id = coinMatch[1];
    const { coin_value, pulses, credited_secs: rawCreditedSecs } = data;
    // Apply peak pricing multiplier — reduces effective seconds credited per coin
    const multiplier = await getCurrentMultiplier();
    const credited_secs = Math.round(rawCreditedSecs / multiplier);

    // Auto-register device if it doesn't exist yet
    const exists = await db.get('SELECT id FROM devices WHERE id = ?', [device_id]);
    if (!exists) {
      await db.run("INSERT INTO devices (id, name, status) VALUES (?, ?, 'online')", [device_id, 'ESP32-' + device_id]);
      console.log('[MQTT] Auto-registered device:', device_id);
    }

    // Log coin event
    const coinId = 'coin_' + uuidv4().replace(/-/g, '').slice(0, 12);
    // Log effective credited_secs (after peak multiplier) for consistent audit
    await db.run(
      'INSERT INTO coin_events (id, device_id, coin_value, pulses, credited_secs) VALUES (?, ?, ?, ?, ?)',
      [coinId, device_id, coin_value, pulses || 1, credited_secs]
    );

    // Add time to active session, or auto-start one if none exists
    const session = await db.get("SELECT * FROM sessions WHERE device_id = ? AND status IN ('active','paused')", [device_id]);
    const device = await db.get('SELECT name FROM devices WHERE id = ?', [device_id]);
    const deviceName = device?.name || device_id;

    if (session) {
      await db.run(
        'UPDATE sessions SET time_remaining_secs = time_remaining_secs + ?, amount_paid = amount_paid + ? WHERE id = ?',
        [credited_secs, coin_value, session.id]
      );
      const newSecs = session.time_remaining_secs + credited_secs;
      io?.emit(EVENTS.SESSION_UPDATED, { device_id, session_id: session.id, time_remaining_secs: newSecs, status: session.status });

      const addMins = Math.round(credited_secs / 60);
      io?.to(`device:${device_id}`).emit('cmd:add_time', { added_mins: addMins, amount_paid: coin_value });
      console.log(`[MQTT] Sent cmd:add_time (${addMins} min) → device:${device_id}`);
      notify(`⏱ +${addMins} min added to ${deviceName} (₱${coin_value} coin)`);
    } else {
      // No active session — auto-start one from the coin insert
      const sessionId = 'ses_' + uuidv4().replace(/-/g, '').slice(0, 12);
      const now = Math.floor(Date.now() / 1000);
      const durationMins = Math.round(credited_secs / 60);
      await db.run(
        `INSERT INTO sessions (id, device_id, started_at, duration_mins, time_remaining_secs, payment_method, amount_paid)
         VALUES (?, ?, ?, ?, ?, 'coin', ?)`,
        [sessionId, device_id, now, durationMins, credited_secs, coin_value]
      );
      await db.run("UPDATE devices SET status = 'in_session' WHERE id = ?", [device_id]);

      io?.to(`device:${device_id}`).emit('cmd:start', {
        session_id: sessionId,
        duration_mins: durationMins,
        duration_secs: credited_secs,
        amount_paid: coin_value,
      });
      io?.emit('session:started', { device_id, session_id: sessionId });
      io?.emit(EVENTS.SESSION_UPDATED, { device_id, session_id: sessionId, time_remaining_secs: credited_secs, status: 'active' });
      console.log(`[MQTT] Auto-started session ${sessionId} (${durationMins} min) for device:${device_id}`);
      notify(`🪙 Session started on ${deviceName}\n${durationMins} min | ₱${coin_value} (coin)`);
    }

    io?.emit(EVENTS.COIN_INSERTED, { device_id, coin_value, credited_secs });
    return;
  }

  // Heartbeat: pisotab/devices/{device_id}/status
  const statusMatch = topic.match(/^pisotab\/devices\/(.+)\/status$/);
  if (statusMatch) {
    const device_id = statusMatch[1];
    await db.run("UPDATE devices SET status = 'online', last_seen = unixepoch() WHERE id = ?", [device_id]);
    io?.emit(EVENTS.DEVICE_STATUS, { device_id, status: 'online', last_seen: Math.floor(Date.now() / 1000) });
  }
}

// Publish a command to a device (called by socket handlers)
function publishCommand(device_id, command, payload = {}) {
  if (!mqttClient) return;
  const topic = `pisotab/devices/${device_id}/cmd`;
  mqttClient.publish(topic, JSON.stringify({ command, ...payload }), { qos: 1 });
}

module.exports = { startMqttBridge, publishCommand };
