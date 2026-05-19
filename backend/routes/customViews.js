// Custom Views router — synthesized AP/AR data for the Custom Views ("Finance
// Views") page. Two VIZ endpoints (aging buckets + cashflow forecast) and two
// NON-VIZ endpoints (invoice PDF generation + approval workflow CRUD).
// All endpoints synthesize data deterministically so values are stable.

const express = require('express');
const PDFDocument = require('pdfkit');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// -----------------------------------------------------------------------------
// Helpers (deterministic synth)
// -----------------------------------------------------------------------------
function seeded(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) % 100000) / 100000;
  };
}

function money(n) {
  return Math.round(n * 100) / 100;
}

// -----------------------------------------------------------------------------
// VIZ 1: Invoice Aging Buckets Chart
//   GET /api/custom-views/aging-buckets
//   (legacy alias /aging-report kept for backward compat)
// -----------------------------------------------------------------------------
function buildAgingBuckets(scope) {
  const rng = seeded('aging-' + (scope || 'all'));
  const entities = [
    { name: 'Acme Industries', type: 'customer' },
    { name: 'Blue Harbor LLC', type: 'customer' },
    { name: 'Cedar Supply Co.', type: 'vendor' },
    { name: 'Delta Logistics', type: 'customer' },
    { name: 'Evergreen Foods', type: 'vendor' },
    { name: 'Fontaine Group', type: 'customer' },
    { name: 'Granite Materials', type: 'vendor' },
    { name: 'Harborline Ltd.', type: 'customer' },
  ];
  const rows = entities.map((e) => {
    const base = 4000 + rng() * 28000;
    const current = money(base * (0.35 + rng() * 0.2));
    const d1_30 = money(base * (0.18 + rng() * 0.15));
    const d31_60 = money(base * (0.1 + rng() * 0.12));
    const d61_90 = money(base * (0.05 + rng() * 0.08));
    const d90 = money(base * (0.03 + rng() * 0.07));
    const total = money(current + d1_30 + d31_60 + d61_90 + d90);
    return {
      entity: e.name,
      type: e.type,
      current,
      days_1_30: d1_30,
      days_31_60: d31_60,
      days_61_90: d61_90,
      days_over_90: d90,
      total,
    };
  });
  const buckets = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_over_90'];
  const totals = buckets.reduce((acc, b) => {
    acc[b] = money(rows.reduce((s, r) => s + r[b], 0));
    return acc;
  }, {});
  return {
    rows,
    bucket_totals: totals,
    grand_total: money(rows.reduce((s, r) => s + r.total, 0)),
    generated_at: new Date().toISOString(),
  };
}

router.get('/aging-buckets', authenticateToken, (req, res) => {
  res.json(buildAgingBuckets(req.query.scope));
});
// Legacy alias
router.get('/aging-report', authenticateToken, (req, res) => {
  res.json(buildAgingBuckets(req.query.scope));
});

