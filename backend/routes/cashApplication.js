const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cash_applications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cash_applications WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receipt_ref, customer_name, received_amount, applied_amount, unapplied_amount, invoice_references, application_status, receipt_date, bank_account, payment_method, remittance_info } = req.body;
    const result = await db.query(
      `INSERT INTO cash_applications (receipt_ref, customer_name, received_amount, applied_amount, unapplied_amount, invoice_references, application_status, receipt_date, bank_account, payment_method, remittance_info)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [receipt_ref, customer_name, received_amount, applied_amount || 0, unapplied_amount, invoice_references, application_status || 'unapplied', receipt_date, bank_account, payment_method, remittance_info]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { receipt_ref, customer_name, received_amount, applied_amount, unapplied_amount, invoice_references, application_status, receipt_date, bank_account, payment_method, remittance_info } = req.body;
    const result = await db.query(
      `UPDATE cash_applications SET receipt_ref=$1, customer_name=$2, received_amount=$3, applied_amount=$4, unapplied_amount=$5, invoice_references=$6, application_status=$7, receipt_date=$8, bank_account=$9, payment_method=$10, remittance_info=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [receipt_ref, customer_name, received_amount, applied_amount, unapplied_amount, invoice_references, application_status, receipt_date, bank_account, payment_method, remittance_info, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM cash_applications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
