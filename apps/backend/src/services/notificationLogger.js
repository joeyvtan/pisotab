/**
 * Logs in-app notifications to the notifications table.
 * Call addNotification() whenever something noteworthy happens.
 * user_id = null means the notification is for all superadmins.
 */
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

async function addNotification({ user_id = null, type, title, body }) {
  try {
    const db = getDb();
    const id = 'ntf_' + uuidv4().replace(/-/g, '').slice(0, 10);
    await db.run(
      `INSERT INTO notifications (id, user_id, type, title, body) VALUES (?, ?, ?, ?, ?)`,
      [id, user_id || null, type, title, body]
    );
  } catch (err) {
    console.error('[notificationLogger] Failed to log notification:', err.message);
  }
}

module.exports = { addNotification };
