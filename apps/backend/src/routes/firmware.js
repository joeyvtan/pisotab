/**
 * Firmware OTA routes — admin only (except download, which ESP32 hits directly).
 *
 * GET    /api/firmware            → current firmware version info
 * POST   /api/firmware/upload     → upload new .bin file (admin)
 * GET    /api/firmware/download   → serve the .bin file (no auth — ESP32 fetches this)
 * POST   /api/firmware/ota/:device_id → trigger OTA push to one device via MQTT (admin)
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('./auth');
const { publishCommand } = require('../services/mqttBridge');

// Store firmware files in <project_root>/uploads/firmware/
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'firmware');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // Always write to the same filename so there's only ever one firmware on disk
  filename:    (_req, _file, cb) => cb(null, 'firmware.bin'),
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },  // 4 MB — typical ESP32 flash size
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith('.bin')) {
      return cb(new Error('Only .bin files allowed'));
    }
    cb(null, true);
  },
});

// GET /api/firmware
router.get('/', requireAuth, async (req, res) => {
  try {
    const row = await getDb().get('SELECT * FROM firmware_versions ORDER BY uploaded_at DESC LIMIT 1', []);
    if (!row) return res.json({ version: null, filename: null, size: null, uploaded_at: null });
    const proto = req.protocol;
    const host  = req.get('host');
    res.json({ ...row, download_url: `${proto}://${host}/api/firmware/download` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/firmware/upload
router.post('/upload', requireAuth, requireAdmin, (req, res) => {
  upload.single('firmware')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { version } = req.body;
    if (!version) return res.status(400).json({ error: 'version field required' });

    try {
      const db = getDb();
      await db.run('DELETE FROM firmware_versions', []);  // keep only latest
      await db.run(
        `INSERT INTO firmware_versions (version, filename, size, uploaded_at)
         VALUES (?, ?, ?, unixepoch())`,
        [version, 'firmware.bin', req.file.size]
      );

      const row = await db.get('SELECT * FROM firmware_versions LIMIT 1', []);
      res.status(201).json(row);
    } catch (dbErr) { console.error(dbErr); res.status(500).json({ error: 'Server error' }); }
  });
});

// GET /api/firmware/download  — no auth: ESP32 calls this directly
router.get('/download', (req, res) => {
  const binPath = path.join(UPLOAD_DIR, 'firmware.bin');
  if (!fs.existsSync(binPath)) {
    return res.status(404).json({ error: 'No firmware uploaded yet' });
  }
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="firmware.bin"');
  res.sendFile(binPath);
});

// POST /api/firmware/ota/:device_id — trigger OTA on a specific device
router.post('/ota/:device_id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = await getDb().get('SELECT * FROM firmware_versions LIMIT 1', []);
    if (!row) return res.status(400).json({ error: 'No firmware uploaded yet' });

    const proto = req.protocol;
    const host  = req.get('host');
    const url   = `${proto}://${host}/api/firmware/download`;

    publishCommand(req.params.device_id, 'ota', { url, version: row.version });
    console.log(`[OTA] Triggered on device ${req.params.device_id} → ${url}`);

    res.json({ ok: true, device_id: req.params.device_id, url, version: row.version });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
