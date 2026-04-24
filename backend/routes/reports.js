const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get comprehensive reports/analytics
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const [invoices, payments, dunning, cashApps, discounts, aging] = await Promise.all([
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE match_status = 'matched') as matched,
        COUNT(*) FILTER (WHERE match_status = 'partial_match') as partial,
        COUNT(*) FILTER (WHERE match_status = 'unmatched') as unmatched,
        COUNT(*) FILTER (WHERE match_status = 'pending') as pending,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COUNT(*) FILTER (WHERE due_date < NOW()) as overdue
      FROM invoices`),
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE reconciliation_status = 'reconciled') as reconciled,
        COUNT(*) FILTER (WHERE reconciliation_status = 'partial') as partial,
        COUNT(*) FILTER (WHERE reconciliation_status = 'unreconciled') as unreconciled,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(ABS(difference_amount)), 0) as total_difference
      FROM payments`),
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated,
        COUNT(*) FILTER (WHERE status = 'legal') as legal,
        COALESCE(SUM(amount_due), 0) as total_due,
        COALESCE(AVG(days_overdue), 0) as avg_days_overdue,
        COUNT(*) FILTER (WHERE risk_score = 'critical') as critical,
        COUNT(*) FILTER (WHERE risk_score = 'high') as high_risk
      FROM dunning_records`),
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE application_status = 'fully_applied') as fully_applied,
        COUNT(*) FILTER (WHERE application_status = 'partially_applied') as partially_applied,
        COUNT(*) FILTER (WHERE application_status = 'unapplied') as unapplied,
        COALESCE(SUM(received_amount), 0) as total_received,
        COALESCE(SUM(unapplied_amount), 0) as total_unapplied
      FROM cash_applications`),
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE capture_status = 'captured') as captured,
        COUNT(*) FILTER (WHERE capture_status = 'available') as available,
        COUNT(*) FILTER (WHERE capture_status = 'missed') as missed,
        COUNT(*) FILTER (WHERE capture_status = 'expiring_soon') as expiring_soon,
        COALESCE(SUM(potential_savings), 0) as total_savings,
        COALESCE(SUM(potential_savings) FILTER (WHERE capture_status = 'captured'), 0) as captured_savings,
        COALESCE(SUM(potential_savings) FILTER (WHERE capture_status = 'missed'), 0) as missed_savings
      FROM discounts`),
      db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE entity_type = 'customer') as customers,
        COUNT(*) FILTER (WHERE entity_type = 'vendor') as vendors,
        COALESCE(SUM(total_outstanding), 0) as total_outstanding,
        COALESCE(SUM(current_amount), 0) as total_current,
        COALESCE(SUM(days_1_30), 0) as total_1_30,
        COALESCE(SUM(days_31_60), 0) as total_31_60,
        COALESCE(SUM(days_61_90), 0) as total_61_90,
        COALESCE(SUM(days_over_90), 0) as total_over_90,
        COUNT(*) FILTER (WHERE risk_rating = 'high') as high_risk
      FROM aging_records`)
    ]);

    res.json({
      invoices: invoices.rows[0],
      payments: payments.rows[0],
      dunning: dunning.rows[0],
      cashApplications: cashApps.rows[0],
      discounts: discounts.rows[0],
      aging: aging.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trends data (monthly aggregation)
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const [invoiceTrends, paymentTrends] = await Promise.all([
      db.query(`SELECT
        TO_CHAR(invoice_date, 'YYYY-MM') as month,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM invoices
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
      ORDER BY month`),
      db.query(`SELECT
        TO_CHAR(payment_date, 'YYYY-MM') as month,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
      ORDER BY month`)
    ]);

    res.json({
      invoiceTrends: invoiceTrends.rows,
      paymentTrends: paymentTrends.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top vendors/customers
router.get('/top-entities', authenticateToken, async (req, res) => {
  try {
    const [topVendors, topCustomers] = await Promise.all([
      db.query(`SELECT vendor_name, COUNT(*) as invoice_count, COALESCE(SUM(amount), 0) as total_amount
        FROM invoices GROUP BY vendor_name ORDER BY total_amount DESC LIMIT 10`),
      db.query(`SELECT customer_name, COUNT(*) as record_count, COALESCE(SUM(amount_due), 0) as total_due
        FROM dunning_records GROUP BY customer_name ORDER BY total_due DESC LIMIT 10`)
    ]);

    res.json({
      topVendors: topVendors.rows,
      topCustomers: topCustomers.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
