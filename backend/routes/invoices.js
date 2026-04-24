const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create invoice
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { invoice_number, vendor_name, amount, po_number, po_amount, match_status, invoice_date, due_date, category, description } = req.body;
    const result = await db.query(
      `INSERT INTO invoices (invoice_number, vendor_name, amount, po_number, po_amount, match_status, invoice_date, due_date, category, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [invoice_number, vendor_name, amount, po_number, po_amount, match_status || 'pending', invoice_date, due_date, category, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { invoice_number, vendor_name, amount, po_number, po_amount, match_status, invoice_date, due_date, category, description } = req.body;
    const result = await db.query(
      `UPDATE invoices SET invoice_number=$1, vendor_name=$2, amount=$3, po_number=$4, po_amount=$5, match_status=$6, invoice_date=$7, due_date=$8, category=$9, description=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [invoice_number, vendor_name, amount, po_number, po_amount, match_status, invoice_date, due_date, category, description, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete invoice
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted', invoice: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
