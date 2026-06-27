const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const CATALOG_PATH = path.join(__dirname, '../../data/apps-catalog.json');

// GET /api/apps-catalog — no auth required; admin edits the JSON file on the server
router.get('/', (req, res) => {
  try {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    res.json(catalog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load apps catalog' });
  }
});

module.exports = router;
