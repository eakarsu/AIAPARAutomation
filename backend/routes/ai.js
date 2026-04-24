const express = require('express');
const router = express.Router();
const https = require('https');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

function callOpenRouter(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:5173',
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

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Invoice Matching AI
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

    res.json({
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payment Reconciliation AI
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

    res.json({
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dunning Optimization AI
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

    res.json({
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cash Application AI
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

    res.json({
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Discount Capture AI
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

    res.json({
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aging Analysis AI
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

    res.json({
      analysis: aiContent,
      model: response.model,
      usage: response.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
