/**
 * Run once to initialize the SQLite database.
 * Usage: node --experimental-sqlite src/db/setup.js
 */
require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { CREATE_TABLES, SEED_DATA } = require('./schema');

const DB_PATH = process.env.DB_PATH || './pisotab.db';
const db = new DatabaseSync(path.resolve(DB_PATH));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(CREATE_TABLES);
db.exec(SEED_DATA);

console.log('✅ Database initialized at', path.resolve(DB_PATH));
console.log('✅ Default admin: username=admin, password=admin123');
db.close();
