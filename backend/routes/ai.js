const express = require('express');
const router = express.Router();
const https = require('https');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ─── Ensure ai_results table exists ──────────────────────────────────────────
async function ensureAiResultsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id          SERIAL PRIMARY KEY,
      module      VARCHAR(100) NOT NULL,
      entity_id   INTEGER,
      model       VARCHAR(200),
      prompt_summary TEXT,
      result      JSONB,
      raw_text    TEXT,
      tokens_used INTEGER,
      created_by  INTEGER,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `);
}

// ─── parseAIJson ──────────────────────────────────────────────────────────────
function parseAIJson(text) {
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {} }
  return null;
}

// ─── callOpenRouter ───────────────────────────────────────────────────────────
function callOpenRouter(prompt, { structured = false } = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: structured ? 0.2 : 0.5,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
        'X-Title': 'AI AP/AR Automation',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('OpenRouter request timed out after 30 seconds'));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─── persist AI result ────────────────────────────────────────────────────────
async function saveAiResult({ module, entityId, model, promptSummary, result, rawText, tokensUsed, userId }) {
  await ensureAiResultsTable();
  const r = await db.query(
    `INSERT INTO ai_results (module, entity_id, model, prompt_summary, result, raw_text, tokens_used, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [module, entityId || null, model || null, promptSummary || null,
     JSON.stringify(result || {}), rawText || null, tokensUsed || null, userId || null]
  );
  return r.rows[0].id;
}

