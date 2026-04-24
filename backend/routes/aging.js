const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM aging_records ORDER BY total_outstanding DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM aging_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay } = req.body;
    const result = await db.query(
      `INSERT INTO aging_records (entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [entity_name, entity_type, total_outstanding, current_amount || 0, days_1_30 || 0, days_31_60 || 0, days_61_90 || 0, days_over_90 || 0, credit_limit, risk_rating || 'low', last_payment_date, avg_days_to_pay]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay } = req.body;
    const result = await db.query(
      `UPDATE aging_records SET entity_name=$1, entity_type=$2, total_outstanding=$3, current_amount=$4, days_1_30=$5, days_31_60=$6, days_61_90=$7, days_over_90=$8, credit_limit=$9, risk_rating=$10, last_payment_date=$11, avg_days_to_pay=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM aging_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
