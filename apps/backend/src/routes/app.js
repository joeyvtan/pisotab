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
    version_code: 2,
    version_name: '1.1.0',
    apk_url: https://drive.usercontent.google.com/download?id=1aAR3zZGZ8FUI9iQuq18TRbO5cWM-foRB&export=download&authuser=0
    changelog: '- Fixed floating timer not draggable when disabled\n- Added draggable home button\n- Fixed USB mode decimal amounts'
  });
});

module.exports = router;
