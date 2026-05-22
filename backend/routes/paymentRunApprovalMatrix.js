const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { payment_runs: 8, approvals_pending: 14, blocked_vendors: 3, cash_reserved: 185000 },
    matrix: [
      { run: 'ACH-2026-05-22-AM', amount: 84000, approver: 'Controller', risk: 'low', status: 'ready' },
      { run: 'WIRE-APAC-0522', amount: 210000, approver: 'CFO', risk: 'high', status: 'vendor hold' },
      { run: 'CHECKS-0524', amount: 27500, approver: 'AP Manager', risk: 'medium', status: 'pending' },
    ],
  });
});

router.post('/route', (req, res) => {
  const { amount = 0, vendorRisk = 'low' } = req.body || {};
  const approver = amount > 100000 || vendorRisk === 'high' ? 'CFO' : amount > 25000 ? 'Controller' : 'AP Manager';
  res.json({ approver, policy: 'payment approval matrix', hold: vendorRisk === 'high' });
});

module.exports = router;
