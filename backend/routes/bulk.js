const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const allowedTables = {
  invoices: { table: 'invoices', statusField: 'match_status' },
  payments: { table: 'payments', statusField: 'reconciliation_status' },
  dunning: { table: 'dunning_records', statusField: 'status' },
  'cash-applications': { table: 'cash_applications', statusField: 'application_status' },
  discounts: { table: 'discounts', statusField: 'capture_status' },
  aging: { table: 'aging_records', statusField: 'risk_rating' },
  contacts: { table: 'contacts', statusField: 'status' },
};

// Bulk delete
router.post('/:module/delete', authenticateToken, async (req, res) => {
  try {
    const config = allowedTables[req.params.module];
    if (!config) return res.status(400).json({ error: 'Invalid module' });

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await db.query(
      `DELETE FROM ${config.table} WHERE id IN (${placeholders}) RETURNING id`,
      ids
    );

    res.json({ message: `Deleted ${result.rowCount} records`, deletedCount: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk status update
router.post('/:module/status', authenticateToken, async (req, res) => {
  try {
    const config = allowedTables[req.params.module];
    if (!config) return res.status(400).json({ error: 'Invalid module' });

    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No IDs provided' });
    }
    if (!status) return res.status(400).json({ error: 'No status provided' });

    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const result = await db.query(
      `UPDATE ${config.table} SET ${config.statusField} = $1, updated_at = NOW() WHERE id IN (${placeholders}) RETURNING id`,
      [status, ...ids]
    );

    res.json({ message: `Updated ${result.rowCount} records`, updatedCount: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
