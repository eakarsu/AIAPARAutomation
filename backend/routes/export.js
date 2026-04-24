const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const tableMap = {
  invoices: { table: 'invoices', order: 'created_at DESC' },
  payments: { table: 'payments', order: 'created_at DESC' },
  dunning: { table: 'dunning_records', order: 'days_overdue DESC' },
  'cash-applications': { table: 'cash_applications', order: 'created_at DESC' },
  discounts: { table: 'discounts', order: 'discount_deadline ASC' },
  aging: { table: 'aging_records', order: 'total_outstanding DESC' },
  contacts: { table: 'contacts', order: 'name ASC' },
  'audit-log': { table: 'audit_log', order: 'created_at DESC' },
};

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','));
  }
  return lines.join('\n');
}

router.get('/:module', authenticateToken, async (req, res) => {
  try {
    const config = tableMap[req.params.module];
    if (!config) return res.status(400).json({ error: 'Invalid module' });

    const result = await db.query(`SELECT * FROM ${config.table} ORDER BY ${config.order}`);
    const csv = toCsv(result.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.module}-export.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
