const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const dunningCreateRules = [
  body('customer_name').trim().notEmpty().withMessage('customer_name is required').isLength({ max: 200 }),
  body('customer_email').optional().isEmail().withMessage('customer_email must be valid').normalizeEmail(),
  body('amount_due').notEmpty().isFloat({ gt: 0 }).withMessage('amount_due must be a positive number'),
  body('days_overdue').optional().isInt({ min: 0 }),
  body('dunning_level').optional().isInt({ min: 1, max: 10 }),
  body('risk_score').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['active', 'resolved', 'escalated', 'legal', 'written_off']),
];

const dunningUpdateRules = [
  body('customer_name').optional().trim().isLength({ max: 200 }),
  body('customer_email').optional().isEmail().normalizeEmail(),
  body('amount_due').optional().isFloat({ gt: 0 }),
  body('days_overdue').optional().isInt({ min: 0 }),
  body('dunning_level').optional().isInt({ min: 1, max: 10 }),
  body('risk_score').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('status').optional().isIn(['active', 'resolved', 'escalated', 'legal', 'written_off']),
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
    const { status, risk } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (risk) { where += ` AND risk_score = $${idx++}`; params.push(risk); }

    const [rows, countRow] = await Promise.all([
      db.query(`SELECT * FROM dunning_records ${where} ORDER BY days_overdue DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM dunning_records ${where}`, params),
    ]);
    const total = parseInt(countRow.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM dunning_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, dunningCreateRules, validate, async (req, res) => {
  try {
    const { customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes } = req.body;
    const result = await db.query(
      `INSERT INTO dunning_records (customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level || 1, last_contact_date, next_action_date, status || 'active', contact_attempts || 0, risk_score || 'low', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, dunningUpdateRules, validate, async (req, res) => {
  try {
    const { customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes } = req.body;
    const result = await db.query(
      `UPDATE dunning_records SET customer_name=$1, customer_email=$2, invoice_number=$3, amount_due=$4, days_overdue=$5, dunning_level=$6, last_contact_date=$7, next_action_date=$8, status=$9, contact_attempts=$10, risk_score=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [customer_name, customer_email, invoice_number, amount_due, days_overdue, dunning_level, last_contact_date, next_action_date, status, contact_attempts, risk_score, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM dunning_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
