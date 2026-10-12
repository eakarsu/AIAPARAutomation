const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

async function signIn(email, password) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !password || !await bcrypt.compare(password, user.password)) return null;
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role || 'ap_clerk', tenantId: user.tenant_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role || 'ap_clerk', tenantId: user.tenant_id } };
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const session = await signIn(email, password);
    if (!session) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/demo-login', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Demo login is unavailable.' });
  if (!process.env.DEMO_EMAIL || !process.env.DEMO_PASSWORD) return res.status(503).json({ error: 'Demo credentials are unavailable in this configuration.' });
  try {
    const session = await signIn(process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD);
    if (!session) return res.status(503).json({ error: 'The configured demo account is unavailable.' });
    res.json(session);
  } catch (_) {
    res.status(503).json({ error: 'Demo login is unavailable. Check the database connection.' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
