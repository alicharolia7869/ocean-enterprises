const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const store = db._getStore();
    res.json({ settings: store.business_settings });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching settings' });
  }
});

// PUT /api/settings
router.put('/', authMiddleware, (req, res) => {
  try {
    const store = db._getStore();
    const updates = req.body; // key-value pairs

    for (const [key, value] of Object.entries(updates)) {
      store.business_settings[key] = String(value);
    }
    db._save();

    res.json({ message: 'Settings saved successfully', settings: store.business_settings });
  } catch (err) {
    res.status(500).json({ error: 'Error saving settings' });
  }
});

module.exports = router;
