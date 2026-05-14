const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const cashCreateRules = [
  body('receipt_ref').trim().notEmpty().withMessage('receipt_ref is required').isLength({ max: 100 }),
  body('customer_name').trim().notEmpty().withMessage('customer_name is required').isLength({ max: 200 }),
  body('received_amount').notEmpty().isFloat({ gt: 0 }).withMessage('received_amount must be a positive number'),
  body('receipt_date').notEmpty().isISO8601().withMessage('receipt_date must be a valid ISO date'),
  body('application_status').optional().isIn(['unapplied', 'partially_applied', 'fully_applied']),
  body('payment_method').optional().isIn(['Wire Transfer', 'ACH', 'Check', 'Credit Card', 'Other']),
];

const cashUpdateRules = [
  body('receipt_ref').optional().trim().isLength({ max: 100 }),
  body('customer_name').optional().trim().isLength({ max: 200 }),
  body('received_amount').optional().isFloat({ gt: 0 }),
  body('receipt_date').optional().isISO8601(),
  body('application_status').optional().isIn(['unapplied', 'partially_applied', 'fully_applied']),
  body('payment_method').optional().isIn(['Wire Transfer', 'ACH', 'Check', 'Credit Card', 'Other']),
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
    if (status) { where += ` AND application_status = $${idx++}`; params.push(status); }

    const [rows, countRow] = await Promise.all([
      db.query(`SELECT * FROM cash_applications ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM cash_applications ${where}`, params),
    ]);
    const total = parseInt(countRow.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
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

router.post('/', authenticateToken, cashCreateRules, validate, async (req, res) => {
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

router.put('/:id', authenticateToken, cashUpdateRules, validate, async (req, res) => {
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