// ─── GET /api/ai/history ──────────────────────────────────────────────────────
router.get('/history', authenticateToken, async (req, res) => {
  try {
    await ensureAiResultsTable();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const module = req.query.module || null;

    const whereClauses = module ? 'WHERE module = $3' : '';
    const params = module ? [limit, offset, module] : [limit, offset];

    const [rows, countRow] = await Promise.all([
      db.query(
        `SELECT id, module, entity_id, model, prompt_summary, tokens_used, created_at
         FROM ai_results ${whereClauses} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      db.query(`SELECT COUNT(*) FROM ai_results ${whereClauses}`, module ? [module] : []),
    ]);

    const total = parseInt(countRow.rows[0].count);
    res.json({
      data: rows.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/history/:id ──────────────────────────────────────────────────
router.get('/history/:id', authenticateToken, async (req, res) => {
  try {
    await ensureAiResultsTable();
    const row = await db.query('SELECT * FROM ai_results WHERE id = $1', [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Invoice Matching AI ──────────────────────────────────────────────────────
router.post('/invoice-matching', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    let contextData;
    if (invoiceId) {
      const result = await db.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
      contextData = result.rows[0];
    } else {
      const result = await db.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 20');
      contextData = result.rows;
    }

    const prompt = `You are an AI AP/AR automation expert specializing in invoice matching. Analyze the following invoice data and provide:
1. **Match Analysis**: Assess the invoice-to-PO matching accuracy
2. **Discrepancies Found**: Identify any amount mismatches, missing PO numbers, or suspicious patterns
3. **Recommendations**: Suggest actions for unmatched or partially matched invoices
4. **Risk Assessment**: Rate the overall risk level and flag any potential fraud indicators
5. **Optimization Tips**: How to improve the matching process

Invoice Data:
${JSON.stringify(contextData, null, 2)}

Provide a detailed, actionable analysis with specific dollar amounts and percentages where applicable.`;

    const response = await callOpenRouter(prompt);
    const aiContent = response.choices?.[0]?.message?.content || 'No response generated';

    if (invoiceId) {
      await db.query('UPDATE invoices SET ai_notes = $1, updated_at = NOW() WHERE id = $2', [aiContent, invoiceId]);
    }

    const aiResultId = await saveAiResult({
      module: 'invoice-matching', entityId: invoiceId || null,
      model: response.model, promptSummary: `Invoice matching analysis${invoiceId ? ` for invoice ${invoiceId}` : ' (all)'}`,
      result: { analysis: aiContent }, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Payment Reconciliation AI ────────────────────────────────────────────────
router.post('/payment-reconciliation', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.body;
    let contextData;
    if (paymentId) {
      const result = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
      contextData = result.rows[0];
    } else {
      const result = await db.query('SELECT * FROM payments ORDER BY created_at DESC LIMIT 20');
      contextData = result.rows;
    }

    const prompt = `You are an AI payment reconciliation specialist. Analyze the following payment data and provide:
1. **Reconciliation Status Overview**: Summary of reconciled vs unreconciled payments
2. **Matching Suggestions**: For unreconciled payments, suggest potential invoice matches
3. **Discrepancy Analysis**: Explain payment differences and suggest resolutions
4. **Cash Flow Impact**: Assess the impact on cash flow of unreconciled items
5. **Action Items**: Priority-ordered list of actions to resolve outstanding items

Payment Data:
${JSON.stringify(contextData, null, 2)}

Provide specific, actionable recommendations with amounts and timelines.`;

    const response = await callOpenRouter(prompt);
    const aiContent = response.choices?.[0]?.message?.content || 'No response generated';

    if (paymentId) {
      await db.query('UPDATE payments SET ai_notes = $1, updated_at = NOW() WHERE id = $2', [aiContent, paymentId]);
    }

    const aiResultId = await saveAiResult({
      module: 'payment-reconciliation', entityId: paymentId || null,
      model: response.model, promptSummary: `Payment reconciliation${paymentId ? ` for payment ${paymentId}` : ' (all)'}`,
      result: { analysis: aiContent }, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dunning Optimization AI ──────────────────────────────────────────────────
router.post('/dunning-optimization', authenticateToken, async (req, res) => {
  try {
    const { dunningId } = req.body;
    let contextData;
    if (dunningId) {
      const result = await db.query('SELECT * FROM dunning_records WHERE id = $1', [dunningId]);
      contextData = result.rows[0];
    } else {
      const result = await db.query('SELECT * FROM dunning_records ORDER BY days_overdue DESC LIMIT 20');
      contextData = result.rows;
    }

    const prompt = `You are an AI dunning optimization specialist. Analyze the following overdue accounts and provide:
1. **Risk Prioritization**: Rank accounts by collection priority considering amount, age, and risk
2. **Communication Strategy**: Recommend optimal dunning message tone and timing for each level
3. **Escalation Recommendations**: Which accounts should be escalated and to what level
4. **Payment Plan Suggestions**: Propose payment arrangements for high-risk accounts
5. **Recovery Forecast**: Estimate likelihood of collection for each account
6. **Process Improvements**: Suggestions to reduce DSO and improve collection rates

Dunning Records:
${JSON.stringify(contextData, null, 2)}

Provide specific strategies with expected outcomes and timelines.`;

    const response = await callOpenRouter(prompt);
    const aiContent = response.choices?.[0]?.message?.content || 'No response generated';

    if (dunningId) {
      await db.query('UPDATE dunning_records SET ai_recommendation = $1, updated_at = NOW() WHERE id = $2', [aiContent, dunningId]);
    }

    const aiResultId = await saveAiResult({
      module: 'dunning-optimization', entityId: dunningId || null,
      model: response.model, promptSummary: `Dunning optimization${dunningId ? ` for record ${dunningId}` : ' (all)'}`,
      result: { analysis: aiContent }, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cash Application AI ──────────────────────────────────────────────────────
router.post('/cash-application', authenticateToken, async (req, res) => {
  try {
    const { cashAppId } = req.body;
    let contextData;
    if (cashAppId) {
      const result = await db.query('SELECT * FROM cash_applications WHERE id = $1', [cashAppId]);
      contextData = result.rows[0];
    } else {
      const result = await db.query('SELECT * FROM cash_applications ORDER BY created_at DESC LIMIT 20');
      contextData = result.rows;
    }

    const prompt = `You are an AI cash application specialist. Analyze the following receipt data and provide:
1. **Application Suggestions**: For unapplied receipts, suggest matching invoices and customers
2. **Overpayment/Underpayment Analysis**: Identify and explain payment discrepancies
3. **Customer Pattern Analysis**: Identify payment behavior patterns
4. **Process Efficiency**: Rate the current cash application efficiency and suggest improvements
5. **Remittance Parsing**: Extract useful information from remittance details
6. **Action Items**: Priority list for resolving unapplied cash

Cash Application Data:
${JSON.stringify(contextData, null, 2)}

Provide specific matching recommendations with confidence levels.`;

    const response = await callOpenRouter(prompt);
    const aiContent = response.choices?.[0]?.message?.content || 'No response generated';

    if (cashAppId) {
      await db.query('UPDATE cash_applications SET ai_suggestion = $1, updated_at = NOW() WHERE id = $2', [aiContent, cashAppId]);
    }

    const aiResultId = await saveAiResult({
      module: 'cash-application', entityId: cashAppId || null,
      model: response.model, promptSummary: `Cash application${cashAppId ? ` for record ${cashAppId}` : ' (all)'}`,
      result: { analysis: aiContent }, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Discount Capture AI ──────────────────────────────────────────────────────
router.post('/discount-capture', authenticateToken, async (req, res) => {
  try {
    const { discountId } = req.body;
    let contextData;
    if (discountId) {
      const result = await db.query('SELECT * FROM discounts WHERE id = $1', [discountId]);
      contextData = result.rows[0];
    } else {
      const result = await db.query('SELECT * FROM discounts ORDER BY discount_deadline ASC LIMIT 20');
      contextData = result.rows;
    }

    const prompt = `You are an AI discount capture optimization specialist. Analyze the following discount opportunities and provide:
1. **Savings Summary**: Total potential savings, captured vs missed
2. **Priority Actions**: Which discounts to capture immediately (sorted by deadline and savings)
3. **ROI Analysis**: Cost of early payment vs discount benefit for each opportunity
4. **Cash Flow Impact**: Assess how early payments affect working capital
5. **Vendor Negotiation Tips**: Suggest better discount terms to negotiate
6. **Process Optimization**: How to improve discount capture rate

Discount Data:
${JSON.stringify(contextData, null, 2)}

Provide specific dollar amounts for potential savings and clear prioritization.`;

    const response = await callOpenRouter(prompt);
    const aiContent = response.choices?.[0]?.message?.content || 'No response generated';

    if (discountId) {
      await db.query('UPDATE discounts SET ai_recommendation = $1, updated_at = NOW() WHERE id = $2', [aiContent, discountId]);
    }

    const aiResultId = await saveAiResult({
      module: 'discount-capture', entityId: discountId || null,
      model: response.model, promptSummary: `Discount capture${discountId ? ` for discount ${discountId}` : ' (all)'}`,
      result: { analysis: aiContent }, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Aging Analysis AI ────────────────────────────────────────────────────────
router.post('/aging-analysis', authenticateToken, async (req, res) => {
  try {
    const { agingId } = req.body;
    let contextData;
    if (agingId) {
      const result = await db.query('SELECT * FROM aging_records WHERE id = $1', [agingId]);
      contextData = result.rows[0];
    } else {
      const result = await db.query('SELECT * FROM aging_records ORDER BY total_outstanding DESC LIMIT 20');
      contextData = result.rows;
    }

    const prompt = `You are an AI aging analysis specialist. Analyze the following AR/AP aging data and provide:
1. **Portfolio Health Score**: Overall assessment of the aging portfolio
2. **High-Risk Accounts**: Identify accounts approaching or exceeding credit limits
3. **Trend Analysis**: Payment behavior trends and DSO analysis
4. **Concentration Risk**: Identify over-reliance on specific customers/vendors
5. **Reserve Recommendations**: Suggest bad debt reserve amounts based on aging buckets
6. **Collection Strategy**: Prioritized actions for each aging bucket
7. **Benchmark Comparison**: How these metrics compare to industry standards

Aging Data:
${JSON.stringify(contextData, null, 2)}

Provide detailed analysis with specific amounts, percentages, and actionable recommendations.`;

    const response = await callOpenRouter(prompt);
    const aiContent = response.choices?.[0]?.message?.content || 'No response generated';

    if (agingId) {
      await db.query('UPDATE aging_records SET ai_analysis = $1, updated_at = NOW() WHERE id = $2', [aiContent, agingId]);
    }

    const aiResultId = await saveAiResult({
      module: 'aging-analysis', entityId: agingId || null,
      model: response.model, promptSummary: `Aging analysis${agingId ? ` for record ${agingId}` : ' (all)'}`,
      result: { analysis: aiContent }, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dunning Strategy AI ──────────────────────────────────────────────────────
router.post('/dunning-strategy', authenticateToken, async (req, res) => {
  try {
    const { invoice_id, tone = 'friendly', language = 'English' } = req.body;
    if (!invoice_id) return res.status(400).json({ error: 'invoice_id is required' });

    const invoiceResult = await db.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
    if (invoiceResult.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = invoiceResult.rows[0];

    const historyResult = await db.query(`
      SELECT
        COUNT(*) as total_invoices,
        COUNT(*) FILTER (WHERE due_date < NOW() AND match_status != 'matched') as late_payments,
        AVG(EXTRACT(DAY FROM (NOW() - due_date))) FILTER (WHERE due_date < NOW() AND match_status != 'matched') as avg_days_late
      FROM invoices WHERE vendor_name = $1
    `, [invoice.vendor_name]);
    const history = historyResult.rows[0];

    const prompt = `You are an accounts receivable specialist. Design a dunning communication strategy for the following invoice and customer.
Tone preference: ${tone}
Language: ${language}

Invoice Details:
${JSON.stringify(invoice, null, 2)}

Customer Payment History for "${invoice.vendor_name}":
- Total invoices: ${history.total_invoices}
- Late payments: ${history.late_payments}
- Average days late: ${Math.round(Number(history.avg_days_late) || 0)} days

Design a multi-touch dunning strategy in ${language} with a ${tone} tone. Return ONLY a valid JSON object with this exact structure:
{
  "messages": [
    { "day": <number>, "tone": "friendly|firm|legal", "subject": "<email subject>", "template": "<full email template>" }
  ],
  "escalation_recommendation": "<recommendation text>",
  "risk_assessment": "<low|medium|high|critical>",
  "estimated_recovery_probability": <0-100>
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let strategy = parseAIJson(aiContent);
    if (!strategy) strategy = { raw: aiContent };

    await db.query(`
      CREATE TABLE IF NOT EXISTS dunning_strategies (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER,
        strategy JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const saved = await db.query(
      'INSERT INTO dunning_strategies (invoice_id, strategy) VALUES ($1, $2) RETURNING id',
      [invoice_id, JSON.stringify(strategy)]
    );

    const aiResultId = await saveAiResult({
      module: 'dunning-strategy', entityId: invoice_id,
      model: response.model, promptSummary: `Dunning strategy for invoice ${invoice_id} (tone: ${tone}, lang: ${language})`,
      result: strategy, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      strategy_id: saved.rows[0].id,
      ai_result_id: aiResultId,
      invoice_id,
      ...strategy,
      model: response.model,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cash Flow Forecast AI ────────────────────────────────────────────────────
router.post('/cash-flow-forecast', authenticateToken, async (req, res) => {
  try {
    const patterns = await db.query(`
      SELECT
        TO_CHAR(invoice_date, 'YYYY-MM') as month,
        COUNT(*) as invoice_count,
        COALESCE(SUM(amount), 0) as expected_amount,
        COUNT(*) FILTER (WHERE match_status = 'matched') as paid_count,
        COALESCE(SUM(amount) FILTER (WHERE match_status = 'matched'), 0) as actual_paid,
        AVG(EXTRACT(DAY FROM (NOW() - due_date))) FILTER (WHERE due_date < NOW() AND match_status != 'matched') as avg_days_overdue
      FROM invoices
      WHERE invoice_date >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
      ORDER BY month
    `);

    const upcomingInvoices = await db.query(`
      SELECT invoice_number, vendor_name, amount, due_date, match_status
      FROM invoices WHERE due_date >= NOW() AND due_date <= NOW() + INTERVAL '90 days'
      ORDER BY due_date ASC
    `);

    const prompt = `You are a financial analyst specializing in accounts payable/receivable cash flow forecasting.

Last 6 months payment patterns:
${JSON.stringify(patterns.rows, null, 2)}

Upcoming invoices (next 90 days):
${JSON.stringify(upcomingInvoices.rows, null, 2)}

Predict the next 90 days cash flow with weekly breakdowns. Return ONLY a valid JSON object with this exact structure:
{
  "weekly_forecast": [
    { "week": "<YYYY-Www>", "week_start": "<YYYY-MM-DD>", "expected_inflow": <number>, "expected_outflow": <number>, "net": <number>, "confidence": <0-1> }
  ],
  "risk_factors": [
    { "factor": "<name>", "severity": "low|medium|high", "description": "<text>", "mitigation": "<text>" }
  ],
  "summary": { "total_expected_inflow": <number>, "total_expected_outflow": <number>, "net_position": <number>, "collection_rate_estimate": <0-100> },
  "recommendations": ["<recommendation>"]
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let forecast = parseAIJson(aiContent);
    if (!forecast) forecast = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'cash-flow-forecast', entityId: null,
      model: response.model, promptSummary: 'Cash flow forecast (90 days)',
      result: forecast, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...forecast,
      model: response.model,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Invoice Anomaly Detection AI ─────────────────────────────────────────────
router.post('/detect-anomalies', authenticateToken, async (req, res) => {
  try {
    const { invoice_ids } = req.body;
    let invoices;

    if (invoice_ids && Array.isArray(invoice_ids) && invoice_ids.length > 0) {
      const result = await db.query(
        'SELECT * FROM invoices WHERE id = ANY($1) ORDER BY invoice_date DESC',
        [invoice_ids]
      );
      invoices = result.rows;
    } else {
      const result = await db.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
      invoices = result.rows;
    }

    const prompt = `You are a financial fraud detection and anomaly specialist. Analyze the following invoices and identify statistical outliers, duplicate vendors, unusual payment terms, and suspicious patterns.

Invoice Data (${invoices.length} invoices):
${JSON.stringify(invoices, null, 2)}

Identify anomalies and return ONLY a valid JSON object with this exact structure:
{
  "anomalies": [
    {
      "invoice_id": <id or null>,
      "invoice_number": "<number>",
      "type": "amount_spike|duplicate_vendor|unusual_payment_terms|suspicious_pattern|data_quality",
      "severity": "low|medium|high|critical",
      "explanation": "<detailed explanation>",
      "recommended_action": "<action to take>"
    }
  ],
  "summary": {
    "total_reviewed": <number>,
    "anomalies_found": <number>,
    "risk_score": <0-100>,
    "overall_assessment": "<text>"
  },
  "patterns": ["<observed pattern>"]
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let result = parseAIJson(aiContent);
    if (!result) result = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'detect-anomalies', entityId: null,
      model: response.model, promptSummary: `Anomaly detection on ${invoices.length} invoices`,
      result, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      invoices_reviewed: invoices.length,
      ...result,
      model: response.model,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vendor Payment Health Score ──────────────────────────────────────────────
router.post('/vendor-health', authenticateToken, async (req, res) => {
  try {
    const { vendorId } = req.body;
    let vendorData;
    if (vendorId) {
      const r = await db.query('SELECT * FROM contacts WHERE id = $1', [vendorId]);
      vendorData = r.rows[0];
    }
    const invoices = await db.query(
      vendorId
        ? 'SELECT * FROM invoices WHERE vendor_name = (SELECT name FROM contacts WHERE id = $1) ORDER BY invoice_date DESC LIMIT 50'
        : 'SELECT vendor_name, COUNT(*) as cnt, SUM(amount) as total, AVG(EXTRACT(DAY FROM (NOW() - due_date))) as avg_overdue FROM invoices GROUP BY vendor_name ORDER BY total DESC LIMIT 25',
      vendorId ? [vendorId] : []
    );

    const prompt = `You are a vendor relationship analytics expert. Score each vendor's payment health.

Vendor data:
${JSON.stringify({ vendor: vendorData, invoices: invoices.rows }, null, 2)}

Return ONLY a valid JSON object with this structure:
{
  "vendors": [
    {
      "name": "<vendor name>",
      "health_score": <0-100>,
      "on_time_payment_pct": <0-100>,
      "early_pay_discounts_captured": <number>,
      "total_spend": <number>,
      "reliability_rating": "A|B|C|D|F",
      "recommendation": "strengthen|maintain|review|sunset",
      "notes": "<brief explanation>"
    }
  ],
  "top_3_reliable": ["<vendor name>"],
  "improvement_actions": ["<action>"],
  "summary": "<1-paragraph executive summary>"
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let result = parseAIJson(aiContent);
    if (!result) result = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'vendor-health', entityId: vendorId || null,
      model: response.model, promptSummary: `Vendor health${vendorId ? ` for vendor ${vendorId}` : ' (all)'}`,
      result, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...result,
      // keep analysis field for backward-compat
      analysis: result.summary || result.raw || aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Customer Credit Limit Advisor ────────────────────────────────────────────
router.post('/credit-advisor', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.body;
    const customers = await db.query(
      customerId
        ? 'SELECT * FROM contacts WHERE id = $1'
        : "SELECT * FROM contacts WHERE type = 'customer' OR contact_type = 'customer' LIMIT 25",
      customerId ? [customerId] : []
    );
    const aging = await db.query('SELECT * FROM aging_records ORDER BY total_outstanding DESC LIMIT 25').catch(() => ({ rows: [] }));

    const prompt = `You are a credit risk specialist. Analyze customer AR aging and payment patterns to recommend credit limit adjustments.

Data:
${JSON.stringify({ customers: customers.rows, aging: aging.rows }, null, 2)}

Return ONLY a valid JSON object with this structure:
{
  "recommendations": [
    {
      "customer_name": "<name>",
      "current_credit_limit": <number or null>,
      "suggested_credit_limit": <number>,
      "action": "increase|decrease|freeze|maintain",
      "default_risk_pct": <0-100>,
      "payment_behavior_score": <0-100>,
      "rationale": "<brief explanation>",
      "risk_level": "low|medium|high|critical"
    }
  ],
  "summary": "<1-paragraph executive summary>",
  "high_risk_customers": ["<name>"]
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let result = parseAIJson(aiContent);
    if (!result) result = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'credit-advisor', entityId: customerId || null,
      model: response.model, promptSummary: `Credit advisor${customerId ? ` for customer ${customerId}` : ' (all)'}`,
      result, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...result,
      analysis: result.summary || result.raw || aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Intercompany Settlement Optimizer ───────────────────────────────────────
router.post('/intercompany-optimizer', authenticateToken, async (req, res) => {
  try {
    const invoices = await db.query(
      "SELECT * FROM invoices WHERE category ILIKE '%intercompany%' OR vendor_name ILIKE '%subsidiary%' OR vendor_name ILIKE '%entity%' ORDER BY amount DESC LIMIT 50"
    );
    const fallback = invoices.rows.length === 0
      ? (await db.query('SELECT * FROM invoices ORDER BY amount DESC LIMIT 25')).rows
      : invoices.rows;

    const prompt = `You are a treasury optimization expert focusing on intercompany netting.
Analyze the open invoices between corporate entities and recommend a netting plan that minimizes bank transfers.

Invoices:
${JSON.stringify(fallback, null, 2)}

Return ONLY a valid JSON object with this structure:
{
  "netting_matrix": [
    { "from_entity": "<name>", "to_entity": "<name>", "gross_amount": <number>, "net_amount": <number>, "invoices_included": [<id>] }
  ],
  "total_transfers_eliminated": <number>,
  "total_savings_estimate": <number>,
  "savings_breakdown": { "fx_fees": <number>, "wire_fees": <number>, "other": <number> },
  "risk_warnings": ["<warning>"],
  "summary": "<executive summary>"
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let result = parseAIJson(aiContent);
    if (!result) result = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'intercompany-optimizer', entityId: null,
      model: response.model, promptSummary: 'Intercompany netting optimization',
      result, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...result,
      analysis: result.summary || result.raw || aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tax Compliance Validator ─────────────────────────────────────────────────
router.post('/tax-compliance', authenticateToken, async (req, res) => {
  try {
    const { jurisdiction = 'US' } = req.body;
    const invoices = await db.query('SELECT * FROM invoices ORDER BY invoice_date DESC LIMIT 30');
    const prompt = `You are a tax compliance expert. Validate the following invoices against ${jurisdiction} tax rules (sales tax / VAT / GST thresholds, withholding requirements, deduction eligibility, and 1099/equivalent reporting).

Invoices:
${JSON.stringify(invoices.rows, null, 2)}

Return ONLY a valid JSON object with this structure:
{
  "results": [
    {
      "invoice_id": <id>,
      "invoice_number": "<number>",
      "compliance_status": "compliant|warning|violation",
      "rule_cited": "<specific rule or regulation>",
      "remediation": "<action to take>"
    }
  ],
  "summary": {
    "total_reviewed": <number>,
    "compliant": <number>,
    "warnings": <number>,
    "violations": <number>
  },
  "jurisdiction": "${jurisdiction}",
  "executive_summary": "<paragraph>"
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let result = parseAIJson(aiContent);
    if (!result) result = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'tax-compliance', entityId: null,
      model: response.model, promptSummary: `Tax compliance validation (${jurisdiction})`,
      result, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...result,
      analysis: result.executive_summary || result.raw || aiContent,
      model: response.model,
      jurisdiction,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Discount Optimization Dashboard ─────────────────────────────────────────
router.post('/discount-dashboard', authenticateToken, async (req, res) => {
  try {
    const discounts = await db.query('SELECT * FROM discounts ORDER BY discount_deadline ASC LIMIT 100').catch(() => ({ rows: [] }));
    const captured = discounts.rows.filter((d) => d.status === 'captured' || d.captured || d.capture_status === 'captured');
    const missed = discounts.rows.filter((d) => d.status === 'missed' || d.missed || d.capture_status === 'missed');
    const pending = discounts.rows.filter((d) => d.capture_status === 'available' || d.capture_status === 'expiring_soon' || (!d.status && !d.capture_status));

    const totalCaptured = captured.reduce((s, d) => s + Number(d.discount_amount || d.potential_savings || 0), 0);
    const totalMissed = missed.reduce((s, d) => s + Number(d.discount_amount || d.potential_savings || 0), 0);
    const totalPending = pending.reduce((s, d) => s + Number(d.discount_amount || d.potential_savings || 0), 0);
    const captureRate = captured.length + missed.length > 0
      ? (captured.length / (captured.length + missed.length)) * 100 : 0;

    const prompt = `You are a working-capital optimizer. Given these discount capture metrics, write an executive summary and strategic recommendations to maximize savings vs industry benchmark (~80% capture rate).

Current capture rate: ${captureRate.toFixed(1)}%
Captured: $${totalCaptured.toFixed(2)} (${captured.length} discounts)
Missed: $${totalMissed.toFixed(2)} (${missed.length} discounts)
Pending: $${totalPending.toFixed(2)} (${pending.length} discounts)

Pending opportunities:
${JSON.stringify(pending.slice(0, 20), null, 2)}

Return ONLY a valid JSON object:
{
  "executive_summary": "<1-paragraph summary>",
  "gap_to_benchmark": <number (80 - current_rate)>,
  "recommendations": [
    { "priority": "high|medium|low", "action": "<action>", "expected_savings": <number>, "timeline": "<timeframe>" }
  ],
  "quick_wins": ["<discount invoice numbers to pay today>"]
}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let aiResult = parseAIJson(aiContent);
    if (!aiResult) aiResult = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'discount-dashboard', entityId: null,
      model: response.model, promptSummary: `Discount dashboard (capture rate ${captureRate.toFixed(1)}%)`,
      result: aiResult, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      metrics: {
        captured: { count: captured.length, amount: totalCaptured },
        missed: { count: missed.length, amount: totalMissed },
        pending: { count: pending.length, amount: totalPending },
        capture_rate: captureRate,
      },
      ...aiResult,
      analysis: aiResult.executive_summary || aiResult.raw || aiContent,
      model: response.model,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper: 503 short-circuit when OPENROUTER_API_KEY is missing ─────────────
// ENV VARS used by these AI routes:
//   - OPENROUTER_API_KEY (required) — OpenRouter bearer token
//   - OPENROUTER_MODEL   (optional) — e.g. anthropic/claude-3-5-sonnet-20241022
//   - CLIENT_URL         (optional) — Referer header
function requireOpenRouterKey(res) {
  const k = process.env.OPENROUTER_API_KEY;
  // Treat common placeholder strings as "unset" to avoid leaking 500s.
  const placeholders = [
    'your_openrouter_api_key_here',
    'your-openrouter-api-key-here',
    'your-openrouter-key-here',
    'your_openrouter_key_here',
    'replace-me',
    'changeme',
  ];
  if (!k || placeholders.includes(k) || k.startsWith('your-') || k.startsWith('your_')) {
    res.status(503).json({ error: 'AI service unavailable', missing: 'OPENROUTER_API_KEY' });
    return false;
  }
  return true;
}

// ─── Ensure additive new tables (TOO-RISKY items implemented as additive stubs) ───
async function ensureApply5Tables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS three_way_match_runs (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER,
      po_number  VARCHAR(100),
      receipt_id INTEGER,
      result     JSONB,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS vendor_fraud_scores (
      id SERIAL PRIMARY KEY,
      vendor_id   INTEGER,
      vendor_name VARCHAR(200),
      score       NUMERIC,
      indicators  JSONB,
      result      JSONB,
      created_by  INTEGER,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `);
}

// ─── 3-way matching (Invoice ↔ PO ↔ Receipt) ──────────────────────────────────
// TOO-RISKY originally (OCR + parser); apply pass 5 implements text-only AI
// reasoner over caller-provided invoice / PO / receipt JSON. No OCR.
router.post('/three-way-matching', authenticateToken, async (req, res) => {
  try {
    if (!requireOpenRouterKey(res)) return;
    await ensureApply5Tables();
    const { invoice, po, receipt, invoiceId } = req.body || {};

    let invoiceData = invoice;
    if (!invoiceData && invoiceId) {
      const r = await db.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]).catch(() => ({ rows: [] }));
      invoiceData = r.rows[0] || null;
    }

    const prompt = `You are an AP automation 3-way-matching engine. Compare Invoice vs Purchase Order vs Receipt and return ONLY a JSON object:
{
  "match_status": "matched|partial|unmatched|exception",
  "amount_variance_pct": <number>,
  "qty_variance_pct": <number>,
  "discrepancies": [{ "field": "<name>", "invoice_value": "<v>", "po_value": "<v>", "receipt_value": "<v>", "severity": "low|medium|high" }],
  "auto_post_recommended": <bool>,
  "manual_review_required": <bool>,
  "rationale": "<short>",
  "next_actions": ["<action>"]
}

Invoice: ${JSON.stringify(invoiceData || {}, null, 2).slice(0, 4000)}
PO: ${JSON.stringify(po || {}, null, 2).slice(0, 4000)}
Receipt: ${JSON.stringify(receipt || {}, null, 2).slice(0, 4000)}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let parsed = parseAIJson(aiContent);
    if (!parsed) parsed = { raw: aiContent };

    await db.query(
      `INSERT INTO three_way_match_runs (invoice_id, po_number, receipt_id, result, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [invoiceData?.id || invoiceId || null, po?.po_number || null, receipt?.id || null,
       JSON.stringify(parsed), req.user?.id || null]
    ).catch(() => {});

    const aiResultId = await saveAiResult({
      module: 'three-way-matching', entityId: invoiceData?.id || invoiceId || null,
      model: response.model, promptSummary: '3-way matching analysis',
      result: parsed, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...parsed,
      analysis: parsed.rationale || parsed.raw || aiContent,
      model: response.model,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vendor fraud detection (additive stub, text-only AI scoring) ────────────
// TOO-RISKY originally — implemented as additive scoring over caller payload.
router.post('/vendor-fraud-detection', authenticateToken, async (req, res) => {
  try {
    if (!requireOpenRouterKey(res)) return;
    await ensureApply5Tables();
    const { vendor, recentInvoices, paymentHistory, vendorId } = req.body || {};

    let vendorData = vendor;
    if (!vendorData && vendorId) {
      const r = await db.query('SELECT * FROM contacts WHERE id = $1', [vendorId]).catch(() => ({ rows: [] }));
      vendorData = r.rows[0] || null;
    }

    const prompt = `You are an AP fraud detection analyst. Given vendor profile, recent invoices, and payment history, score fraud risk and identify suspicious indicators. Return ONLY JSON:
{
  "vendor_name": "<name>",
  "fraud_risk_score": <0-100>,
  "risk_level": "low|medium|high|critical",
  "indicators": [{ "indicator": "<name>", "evidence": "<text>", "severity": "low|medium|high" }],
  "anomalies": [{ "type": "duplicate_invoice|round_dollar|new_bank|escalating_amounts|other", "detail": "<text>" }],
  "recommended_actions": ["<action>"],
  "investigation_priority": "low|medium|high|urgent",
  "summary": "<short>"
}

Vendor: ${JSON.stringify(vendorData || {}, null, 2).slice(0, 3000)}
Recent Invoices: ${JSON.stringify(recentInvoices || [], null, 2).slice(0, 4000)}
Payment History: ${JSON.stringify(paymentHistory || [], null, 2).slice(0, 4000)}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let parsed = parseAIJson(aiContent);
    if (!parsed) parsed = { raw: aiContent };

    await db.query(
      `INSERT INTO vendor_fraud_scores (vendor_id, vendor_name, score, indicators, result, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [vendorData?.id || vendorId || null, vendorData?.name || vendorData?.vendor_name || null,
       parsed.fraud_risk_score || null, JSON.stringify(parsed.indicators || []),
       JSON.stringify(parsed), req.user?.id || null]
    ).catch(() => {});

    const aiResultId = await saveAiResult({
      module: 'vendor-fraud-detection', entityId: vendorData?.id || vendorId || null,
      model: response.model, promptSummary: 'Vendor fraud risk scoring',
      result: parsed, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...parsed,
      analysis: parsed.summary || parsed.raw || aiContent,
      model: response.model,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Multi-currency FX exposure (NEEDS-PRODUCT-DECISION) ──────────────────────
// PRODUCT-DECISION: Use static-table-style FX rates supplied by the caller in the
// request body (`rates`) or fall back to a simple identity (1.0) hint. We do NOT
// call any external FX API in this pass — that would be NEEDS-CREDS. The AI
// returns hedging recommendations as advice, not policy, with a configurable
// reporting currency (default USD).
router.post('/multi-currency-fx', authenticateToken, async (req, res) => {
  try {
    if (!requireOpenRouterKey(res)) return;
    const { reportingCurrency = 'USD', rates = {}, exposures = null } = req.body || {};

    let exposureData = exposures;
    if (!exposureData) {
      // Pull recent invoices grouped by currency code if present
      const r = await db.query(
        `SELECT COALESCE(currency_code, 'USD') AS currency,
                COUNT(*) AS count,
                SUM(COALESCE(total_amount, amount, 0)) AS total
         FROM invoices
         GROUP BY COALESCE(currency_code, 'USD')`
      ).catch(() => ({ rows: [] }));
      exposureData = r.rows;
    }

    const prompt = `You are a treasury / FX risk analyst. Given exposures by currency and provided FX rates relative to ${reportingCurrency}, summarize FX exposure, hedging recommendations, and net-position risks. Return ONLY JSON:
{
  "reporting_currency": "${reportingCurrency}",
  "total_exposure_${reportingCurrency.toLowerCase()}": <number>,
  "by_currency": [{ "currency": "USD", "amount_local": 0, "amount_reporting": 0, "share_pct": 0 }],
  "net_position": "<long|short|balanced>",
  "hedging_recommendations": [{ "action": "<action>", "rationale": "<text>", "priority": "low|medium|high" }],
  "scenario_analysis": [{ "scenario": "<usd+5%>", "impact_reporting": <number> }],
  "summary": "<short>"
}

Reporting currency: ${reportingCurrency}
FX rates (currency -> ${reportingCurrency}): ${JSON.stringify(rates || {}, null, 2)}
Exposures: ${JSON.stringify(exposureData || [], null, 2).slice(0, 4000)}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let parsed = parseAIJson(aiContent);
    if (!parsed) parsed = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'multi-currency-fx', entityId: null,
      model: response.model, promptSummary: `FX exposure (${reportingCurrency})`,
      result: parsed, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...parsed,
      analysis: parsed.summary || parsed.raw || aiContent,
      model: response.model,
      reportingCurrency,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ERP mapping suggestion (MECHANICAL helper for ERP integrations backlog) ──
// PRODUCT-DECISION: We don't call ERP APIs (NEEDS-CREDS). Instead we suggest a
// field-to-field mapping plan from the project's invoice schema to a target ERP
// (SAP/Oracle/NetSuite/QuickBooks). This is a planning/aid endpoint; actual
// connectors are still backlog.
router.post('/erp-mapping-suggest', authenticateToken, async (req, res) => {
  try {
    if (!requireOpenRouterKey(res)) return;
    const { targetErp = 'NetSuite', entityType = 'invoice', sourceFields = null, targetFields = null } = req.body || {};

    let srcFields = sourceFields;
    if (!srcFields) {
      // Introspect column names from `invoices` table
      const r = await db.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_name = $1 ORDER BY ordinal_position`,
        [entityType === 'invoice' ? 'invoices' : entityType === 'payment' ? 'payments' : 'invoices']
      ).catch(() => ({ rows: [] }));
      srcFields = r.rows;
    }

    const prompt = `You are an ERP integration architect. Suggest a field mapping from the source (${entityType}) schema to ${targetErp}'s standard ${entityType} object. Return ONLY JSON:
{
  "target_erp": "${targetErp}",
  "entity": "${entityType}",
  "mappings": [{ "source_field": "<name>", "target_field": "<name>", "transform": "<none|format|lookup|composite>", "notes": "<text>", "confidence": "low|medium|high" }],
  "unmapped_source_fields": ["<name>"],
  "missing_required_target_fields": ["<name>"],
  "open_questions": ["<text>"],
  "implementation_notes": "<text>"
}

Source fields: ${JSON.stringify(srcFields || [], null, 2).slice(0, 4000)}
Target hints: ${JSON.stringify(targetFields || [], null, 2).slice(0, 2000)}`;

    const response = await callOpenRouter(prompt, { structured: true });
    const aiContent = response.choices?.[0]?.message?.content || '{}';
    let parsed = parseAIJson(aiContent);
    if (!parsed) parsed = { raw: aiContent };

    const aiResultId = await saveAiResult({
      module: 'erp-mapping-suggest', entityId: null,
      model: response.model, promptSummary: `ERP mapping ${entityType} -> ${targetErp}`,
      result: parsed, rawText: aiContent,
      tokensUsed: response.usage?.total_tokens, userId: req.user?.id,
    });

    res.json({
      ai_result_id: aiResultId,
      ...parsed,
      analysis: parsed.implementation_notes || parsed.raw || aiContent,
      model: response.model,
      targetErp,
      entityType,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
