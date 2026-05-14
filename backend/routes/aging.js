const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const agingCreateRules = [
  body('entity_name').trim().notEmpty().withMessage('entity_name is required').isLength({ max: 200 }),
  body('entity_type').notEmpty().isIn(['customer', 'vendor']).withMessage('entity_type must be customer or vendor'),
  body('total_outstanding').notEmpty().isFloat({ min: 0 }).withMessage('total_outstanding must be a non-negative number'),
  body('credit_limit').optional().isFloat({ min: 0 }),
  body('risk_rating').optional().isIn(['low', 'medium', 'high', 'critical']),
];

const agingUpdateRules = [
  body('entity_name').optional().trim().isLength({ max: 200 }),
  body('entity_type').optional().isIn(['customer', 'vendor']),
  body('total_outstanding').optional().isFloat({ min: 0 }),
  body('credit_limit').optional().isFloat({ min: 0 }),
  body('risk_rating').optional().isIn(['low', 'medium', 'high', 'critical']),
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
    const { entity_type, risk } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (entity_type) { where += ` AND entity_type = $${idx++}`; params.push(entity_type); }
    if (risk) { where += ` AND risk_rating = $${idx++}`; params.push(risk); }

    const [rows, countRow] = await Promise.all([
      db.query(`SELECT * FROM aging_records ${where} ORDER BY total_outstanding DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM aging_records ${where}`, params),
    ]);
    const total = parseInt(countRow.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM aging_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, agingCreateRules, validate, async (req, res) => {
  try {
    const { entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay } = req.body;
    const result = await db.query(
      `INSERT INTO aging_records (entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [entity_name, entity_type, total_outstanding, current_amount || 0, days_1_30 || 0, days_31_60 || 0, days_61_90 || 0, days_over_90 || 0, credit_limit, risk_rating || 'low', last_payment_date, avg_days_to_pay]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, agingUpdateRules, validate, async (req, res) => {
  try {
    const { entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay } = req.body;
    const result = await db.query(
      `UPDATE aging_records SET entity_name=$1, entity_type=$2, total_outstanding=$3, current_amount=$4, days_1_30=$5, days_31_60=$6, days_61_90=$7, days_over_90=$8, credit_limit=$9, risk_rating=$10, last_payment_date=$11, avg_days_to_pay=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [entity_name, entity_type, total_outstanding, current_amount, days_1_30, days_31_60, days_61_90, days_over_90, credit_limit, risk_rating, last_payment_date, avg_days_to_pay, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM aging_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
