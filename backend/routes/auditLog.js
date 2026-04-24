const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get audit log entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { module, action, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    let idx = 1;

    if (module) {
      query += ` AND module = $${idx++}`;
      params.push(module);
    }
    if (action) {
      query += ` AND action = $${idx++}`;
      params.push(action);
    }

    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM audit_log');
    res.json({ entries: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
