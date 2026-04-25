/**
 * Database schema definitions for PisoTab.
 * Using SQLite via better-sqlite3 for zero-config local development.
 * Migrate to PostgreSQL for production by swapping the db driver.
 */

const CREATE_TABLES = `
  -- Users (admins / staff)
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'staff',     -- 'superadmin' | 'admin' | 'staff'
    email         TEXT,
    full_name     TEXT,
    business_name TEXT,
    status        TEXT NOT NULL DEFAULT 'approved',  -- 'pending' | 'approved' | 'suspended'
    approved_by   TEXT REFERENCES users(id),
    approved_at   INTEGER,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Locations / branches
  CREATE TABLE IF NOT EXISTS locations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    address     TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Registered devices (Android phones)
  CREATE TABLE IF NOT EXISTS devices (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    location_id   TEXT REFERENCES locations(id),
    status        TEXT NOT NULL DEFAULT 'offline',  -- 'online' | 'offline' | 'in_session' | 'locked'
    last_seen     INTEGER,
    ip_address    TEXT,
    android_id    TEXT UNIQUE,
    license_key   TEXT,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Pricing tiers
  CREATE TABLE IF NOT EXISTS pricing_tiers (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    amount_pesos  REAL NOT NULL,
    duration_mins INTEGER NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Sessions
  CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    device_id       TEXT NOT NULL REFERENCES devices(id),
    pricing_tier_id TEXT REFERENCES pricing_tiers(id),
    started_at      INTEGER NOT NULL,
    ended_at        INTEGER,
    paused_at       INTEGER,
    total_paused_ms INTEGER NOT NULL DEFAULT 0,
    duration_mins   INTEGER NOT NULL,
    time_remaining_secs INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'ended'
    payment_method  TEXT NOT NULL DEFAULT 'coin',   -- 'coin' | 'manual' | 'qr'
    amount_paid     REAL NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Session time additions (audit log)
  CREATE TABLE IF NOT EXISTS session_time_additions (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES sessions(id),
    added_by    TEXT NOT NULL,  -- 'coin' | 'admin' | 'staff'
    added_secs  INTEGER NOT NULL,
    amount_paid REAL NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Peak pricing rules
  CREATE TABLE IF NOT EXISTS peak_rules (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    days_of_week TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
    start_hour   INTEGER NOT NULL,
    end_hour     INTEGER NOT NULL,
    multiplier   REAL NOT NULL DEFAULT 1.5,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- License keys (device-based, trial/paid)
  CREATE TABLE IF NOT EXISTS licenses (
    id            TEXT PRIMARY KEY,
    key           TEXT UNIQUE NOT NULL,
    plan          TEXT NOT NULL DEFAULT 'paid',  -- 'paid'
    device_id     TEXT REFERENCES devices(id),   -- null until activated
    owner_user_id TEXT REFERENCES users(id),     -- admin account that owns this key
    expires_at    INTEGER,                        -- null = lifetime
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Password reset tokens (forgot-password flow, 1-hour expiry)
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    token      TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at    INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- GCash payment details shown to admins on the Buy License page
  CREATE TABLE IF NOT EXISTS gcash_settings (
    id           TEXT PRIMARY KEY DEFAULT 'gcash_main',
    gcash_name   TEXT NOT NULL DEFAULT '',
    gcash_number TEXT NOT NULL DEFAULT '',
    qr_image_url TEXT,
    updated_by   TEXT REFERENCES users(id),
    updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Custom license pricing per user (NULL user_id = platform default)
  CREATE TABLE IF NOT EXISTS license_pricing (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    plan        TEXT NOT NULL DEFAULT 'paid',
    price_pesos REAL NOT NULL,
    duration_days INTEGER,                    -- null = lifetime
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- License purchase requests submitted by admins (GCash manual payment)
  CREATE TABLE IF NOT EXISTS license_purchase_requests (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id),
    plan             TEXT NOT NULL DEFAULT 'paid',
    quantity         INTEGER NOT NULL DEFAULT 1,
    amount_paid      REAL NOT NULL,
    gcash_reference  TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
    reviewed_by      TEXT REFERENCES users(id),
    reviewed_at      INTEGER,
    note             TEXT,
    created_at       INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Audit log of license ownership transfers between admin accounts
  CREATE TABLE IF NOT EXISTS license_transfers (
    id           TEXT PRIMARY KEY,
    license_id   TEXT NOT NULL REFERENCES licenses(id),
    from_user_id TEXT REFERENCES users(id),
    to_user_id   TEXT NOT NULL REFERENCES users(id),
    transferred_by TEXT NOT NULL REFERENCES users(id),
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Downloadable files metadata (APK, ESP32 firmware)
  CREATE TABLE IF NOT EXISTS downloadable_files (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,           -- 'apk' | 'firmware'
    version     TEXT NOT NULL,
    filename    TEXT NOT NULL,
    size        INTEGER NOT NULL,
    uploaded_by TEXT REFERENCES users(id),
    uploaded_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- General audit log for sensitive actions
  CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    action      TEXT NOT NULL,           -- e.g. 'license.transfer', 'user.approve'
    target_type TEXT,                    -- e.g. 'license', 'user'
    target_id   TEXT,
    detail      TEXT,                    -- JSON string for extra context
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Coin events from ESP32
  CREATE TABLE IF NOT EXISTS coin_events (
    id          TEXT PRIMARY KEY,
    device_id   TEXT NOT NULL REFERENCES devices(id),
    coin_value  REAL NOT NULL,
    pulses      INTEGER NOT NULL,
    credited_secs INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
`;

const SEED_DATA = `
  -- Default super admin user (password: admin123 — change immediately)
  INSERT OR IGNORE INTO users (id, username, password, role, status)
  VALUES ('usr_admin', 'admin', '$2a$10$cJsld9pNvw8vKkpFO99HHOnXk6ENveBYNPIq9SbBCBl1pkMI144Zu', 'superadmin', 'approved');

  -- Default pricing tiers
  INSERT OR IGNORE INTO pricing_tiers (id, name, amount_pesos, duration_mins)
  VALUES
    ('tier_1', '₱1 — 5 mins',    1.0,  5),
    ('tier_5', '₱5 — 30 mins',   5.0,  30),
    ('tier_10', '₱10 — 65 mins', 10.0, 65),
    ('tier_20', '₱20 — 140 mins', 20.0, 140);

  -- Default location
  INSERT OR IGNORE INTO locations (id, name, address)
  VALUES ('loc_main', 'Main Branch', 'Default Location');
`;

module.exports = { CREATE_TABLES, SEED_DATA };
