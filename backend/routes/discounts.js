const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const discountCreateRules = [
  body('vendor_name').trim().notEmpty().withMessage('vendor_name is required').isLength({ max: 200 }),
  body('invoice_amount').notEmpty().isFloat({ gt: 0 }).withMessage('invoice_amount must be a positive number'),
  body('discount_deadline').notEmpty().isISO8601().withMessage('discount_deadline must be a valid ISO date'),
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }),
  body('discount_amount').optional().isFloat({ min: 0 }),
  body('potential_savings').optional().isFloat({ min: 0 }),
  body('capture_status').optional().isIn(['available', 'expiring_soon', 'captured', 'missed', 'not_applicable']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
];

const discountUpdateRules = [
  body('vendor_name').optional().trim().isLength({ max: 200 }),
  body('invoice_amount').optional().isFloat({ gt: 0 }),
  body('discount_deadline').optional().isISO8601(),
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }),
  body('discount_amount').optional().isFloat({ min: 0 }),
  body('capture_status').optional().isIn(['available', 'expiring_soon', 'captured', 'missed', 'not_applicable']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
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

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req);
    const { status, priority } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (status) { where += ` AND capture_status = $${idx++}`; params.push(status); }
    if (priority) { where += ` AND priority = $${idx++}`; params.push(priority); }

    const [rows, countRow] = await Promise.all([
      db.query(`SELECT * FROM discounts ${where} ORDER BY discount_deadline ASC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM discounts ${where}`, params),
    ]);
    const total = parseInt(countRow.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

router.post('/', authenticateToken, discountCreateRules, validate, async (req, res) => {
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

router.put('/:id', authenticateToken, discountUpdateRules, validate, async (req, res) => {
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
