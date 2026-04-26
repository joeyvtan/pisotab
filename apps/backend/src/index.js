/**
 * PisoTab Backend — Entry point
 * Starts Express REST API + Socket.IO + MQTT bridge + session timer
 */
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { getDb } = require('./db');
const { registerSocketHandlers } = require('./socketHandlers');
const { startSessionTimer } = require('./services/sessionTimer');
const { startMqttBridge } = require('./services/mqttBridge');
const { initNotifier } = require('./services/notifier');
const { initFcm } = require('./services/fcm');

async function main() {
  const db = getDb();

  // ── Schema ────────────────────────────────────────────────────────────────
  const { CREATE_TABLES, SEED_DATA } = require('./db/schema');
  await db.exec(CREATE_TABLES);

  // ── Migrations (run before seed so columns exist) ────────────────────────

  // Pre-Phase 7
  try { await db.exec('ALTER TABLE devices ADD COLUMN fcm_token TEXT'); } catch (_) {}
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id            TEXT PRIMARY KEY,
        key           TEXT UNIQUE NOT NULL,
        plan          TEXT NOT NULL DEFAULT 'paid',
        device_id     TEXT REFERENCES devices(id),
        owner_user_id TEXT REFERENCES users(id),
        expires_at    INTEGER,
        created_at    INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  } catch (_) {}
  try { await db.exec('ALTER TABLE devices ADD COLUMN trial_started_at INTEGER'); } catch (_) {}
  try { await db.exec('ALTER TABLE devices ADD COLUMN trial_days_override INTEGER'); } catch (_) {}
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS firmware_versions (
        version     TEXT NOT NULL,
        filename    TEXT NOT NULL,
        size        INTEGER NOT NULL,
        uploaded_at INTEGER NOT NULL
      )
    `);
  } catch (_) {}

  // Phase 7
  try { await db.exec("ALTER TABLE users ADD COLUMN email TEXT"); } catch (_) {}
  try { await db.exec("ALTER TABLE users ADD COLUMN full_name TEXT"); } catch (_) {}
  try { await db.exec("ALTER TABLE users ADD COLUMN business_name TEXT"); } catch (_) {}
  try { await db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'"); } catch (_) {}
  try { await db.exec("ALTER TABLE users ADD COLUMN approved_by TEXT"); } catch (_) {}
  try { await db.exec("ALTER TABLE users ADD COLUMN approved_at INTEGER"); } catch (_) {}
  try { await db.exec("ALTER TABLE licenses ADD COLUMN owner_user_id TEXT"); } catch (_) {}
  try { await db.exec("UPDATE users SET role = 'superadmin', status = 'approved' WHERE id = 'usr_admin'"); } catch (_) {}

  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL, expires_at INTEGER NOT NULL,
      used_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);
  } catch (_) {}
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS gcash_settings (
      id TEXT PRIMARY KEY, gcash_name TEXT NOT NULL DEFAULT '',
      gcash_number TEXT NOT NULL DEFAULT '', qr_image_url TEXT,
      updated_by TEXT, updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);
  } catch (_) {}
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS license_pricing (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id),
      plan TEXT NOT NULL DEFAULT 'paid', price_pesos REAL NOT NULL,
      duration_days INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);
  } catch (_) {}
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS license_purchase_requests (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL DEFAULT 'paid', quantity INTEGER NOT NULL DEFAULT 1,
      amount_paid REAL NOT NULL, gcash_reference TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT, reviewed_at INTEGER, note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);
  } catch (_) {}
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS license_transfers (
      id TEXT PRIMARY KEY, license_id TEXT NOT NULL REFERENCES licenses(id),
      from_user_id TEXT, to_user_id TEXT NOT NULL,
      transferred_by TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);
  } catch (_) {}
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS downloadable_files (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, version TEXT NOT NULL,
      filename TEXT NOT NULL, size INTEGER NOT NULL,
      uploaded_by TEXT, uploaded_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);
  } catch (_) {}
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, user_id TEXT,
      action TEXT NOT NULL, target_type TEXT, target_id TEXT,
      detail TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);
  } catch (_) {}

  // Phase 9
  try { await db.exec('ALTER TABLE license_purchase_requests ADD COLUMN generated_keys TEXT'); } catch (_) {}
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
    await db.run("INSERT INTO app_settings (key, value) VALUES ('invoice_pdf_enabled', '1') ON CONFLICT DO NOTHING");
  } catch (_) {}

  // Phase 8
  try { await db.exec("ALTER TABLE devices ADD COLUMN owner_user_id TEXT"); } catch (_) {}
  try { await db.exec("ALTER TABLE locations ADD COLUMN owner_user_id TEXT"); } catch (_) {}
  try { await db.exec("UPDATE devices SET owner_user_id = 'usr_admin' WHERE owner_user_id IS NULL"); } catch (_) {}
  try { await db.exec("UPDATE locations SET owner_user_id = 'usr_admin' WHERE owner_user_id IS NULL AND id != 'loc_main'"); } catch (_) {}

  // Phase 11
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS device_configs (
      device_id          TEXT PRIMARY KEY REFERENCES devices(id),
      connection_mode    TEXT NOT NULL DEFAULT 'esp32',
      rate_per_min       REAL NOT NULL DEFAULT 1.0,
      secs_per_coin      INTEGER NOT NULL DEFAULT 300,
      coin_rates         TEXT NOT NULL DEFAULT '[]',
      kiosk_mode         INTEGER NOT NULL DEFAULT 0,
      floating_timer     INTEGER NOT NULL DEFAULT 0,
      deep_freeze        INTEGER NOT NULL DEFAULT 0,
      deep_freeze_grace  INTEGER NOT NULL DEFAULT 30,
      alarm_wifi         INTEGER NOT NULL DEFAULT 0,
      alarm_charger      INTEGER NOT NULL DEFAULT 0,
      alarm_session_only INTEGER NOT NULL DEFAULT 1,
      alarm_delay_secs   INTEGER NOT NULL DEFAULT 30,
      updated_at         INTEGER NOT NULL DEFAULT (unixepoch()),
      applied_at         INTEGER
    )`);
    await db.exec(`INSERT INTO device_configs (device_id) SELECT id FROM devices ON CONFLICT DO NOTHING`);
    // Migration: add admin_pin column if missing
    try { await db.exec(`ALTER TABLE device_configs ADD COLUMN admin_pin TEXT`); } catch (_) {}
  } catch (_) {}

  // Migration: add per-user telegram columns
  try {
    try { await db.exec(`ALTER TABLE users ADD COLUMN telegram_bot_token TEXT`); } catch (_) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN telegram_chat_id TEXT`); } catch (_) {}
  } catch (_) {}

  // ── Seed ─────────────────────────────────────────────────────────────────
  await db.exec(SEED_DATA);

  // ── Express app ───────────────────────────────────────────────────────────
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  app.use(cors());
  app.use(express.json());
  app.use((req, _res, next) => { req.io = io; next(); });

  // Routes
  app.use('/api/auth',             require('./routes/auth').router);
  app.use('/api/devices',          require('./routes/devices'));
  app.use('/api/sessions',         require('./routes/sessions'));
  app.use('/api/pricing',          require('./routes/pricing'));
  app.use('/api/coins',            require('./routes/coins'));
  app.use('/api/locations',        require('./routes/locations'));
  app.use('/api/users',            require('./routes/users'));
  app.use('/api/peak-rules',       require('./routes/peakRules'));
  app.use('/api/firmware',         require('./routes/firmware'));
  app.use('/api/app',              require('./routes/app'));
  app.use('/api/licenses',         require('./routes/licenses'));
  app.use('/api/gcash-settings',   require('./routes/gcash'));
  app.use('/api/license-pricing',  require('./routes/licensePricing'));
  app.use('/api/purchase-requests',require('./routes/purchaseRequests'));
  app.use('/api/downloads',        require('./routes/downloads'));
  app.use('/api/audit-log',        require('./routes/auditLog'));
  app.use('/api/app-settings',     require('./routes/appSettings'));
  app.use('/api/devices',          require('./routes/deviceConfigs'));

  app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // Services
  registerSocketHandlers(io);
  startSessionTimer(io);
  startMqttBridge(io);
  initNotifier();
  initFcm();

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`\n🚀 PisoTab backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket ready`);
    console.log(`🗄  Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}\n`);
  });
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