// -----------------------------------------------------------------------------
// VIZ 2: Cashflow Forecast Line
//   GET /api/custom-views/cashflow-forecast?weeks=12
//   Returns a weekly projection of AR inflows, AP outflows and net cashflow,
//   suitable for rendering as a multi-series line chart.
// -----------------------------------------------------------------------------
router.get('/cashflow-forecast', authenticateToken, (req, res) => {
  const weeks = Math.max(4, Math.min(26, parseInt(req.query.weeks, 10) || 12));
  const rng = seeded('cashflow-' + weeks);
  const startingBalance = 250_000 + Math.floor(rng() * 100_000);
  let balance = startingBalance;
  const today = new Date();
  const series = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(today.getTime() + i * 7 * 86400000);
    // Inflows grow modestly; outflows are spikier
    const inflows = money(120_000 + Math.sin(i / 2) * 28_000 + (rng() - 0.5) * 25_000);
    const outflows = money(95_000 + Math.cos(i / 1.5) * 22_000 + (rng() - 0.5) * 30_000);
    const net = money(inflows - outflows);
    balance = money(balance + net);
    series.push({
      week_index: i,
      week_start: weekStart.toISOString().slice(0, 10),
      label: `W${i + 1}`,
      inflows_ar: inflows,
      outflows_ap: outflows,
      net_cashflow: net,
      projected_balance: balance,
    });
  }
  res.json({
    weeks,
    starting_balance: startingBalance,
    ending_balance: series[series.length - 1].projected_balance,
    min_balance: money(Math.min(...series.map((s) => s.projected_balance))),
    max_balance: money(Math.max(...series.map((s) => s.projected_balance))),
    total_inflows: money(series.reduce((s, w) => s + w.inflows_ar, 0)),
    total_outflows: money(series.reduce((s, w) => s + w.outflows_ap, 0)),
    series,
    generated_at: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// NON-VIZ 1: Invoice PDF Generation
//   GET /api/custom-views/invoice-pdf?invoice=INV-1042&vendor=Cedar%20Supply
// -----------------------------------------------------------------------------
router.get('/invoice-pdf', authenticateToken, (req, res) => {
  const invoiceNo = req.query.invoice || 'INV-' + (1000 + Math.floor(Math.random() * 9000));
  const vendor = req.query.vendor || 'Cedar Supply Co.';
  const customer = req.query.customer || 'Acme Industries';
  const rng = seeded(invoiceNo + vendor);

  const lineItems = Array.from({ length: 3 + Math.floor(rng() * 3) }, (_, i) => {
    const qty = 1 + Math.floor(rng() * 9);
    const unit = money(20 + rng() * 380);
    return {
      description: `Service / Item #${i + 1}`,
      qty,
      unit,
      total: money(qty * unit),
    };
  });
  const subtotal = money(lineItems.reduce((s, l) => s + l.total, 0));
  const tax = money(subtotal * 0.0825);
  const total = money(subtotal + tax);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).fillColor('#1f2937').text('INVOICE', { align: 'right' });
  doc.fontSize(10).fillColor('#6b7280').text(invoiceNo, { align: 'right' });
  doc.moveDown(1.5);

  doc.fontSize(12).fillColor('#111827').text('From:');
  doc.fontSize(10).fillColor('#374151').text(vendor);
  doc.text('123 Vendor Road, Suite 4');
  doc.text('Austin, TX 78701');
  doc.moveDown(0.8);

  doc.fontSize(12).fillColor('#111827').text('Bill To:');
  doc.fontSize(10).fillColor('#374151').text(customer);
  doc.text('AP Department');
  doc.text('500 Industry Way, Dallas, TX 75201');
  doc.moveDown(1);

  doc.fontSize(10).fillColor('#6b7280')
    .text(`Issue date: ${new Date().toLocaleDateString()}`)
    .text(`Due date: ${new Date(Date.now() + 30 * 86400000).toLocaleDateString()}`);
  doc.moveDown(1);

  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#111827');
  doc.text('Description', 50, tableTop);
  doc.text('Qty', 320, tableTop, { width: 50, align: 'right' });
  doc.text('Unit', 380, tableTop, { width: 70, align: 'right' });
  doc.text('Total', 460, tableTop, { width: 80, align: 'right' });
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#d1d5db').stroke();

  let y = tableTop + 25;
  lineItems.forEach((l) => {
    doc.fillColor('#374151').text(l.description, 50, y);
    doc.text(String(l.qty), 320, y, { width: 50, align: 'right' });
    doc.text('$' + l.unit.toFixed(2), 380, y, { width: 70, align: 'right' });
    doc.text('$' + l.total.toFixed(2), 460, y, { width: 80, align: 'right' });
    y += 18;
  });

  y += 10;
  doc.moveTo(360, y).lineTo(545, y).strokeColor('#d1d5db').stroke();
  y += 8;
  doc.fillColor('#111827');
  doc.text('Subtotal', 360, y, { width: 100, align: 'right' });
  doc.text('$' + subtotal.toFixed(2), 460, y, { width: 80, align: 'right' });
  y += 16;
  doc.text('Tax (8.25%)', 360, y, { width: 100, align: 'right' });
  doc.text('$' + tax.toFixed(2), 460, y, { width: 80, align: 'right' });
  y += 16;
  doc.fontSize(12).fillColor('#1d4ed8');
  doc.text('TOTAL', 360, y, { width: 100, align: 'right' });
  doc.text('$' + total.toFixed(2), 460, y, { width: 80, align: 'right' });

  doc.moveDown(4);
  doc.fontSize(9).fillColor('#6b7280').text(
    'Thank you for your business. Please remit payment within 30 days via ACH or check.',
    50,
    doc.y,
    { align: 'center', width: 495 }
  );

  doc.end();
});

// -----------------------------------------------------------------------------
// NON-VIZ 2: Approval Workflow Rules CRUD
//   GET    /api/custom-views/approval-workflow            → read all rules
//   POST   /api/custom-views/approval-workflow            → create new rule
//   PUT    /api/custom-views/approval-workflow/:id        → update a rule
//   DELETE /api/custom-views/approval-workflow/:id        → delete a rule
// In-memory store; reset on restart.
// -----------------------------------------------------------------------------
const defaultRules = [
  { id: 1, role: 'AP Clerk', threshold: 0, action: 'review_and_code', sla_hours: 8 },
  { id: 2, role: 'Department Manager', threshold: 1000, action: 'approve', sla_hours: 24 },
  { id: 3, role: 'Finance Director', threshold: 10000, action: 'approve', sla_hours: 48 },
  { id: 4, role: 'CFO', threshold: 50000, action: 'final_approve', sla_hours: 72 },
];
let workflowName = 'Standard Invoice Approval';
let workflowRules = JSON.parse(JSON.stringify(defaultRules));
let workflowUpdatedAt = new Date().toISOString();
let nextRuleId = workflowRules.length + 1;

function workflowSnapshot() {
  return {
    name: workflowName,
    steps: workflowRules,
    rules: workflowRules,
    updated_at: workflowUpdatedAt,
  };
}

function sanitizeRule(body, idOverride) {
  return {
    id: idOverride != null ? idOverride : (Number(body.id) || nextRuleId++),
    role: String(body.role || 'Reviewer').slice(0, 80),
    threshold: Number(body.threshold) || 0,
    action: String(body.action || 'approve').slice(0, 40),
    sla_hours: Number(body.sla_hours) || 24,
  };
}

router.get('/approval-workflow', authenticateToken, (req, res) => {
  res.json(workflowSnapshot());
});

router.post('/approval-workflow', authenticateToken, express.json(), (req, res) => {
  const body = req.body || {};
  // Two modes: bulk-replace (name + steps[]) or create-one (role/threshold/action)
  if (Array.isArray(body.steps)) {
    workflowName = String(body.name || workflowName).slice(0, 120);
    nextRuleId = 1;
    workflowRules = body.steps.map((s) => sanitizeRule(s, nextRuleId++));
    workflowUpdatedAt = new Date().toISOString();
    return res.json({ ok: true, workflow: workflowSnapshot() });
  }
  const created = sanitizeRule(body);
  workflowRules.push(created);
  workflowUpdatedAt = new Date().toISOString();
  res.status(201).json({ ok: true, rule: created, workflow: workflowSnapshot() });
});

router.put('/approval-workflow/:id', authenticateToken, express.json(), (req, res) => {
  const id = Number(req.params.id);
  const idx = workflowRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'rule not found' });
  workflowRules[idx] = sanitizeRule({ ...workflowRules[idx], ...(req.body || {}) }, id);
  workflowUpdatedAt = new Date().toISOString();
  res.json({ ok: true, rule: workflowRules[idx], workflow: workflowSnapshot() });
});

router.delete('/approval-workflow/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const before = workflowRules.length;
  workflowRules = workflowRules.filter((r) => r.id !== id);
  if (workflowRules.length === before) return res.status(404).json({ error: 'rule not found' });
  workflowUpdatedAt = new Date().toISOString();
  res.json({ ok: true, workflow: workflowSnapshot() });
});

module.exports = router;
