'use strict';
require('dotenv').config();

/**
 * Dual-mode database adapter.
 * - No DATABASE_URL → SQLite via node:sqlite (development)
 * - DATABASE_URL set  → PostgreSQL via pg (production)
 *
 * Unified async API:
 *   db.get(sql, params)  → first row | undefined
 *   db.all(sql, params)  → row[]
 *   db.run(sql, params)  → { changes: number }
 *   db.exec(sql)         → void  (DDL / multi-statement)
 */

const DATABASE_URL = process.env.DATABASE_URL;

// ── PostgreSQL SQL translator ─────────────────────────────────────────────────
// Converts SQLite dialect used throughout the codebase to valid PostgreSQL.
function toPg(sql) {
  const hasOrIgnore = /INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);

  sql = sql
    // Strip PRAGMA (SQLite-only)
    .replace(/PRAGMA\s+[^\n;]+[;\n]?/gi, '')
    // INSERT OR IGNORE → INSERT (ON CONFLICT appended below)
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT INTO')
    // unixepoch() → floor(extract(epoch from now()))
    .replace(/\bunixepoch\(\)/g, "floor(extract(epoch from now()))::integer")
    // date(col, 'unixepoch') → to_char(to_timestamp(col), 'YYYY-MM-DD')
    .replace(/\bdate\(([^,)]+),\s*'unixepoch'\)/g, "to_char(to_timestamp($1), 'YYYY-MM-DD')")
    // SQLite datetime → to_timestamp
    .replace(/\bdatetime\(([^,)]+),\s*'unixepoch'(?:,\s*'localtime')?\)/g, "to_timestamp($1) AT TIME ZONE 'Asia/Manila'")
    // CAST(strftime('%H', ...) AS INTEGER) → extract(hour from ...)::integer
    .replace(/CAST\(\s*strftime\('%H',\s*([\s\S]+?)\)\s+AS\s+INTEGER\)/gi, 'extract(hour from $1)::integer');

  // Replace ? positional placeholders with $1, $2, ...
  let idx = 0;
  sql = sql.replace(/\?/g, () => `$${++idx}`);

  // Append ON CONFLICT DO NOTHING for INSERT OR IGNORE when no ON CONFLICT already
  if (hasOrIgnore && !/ON\s+CONFLICT\b/i.test(sql)) {
    sql = sql.trimEnd().replace(/;$/, '') + ' ON CONFLICT DO NOTHING';
  }

  return sql;
}

// ── Build the db object ───────────────────────────────────────────────────────

let db;

if (!DATABASE_URL) {
  // ── SQLite mode ─────────────────────────────────────────────────────────────
  const { DatabaseSync } = require('node:sqlite');
  const path = require('path');
  const DB_PATH = process.env.DB_PATH || './pisotab.db';

  let _sqlite = null;
  function getSqlite() {
    if (!_sqlite) {
      _sqlite = new DatabaseSync(path.resolve(DB_PATH));
      _sqlite.exec('PRAGMA journal_mode = WAL');
      _sqlite.exec('PRAGMA foreign_keys = ON');
    }
    return _sqlite;
  }

  db = {
    get: async (sql, params = []) => getSqlite().prepare(sql).get(...params),
    all: async (sql, params = []) => getSqlite().prepare(sql).all(...params),
    run: async (sql, params = []) => {
      const r = getSqlite().prepare(sql).run(...params);
      return { changes: r.changes };
    },
    exec: async (sql) => getSqlite().exec(sql),
  };

} else {
  // ── PostgreSQL mode ─────────────────────────────────────────────────────────
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 10,
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
  });

  db = {
    get: async (sql, params = []) => {
      const { rows } = await pool.query(toPg(sql), params);
      return rows[0];
    },
    all: async (sql, params = []) => {
      const { rows } = await pool.query(toPg(sql), params);
      return rows;
    },
    run: async (sql, params = []) => {
      const result = await pool.query(toPg(sql), params);
      return { changes: result.rowCount };
    },
    exec: async (sql) => {
      // Split on ; and run each statement — handles multi-statement DDL blocks
      const stmts = sql.split(';').map(s => toPg(s).trim()).filter(Boolean);
      for (const stmt of stmts) {
        await pool.query(stmt);
      }
    },
    // Expose pool for raw use if needed
    pool,
  };
}

function getDb() { return db; }

module.exports = { getDb };
