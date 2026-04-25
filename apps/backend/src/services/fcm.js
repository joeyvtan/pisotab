/**
 * Firebase Cloud Messaging service.
 * Sends push notifications to Android tablets as a backup to Socket.IO.
 *
 * Setup (local dev):
 *   Set FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json in .env
 *
 * Setup (production / Render):
 *   Set FIREBASE_SERVICE_ACCOUNT_JSON to the full JSON content of the service account key.
 *   (paste the entire JSON as a single-line string in the Render env var dashboard)
 */
const path = require('path');
let messaging = null;

function initFcm() {
  try {
    const admin = require('firebase-admin');

    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Production: JSON content supplied directly as an env var
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Local dev: JSON file path
      serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    } else {
      console.warn('⚠️  Firebase not configured (set FIREBASE_SERVICE_ACCOUNT_JSON) — FCM push disabled');
      return;
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging();
    console.log('✅ Firebase FCM ready');
  } catch (e) {
    console.warn('⚠️  Firebase FCM failed to init:', e.message);
  }
}

/**
 * Send a high-priority data + notification message to a specific device token.
 * No-op if FCM is not initialised or token is empty.
 */
async function sendToDevice(fcmToken, title, body) {
  if (!messaging || !fcmToken) return;
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      android: { priority: 'high' },
    });
  } catch (e) {
    console.warn('FCM send failed:', e.message);
  }
}

module.exports = { initFcm, sendToDevice };
