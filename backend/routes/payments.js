const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const paymentCreateRules = [
  body('payment_ref').trim().notEmpty().withMessage('payment_ref is required').isLength({ max: 100 }),
  body('payer_name').trim().notEmpty().withMessage('payer_name is required').isLength({ max: 200 }),
  body('amount').notEmpty().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('payment_date').notEmpty().isISO8601().withMessage('payment_date must be a valid ISO date'),
  body('payment_method').optional().isIn(['Wire Transfer', 'ACH', 'Check', 'Credit Card']),
  body('reconciliation_status').optional().isIn(['reconciled', 'unreconciled', 'partial']),
];

const paymentUpdateRules = [
  body('payment_ref').optional().trim().isLength({ max: 100 }),
  body('payer_name').optional().trim().isLength({ max: 200 }),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('payment_date').optional().isISO8601().withMessage('payment_date must be a valid ISO date'),
  body('payment_method').optional().isIn(['Wire Transfer', 'ACH', 'Check', 'Credit Card']),
  body('reconciliation_status').optional().isIn(['reconciled', 'unreconciled', 'partial']),
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
    const { status } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (status) { where += ` AND reconciliation_status = $${idx++}`; params.push(status); }

    const [rows, countRow] = await Promise.all([
      db.query(`SELECT * FROM payments ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM payments ${where}`, params),
    ]);
    const total = parseInt(countRow.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

router.post('/', authenticateToken, paymentCreateRules, validate, async (req, res) => {
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

router.put('/:id', authenticateToken, paymentUpdateRules, validate, async (req, res) => {
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
