const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { payment_ref, payer_name, amount, payment_method, bank_reference, invoice_number, reconciliation_status, payment_date, bank_statement_date, difference_amount, notes } = req.body;
    const result = await db.query(
      `INSERT INTO payments (payment_ref, payer_name, amount, payment_method, bank_reference, invoice_number, reconciliation_status, payment_date, bank_statement_date, difference_amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [payment_ref, payer_name, amount, payment_method, bank_reference, invoice_number, reconciliation_status || 'unreconciled', payment_date, bank_statement_date, difference_amount || 0, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { payment_ref, payer_name, amount, payment_method, bank_reference, invoice_number, reconciliation_status, payment_date, bank_statement_date, difference_amount, notes } = req.body;
    const result = await db.query(
      `UPDATE payments SET payment_ref=$1, payer_name=$2, amount=$3, payment_method=$4, bank_reference=$5, invoice_number=$6, reconciliation_status=$7, payment_date=$8, bank_statement_date=$9, difference_amount=$10, notes=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [payment_ref, payer_name, amount, payment_method, bank_reference, invoice_number, reconciliation_status, payment_date, bank_statement_date, difference_amount, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM payments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted', payment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
