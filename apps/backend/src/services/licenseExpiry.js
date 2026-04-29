/**
 * Daily job — sends email reminders for licenses expiring in 7 days and 3 days.
 * Fires once on startup, then every 24 hours.
 * Silently skips if SMTP is not configured.
 */
const { getDb } = require('../db');
const { sendLicenseExpiring, SMTP_CONFIGURED } = require('./mailer');

const NOTIFY_WINDOWS = [7, 3]; // days before expiry to send reminder

async function checkExpiringLicenses() {
  if (!SMTP_CONFIGURED) return;

  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  for (const daysLeft of NOTIFY_WINDOWS) {
    const windowStart = now + (daysLeft - 1) * 86400;
    const windowEnd   = now + daysLeft * 86400;

    try {
      const expiring = await db.all(
        `SELECT l.id, l.key, l.expires_at, l.owner_user_id,
                u.email, u.username, u.full_name,
                d.name AS device_name
         FROM licenses l
         JOIN users u ON u.id = l.owner_user_id
         LEFT JOIN devices d ON d.id = l.device_id
         WHERE l.expires_at > ? AND l.expires_at <= ?
           AND u.email IS NOT NULL
           AND u.status = 'approved'`,
        [windowStart, windowEnd]
      );

      for (const license of expiring) {
        await sendLicenseExpiring(
          { email: license.email, username: license.username, full_name: license.full_name },
          { key: license.key, device_name: license.device_name },
          daysLeft
        );
        console.log(`[licenseExpiry] Sent ${daysLeft}-day warning to ${license.email} for key ${license.key}`);
      }
    } catch (err) {
      console.error(`[licenseExpiry] Error checking ${daysLeft}-day window:`, err.message);
    }
  }
}

function startLicenseExpiryChecker() {
  // Run immediately on startup, then every 24 hours
  checkExpiringLicenses();
  setInterval(checkExpiringLicenses, 24 * 60 * 60 * 1000);
  console.log('[licenseExpiry] Daily license expiry checker started');
}

module.exports = { startLicenseExpiryChecker };
