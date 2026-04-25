const express = require('express');
const router  = express.Router();

/**
 * GET /api/app/version
 * Returns the latest Android APK version info.
 * Update version_code + version_name here when a new APK is built.
 * Set apk_url to a reachable download URL once APK hosting is available.
 */
router.get('/version', (req, res) => {
  res.json({
    version_code: 1,
    version_name: '1.0.0',
    apk_url: null
  });
});

module.exports = router;
