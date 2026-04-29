/**
 * Downloadable files routes.
 * Public GET — landing page shows latest APK and firmware versions.
 * Superadmin POST/DELETE — register or remove a downloadable file record.
 *
 * These are metadata records only. Actual file serving uses the existing
 * /api/firmware/download route for ESP32 .bin files. APK files are served
 * as static files from the uploads/apk/ directory.
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth, requireSuperAdmin } = require('./auth');

const APK_DIR = path.join(__dirname, '..', '..', 'uploads', 'apk');
fs.mkdirSync(APK_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, APK_DIR),
  filename: (_req, file, cb) => cb(null, file.originalname),
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },  // 100 MB max for APK
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith('.apk')) {
      return cb(new Error('Only .apk files allowed'));
    }
    cb(null, true);
  },
});

// GET /api/downloads — public: returns latest APK and firmware entries
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const files = await db.all(
      `SELECT id, type, version, filename, size, changelog, uploaded_at
       FROM downloadable_files
       ORDER BY uploaded_at DESC`,
      []
    );

    // Append download URLs
    const proto = req.protocol;
    const host  = req.get('host');
    const withUrls = files.map(f => ({
      ...f,
      download_url: f.type === 'apk'
        ? `${proto}://${host}/api/downloads/${f.id}/file`
        : `${proto}://${host}/api/firmware/download`,
    }));

    const apk      = withUrls.filter(f => f.type === 'apk')[0] || null;
    const firmware = withUrls.filter(f => f.type === 'firmware')[0] || null;

    res.json({ apk, firmware, all: withUrls });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/downloads/:id/file — public: serve APK file
router.get('/:id/file', async (req, res) => {
  try {
    const db = getDb();
    const record = await db.get("SELECT * FROM downloadable_files WHERE id = ? AND type = 'apk'", [req.params.id]);
    if (!record) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(APK_DIR, record.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing from disk' });

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${record.filename}"`);
    res.sendFile(filePath);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/downloads/upload-apk — superadmin uploads a new APK
router.post('/upload-apk', requireAuth, requireSuperAdmin, (req, res) => {
  upload.single('apk')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { version, changelog } = req.body;
    if (!version) return res.status(400).json({ error: 'version field required' });

    try {
      const db = getDb();
      const id = 'dl_' + uuidv4().replace(/-/g, '').slice(0, 8);
      await db.run(
        `INSERT INTO downloadable_files (id, type, version, filename, size, changelog, uploaded_by, uploaded_at)
         VALUES (?, 'apk', ?, ?, ?, ?, ?, unixepoch())`,
        [id, version, req.file.originalname, req.file.size, changelog || null, req.user.id]
      );

      res.status(201).json(await db.get('SELECT * FROM downloadable_files WHERE id = ?', [id]));
    } catch (dbErr) { console.error(dbErr); res.status(500).json({ error: 'Server error' }); }
  });
});

// POST /api/downloads — superadmin registers a firmware metadata entry
router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
  const { type, version, filename, size } = req.body;
  if (!type || !version || !filename || !size) {
    return res.status(400).json({ error: 'type, version, filename, size required' });
  }
  if (!['apk', 'firmware'].includes(type)) {
    return res.status(400).json({ error: "type must be 'apk' or 'firmware'" });
  }

  try {
    const db = getDb();
    const id = 'dl_' + uuidv4().replace(/-/g, '').slice(0, 8);
    await db.run(
      `INSERT INTO downloadable_files (id, type, version, filename, size, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
      [id, type, version, filename, size, req.user.id]
    );

    res.status(201).json(await db.get('SELECT * FROM downloadable_files WHERE id = ?', [id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/downloads/:id — superadmin removes a record (and APK file from disk if present)
router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const db = getDb();
    const record = await db.get('SELECT * FROM downloadable_files WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'File not found' });

    if (record.type === 'apk') {
      const filePath = path.join(APK_DIR, record.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.run('DELETE FROM downloadable_files WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
