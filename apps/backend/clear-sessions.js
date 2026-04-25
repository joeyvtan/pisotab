const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('pisotab.db');
db.prepare("UPDATE sessions SET status='ended', ended_at=unixepoch() WHERE status IN ('active','paused')").run();
db.prepare("UPDATE devices SET status='online'").run();
console.log('All stuck sessions cleared.');
