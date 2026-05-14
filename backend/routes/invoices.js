const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// ─── Validation helpers ───────────────────────────────────────────────────────
const invoiceCreateRules = [
  body('vendor_name').trim().notEmpty().withMessage('vendor_name is required').isLength({ max: 200 }),
  body('amount').notEmpty().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('due_date').notEmpty().isISO8601().withMessage('due_date must be a valid ISO date'),
  body('invoice_number').optional().isLength({ max: 100 }),
  body('category').optional().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 1000 }),
];

const invoiceUpdateRules = [
  body('vendor_name').optional().trim().isLength({ max: 200 }),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('due_date').optional().isISO8601().withMessage('due_date must be a valid ISO date'),
  body('match_status').optional().isIn(['pending', 'matched', 'partial_match', 'unmatched']),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// ─── GET / (paginated) ────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req);
    const { status, vendor } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (status) { where += ` AND match_status = $${idx++}`; params.push(status); }
    if (vendor) { where += ` AND vendor_name ILIKE $${idx++}`; params.push(`%${vendor}%`); }

    const [rows, countRow] = await Promise.all([
      db.query(`SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM invoices ${where}`, params),
    ]);
    const total = parseInt(countRow.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST / ───────────────────────────────────────────────────────────────────
router.post('/', authenticateToken, invoiceCreateRules, validate, async (req, res) => {
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

// ─── PUT /:id ─────────────────────────────────────────────────────────────────
router.put('/:id', authenticateToken, invoiceUpdateRules, validate, async (req, res) => {
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

// ─── DELETE /:id ──────────────────────────────────────────────────────────────
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
