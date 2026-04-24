const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get all contacts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM contacts ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single contact
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create contact
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, email, phone, company, address, payment_terms, credit_limit, status, notes } = req.body;
    const result = await db.query(
      `INSERT INTO contacts (name, type, email, phone, company, address, payment_terms, credit_limit, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, type || 'customer', email, phone, company, address, payment_terms, credit_limit, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contact
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, type, email, phone, company, address, payment_terms, credit_limit, status, notes } = req.body;
    const result = await db.query(
      `UPDATE contacts SET name=$1, type=$2, email=$3, phone=$4, company=$5, address=$6, payment_terms=$7, credit_limit=$8, status=$9, notes=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [name, type, email, phone, company, address, payment_terms, credit_limit, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM contacts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact deleted', contact: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
