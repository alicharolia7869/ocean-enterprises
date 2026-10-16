const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value FROM business_settings').all();
    const settings = {};
    for (const r of rows || []) {
      settings[r.key] = r.value;
    }
    res.json({ settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

// PUT /api/settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const updates = req.body; // key-value pairs
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await db.prepare(`
        INSERT OR REPLACE INTO business_settings (key, value)
        VALUES (?, ?)
      `).run(key, String(value));
    }

    const rows = await db.prepare('SELECT key, value FROM business_settings').all();
    const settings = {};
    for (const r of rows || []) {
      settings[r.key] = r.value;
    }

    res.json({ message: 'Settings saved successfully', settings });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Error saving settings' });
  }
});

module.exports = router;
