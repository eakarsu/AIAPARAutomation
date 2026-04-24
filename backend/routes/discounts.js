const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM discounts ORDER BY discount_deadline ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM discounts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Discount not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { invoice_number, vendor_name, invoice_amount, discount_terms, discount_percent, discount_amount, discount_deadline, payment_status, capture_status, potential_savings, priority } = req.body;
    const result = await db.query(
      `INSERT INTO discounts (invoice_number, vendor_name, invoice_amount, discount_terms, discount_percent, discount_amount, discount_deadline, payment_status, capture_status, potential_savings, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [invoice_number, vendor_name, invoice_amount, discount_terms, discount_percent, discount_amount, discount_deadline, payment_status || 'unpaid', capture_status || 'available', potential_savings, priority || 'medium']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { invoice_number, vendor_name, invoice_amount, discount_terms, discount_percent, discount_amount, discount_deadline, payment_status, capture_status, potential_savings, priority } = req.body;
    const result = await db.query(
      `UPDATE discounts SET invoice_number=$1, vendor_name=$2, invoice_amount=$3, discount_terms=$4, discount_percent=$5, discount_amount=$6, discount_deadline=$7, payment_status=$8, capture_status=$9, potential_savings=$10, priority=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [invoice_number, vendor_name, invoice_amount, discount_terms, discount_percent, discount_amount, discount_deadline, payment_status, capture_status, potential_savings, priority, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Discount not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM discounts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Discount not found' });
    res.json({ message: 'Discount deleted', discount: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
