const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

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

// GET /api/reports/invoices/pdf
router.get('/invoices/pdf', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT invoice_number, vendor_name, amount, due_date, match_status, invoice_date
       FROM invoices ORDER BY invoice_date DESC LIMIT 500`
    );
    const invoices = result.rows;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices-report.pdf"');
    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('Invoice Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Table header
    const colWidths = [90, 150, 80, 90, 90];
    const headers = ['Invoice #', 'Vendor', 'Amount', 'Due Date', 'Status'];
    const startX = 40;
    let y = doc.y;

    doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 20).fill('#2d5be3');
    doc.fill('white').fontSize(9).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 4, y + 5, { width: colWidths[i] - 8, lineBreak: false });
      x += colWidths[i];
    });

    // Table rows
    doc.fill('black').font('Helvetica').fontSize(8);
    let rowY = y + 22;
    let total = 0;
    invoices.forEach((inv, idx) => {
      if (rowY > 720) { doc.addPage(); rowY = 40; }
      if (idx % 2 === 0) doc.rect(startX, rowY, colWidths.reduce((a, b) => a + b, 0), 18).fill('#f0f4ff');
      doc.fill('black');
      const row = [
        inv.invoice_number || '',
        inv.vendor_name || '',
        `$${Number(inv.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
        inv.match_status || ''
      ];
      x = startX;
      row.forEach((cell, i) => {
        doc.text(String(cell), x + 4, rowY + 4, { width: colWidths[i] - 8, lineBreak: false });
        x += colWidths[i];
      });
      total += Number(inv.amount || 0);
      rowY += 20;
    });

    // Summary
    doc.moveDown(1).font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Invoices: ${invoices.length}   |   Total Amount: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, startX);

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/invoices/excel
router.get('/invoices/excel', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT invoice_number, vendor_name, amount, due_date, match_status, invoice_date, category, description
       FROM invoices ORDER BY invoice_date DESC LIMIT 500`
    );
    const invoices = result.rows;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AI AP/AR Automation';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Invoices');

    // Column definitions
    sheet.columns = [
      { header: 'Invoice #', key: 'invoice_number', width: 16 },
      { header: 'Vendor', key: 'vendor_name', width: 28 },
      { header: 'Amount ($)', key: 'amount', width: 16 },
      { header: 'Invoice Date', key: 'invoice_date', width: 16 },
      { header: 'Due Date', key: 'due_date', width: 16 },
      { header: 'Status', key: 'match_status', width: 16 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Description', key: 'description', width: 30 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D5BE3' } };
    headerRow.alignment = { horizontal: 'center' };

    // Add data rows
    let totalAmount = 0;
    invoices.forEach(inv => {
      const amt = Number(inv.amount || 0);
      totalAmount += amt;
      sheet.addRow({
        invoice_number: inv.invoice_number,
        vendor_name: inv.vendor_name,
        amount: amt,
        invoice_date: inv.invoice_date ? new Date(inv.invoice_date) : null,
        due_date: inv.due_date ? new Date(inv.due_date) : null,
        match_status: inv.match_status,
        category: inv.category,
        description: inv.description,
      });
    });

    // Format amount column as currency
    sheet.getColumn('amount').numFmt = '"$"#,##0.00';
    sheet.getColumn('invoice_date').numFmt = 'yyyy-mm-dd';
    sheet.getColumn('due_date').numFmt = 'yyyy-mm-dd';

    // Add summary row
    const summaryRowIdx = invoices.length + 3;
    sheet.getRow(invoices.length + 2).getCell(1).value = '';
    const summaryRow = sheet.getRow(summaryRowIdx);
    summaryRow.getCell(1).value = 'TOTAL';
    summaryRow.getCell(2).value = `${invoices.length} invoices`;
    summaryRow.getCell(3).value = totalAmount;
    summaryRow.getCell(3).numFmt = '"$"#,##0.00';
    summaryRow.font = { bold: true };
    summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

    // Borders on all data rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 1 && rowNumber <= invoices.length + 1) {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/cash-flow/pdf
router.get('/cash-flow/pdf', authenticateToken, async (req, res) => {
  try {
    const [inflow, outflow, monthly] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM payments WHERE reconciliation_status = 'reconciled'`),
      db.query(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM invoices WHERE match_status = 'matched'`),
      db.query(`
        SELECT TO_CHAR(payment_date, 'YYYY-MM') as month,
               COALESCE(SUM(amount), 0) as inflow
        FROM payments WHERE payment_date >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
        ORDER BY month
      `)
    ]);

    const totalInflow = Number(inflow.rows[0].total);
    const totalOutflow = Number(outflow.rows[0].total);
    const netCashFlow = totalInflow - totalOutflow;
    const months = monthly.rows;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cash-flow-report.pdf"');
    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('Cash Flow Summary Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary boxes
    const boxY = doc.y;
    const boxW = 150, boxH = 60, gap = 20, startX = 40;

    const boxes = [
      { label: 'Total Inflow', value: `$${totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#22c55e' },
      { label: 'Total Outflow', value: `$${totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#ef4444' },
      { label: 'Net Cash Flow', value: `$${netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: netCashFlow >= 0 ? '#3b82f6' : '#f97316' },
    ];
    boxes.forEach((b, i) => {
      const bx = startX + i * (boxW + gap);
      doc.rect(bx, boxY, boxW, boxH).fill(b.color);
      doc.fill('white').fontSize(9).font('Helvetica-Bold').text(b.label, bx + 8, boxY + 10, { width: boxW - 16 });
      doc.fontSize(13).text(b.value, bx + 8, boxY + 28, { width: boxW - 16 });
    });

    doc.fill('black').moveDown(5);

    // ASCII bar chart for monthly inflow
    if (months.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Monthly Inflow (Last 6 Months)', { underline: true });
      doc.moveDown(0.5);

      const maxVal = Math.max(...months.map(m => Number(m.inflow)), 1);
      const barMaxWidth = 300;

      months.forEach(m => {
        const val = Number(m.inflow);
        const barWidth = Math.round((val / maxVal) * barMaxWidth);
        const barY = doc.y;

        doc.fontSize(9).font('Helvetica').text(m.month, 40, barY, { width: 60, lineBreak: false });
        doc.rect(105, barY, barWidth, 12).fill('#2d5be3');
        doc.fill('black').text(`$${val.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, 105 + barWidth + 8, barY, { lineBreak: false });
        doc.moveDown(1.2);
      });
    }

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').text(`Reconciled payments: ${inflow.rows[0].count} | Matched invoices: ${outflow.rows[0].count}`);

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
