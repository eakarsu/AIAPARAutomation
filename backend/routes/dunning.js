const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM dunning_records ORDER BY days_overdue DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM dunning_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes } = req.body;
    const result = await db.query(
      `INSERT INTO dunning_records (customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level || 1, last_contact_date, next_action_date, status || 'active', contact_attempts || 0, risk_score || 'low', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes } = req.body;
    const result = await db.query(
      `UPDATE dunning_records SET customer_name=$1, customer_email=$2, invoice_number=$3, amount_due=$4, days_overdue=$5, dunning_level=$6, last_contact_date=$7, next_action_date=$8, status=$9, contact_attempts=$10, risk_score=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM dunning_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
