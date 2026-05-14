const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const contactCreateRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 200 }),
  body('email').optional().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('type').optional().isIn(['customer', 'vendor', 'both']),
  body('phone').optional().isLength({ max: 50 }),
  body('company').optional().isLength({ max: 200 }),
  body('credit_limit').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive', 'blocked']),
];

const contactUpdateRules = [
  body('name').optional().trim().isLength({ max: 200 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('type').optional().isIn(['customer', 'vendor', 'both']),
  body('phone').optional().isLength({ max: 50 }),
  body('company').optional().isLength({ max: 200 }),
  body('credit_limit').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive', 'blocked']),
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
    const { type, status, search } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    let idx = 1;
    if (type) { where += ` AND (type = $${idx} OR contact_type = $${idx})`; idx++; params.push(type); }
    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (search) { where += ` AND (name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx})`; idx++; params.push(`%${search}%`); }

    const [rows, countRow] = await Promise.all([
      db.query(`SELECT * FROM contacts ${where} ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM contacts ${where}`, params),
    ]);
    const total = parseInt(countRow.rows[0].count);
    res.json({ data: rows.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, contactCreateRules, validate, async (req, res) => {
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

router.put('/:id', authenticateToken, contactUpdateRules, validate, async (req, res) => {
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
