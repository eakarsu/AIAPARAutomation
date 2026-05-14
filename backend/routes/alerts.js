const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendPaymentDueAlert, sendOverdueAlert } = require('../services/emailService');

// Get all active alerts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const alerts = [];

    // Overdue invoices
    const overdueInvoices = await db.query(
      `SELECT invoice_number, vendor_name, amount, due_date
       FROM invoices WHERE due_date < NOW() AND match_status != 'matched'
       ORDER BY due_date ASC`
    );
    overdueInvoices.rows.forEach(inv => {
      const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `inv-${inv.invoice_number}`,
        type: 'overdue_invoice',
        severity: daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium',
        title: `Overdue Invoice ${inv.invoice_number}`,
        message: `Invoice from ${inv.vendor_name} for $${Number(inv.amount).toLocaleString()} is ${daysOverdue} days overdue`,
        date: inv.due_date,
        module: 'invoices'
      });
    });

    // Unreconciled payments
    const unreconciledPayments = await db.query(
      `SELECT payment_ref, payer_name, amount, payment_date
       FROM payments WHERE reconciliation_status = 'unreconciled'
       ORDER BY payment_date ASC`
    );
    unreconciledPayments.rows.forEach(pay => {
      const daysPending = Math.floor((Date.now() - new Date(pay.payment_date)) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `pay-${pay.payment_ref}`,
        type: 'unreconciled_payment',
        severity: daysPending > 30 ? 'high' : 'medium',
        title: `Unreconciled Payment ${pay.payment_ref}`,
        message: `Payment of $${Number(pay.amount).toLocaleString()} from ${pay.payer_name} pending for ${daysPending} days`,
        date: pay.payment_date,
        module: 'payments'
      });
    });

    // Critical dunning records
    const criticalDunning = await db.query(
      `SELECT customer_name, invoice_number, amount_due, days_overdue, risk_score, status
       FROM dunning_records WHERE risk_score IN ('critical', 'high') AND status != 'resolved'
       ORDER BY days_overdue DESC`
    );
    criticalDunning.rows.forEach(d => {
      alerts.push({
        id: `dun-${d.invoice_number}`,
        type: 'high_risk_dunning',
        severity: d.risk_score === 'critical' ? 'critical' : 'high',
        title: `${d.risk_score.toUpperCase()} Risk: ${d.customer_name}`,
        message: `$${Number(d.amount_due).toLocaleString()} overdue by ${d.days_overdue} days (Status: ${d.status})`,
        date: null,
        module: 'dunning'
      });
    });

    // Expiring discounts
    const expiringDiscounts = await db.query(
      `SELECT invoice_number, vendor_name, discount_amount, discount_deadline, potential_savings
       FROM discounts WHERE capture_status IN ('available', 'expiring_soon') AND discount_deadline >= NOW()
       ORDER BY discount_deadline ASC`
    );
    expiringDiscounts.rows.forEach(disc => {
      const daysLeft = Math.floor((new Date(disc.discount_deadline) - Date.now()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `disc-${disc.invoice_number}`,
        type: 'expiring_discount',
        severity: daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium',
        title: `Discount Expiring: ${disc.vendor_name}`,
        message: `Save $${Number(disc.potential_savings).toLocaleString()} on ${disc.invoice_number} - ${daysLeft} days left`,
        date: disc.discount_deadline,
        module: 'discounts'
      });
    });

    // Unapplied cash
    const unappliedCash = await db.query(
      `SELECT receipt_ref, customer_name, unapplied_amount, receipt_date
       FROM cash_applications WHERE application_status = 'unapplied' AND unapplied_amount > 0
       ORDER BY unapplied_amount DESC`
    );
    unappliedCash.rows.forEach(ca => {
      alerts.push({
        id: `ca-${ca.receipt_ref}`,
        type: 'unapplied_cash',
        severity: 'medium',
        title: `Unapplied Cash: ${ca.receipt_ref}`,
        message: `$${Number(ca.unapplied_amount).toLocaleString()} from ${ca.customer_name} needs application`,
        date: ca.receipt_date,
        module: 'cash-applications'
      });
    });

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/send-payment-due - send payment due reminders (3/7/14 day)
router.post('/send-payment-due', authenticateToken, async (req, res) => {
  const { invoice_id, recipient, days_until_due, send_email } = req.body;
  if (!invoice_id || !recipient) {
    return res.status(400).json({ error: 'invoice_id and recipient are required' });
  }
  try {
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = result.rows[0];
    const daysUntilDue = days_until_due || 7;

    if (send_email) {
      await sendPaymentDueAlert(invoice, recipient, daysUntilDue);
      return res.json({ message: `Payment due alert sent to ${recipient}`, days_until_due: daysUntilDue });
    }
    res.json({ message: 'Alert prepared (send_email was false)', invoice, days_until_due: daysUntilDue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alerts/send-overdue - send overdue escalation email
router.post('/send-overdue', authenticateToken, async (req, res) => {
  const { invoice_id, recipient, send_email } = req.body;
  if (!invoice_id || !recipient) {
    return res.status(400).json({ error: 'invoice_id and recipient are required' });
  }
  try {
    const result = await db.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = result.rows[0];
    const daysOverdue = invoice.due_date
      ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)))
      : 0;

    if (send_email) {
      await sendOverdueAlert(invoice, daysOverdue, recipient);
      return res.json({ message: `Overdue alert sent to ${recipient}`, days_overdue: daysOverdue });
    }
    res.json({ message: 'Alert prepared (send_email was false)', invoice, days_overdue: daysOverdue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
