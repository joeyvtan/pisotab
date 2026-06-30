const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');

// Update version_code, version_name, and changelog here for every new release.
// Upload the APK via the dashboard (Admin → Downloads → Upload APK) BEFORE pushing
// this change — the apk_url is built dynamically from the latest uploaded APK record
// so DownloadManager receives a direct binary stream, not a Google Drive HTML page.
const CURRENT = {
  version_code: 2,
  version_name: '1.1.0',
  changelog: '- Fixed floating timer not draggable when disabled\n- Added draggable home button\n- Fixed USB mode decimal amounts'
};

router.get('/version', async (req, res) => {
  try {
    const db  = getDb();
    const apk = await db.get(
      "SELECT id FROM downloadable_files WHERE type = 'apk' ORDER BY uploaded_at DESC LIMIT 1"
    );
    const proto   = req.get('x-forwarded-proto') || req.protocol;
    const host    = req.get('host');
    const apk_url = apk ? `${proto}://${host}/api/downloads/${apk.id}/file` : null;
    res.json({ ...CURRENT, apk_url });
  } catch (_) {
    res.json({ ...CURRENT, apk_url: null });
  }
});

module.exports = router;
