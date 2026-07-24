'use strict';

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

router.post('/invoice-readiness', authenticateToken, async (req, res) => {
  try {
    const baseUrl = process.env.OPENROUTER_BASE_URL;
    const model = process.env.OPENROUTER_MODEL;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (baseUrl !== 'https://openrouter.ai/api/v1' || !model || !apiKey) {
      return res.status(503).json({ error: 'Canonical OpenRouter configuration is required' });
    }
    const context = String(req.body?.context || 'Assess an invoice with a purchase-order amount mismatch for AP review readiness.').slice(0, 4000);
    const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an AP/AR controls analyst. Return a concise readiness assessment with discrepancies, evidence gaps, and safe next actions.' },
          { role: 'user', content: context },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    const provider = await providerResponse.json();
    if (!providerResponse.ok || provider.error) throw new Error(provider.error?.message || `OpenRouter HTTP ${providerResponse.status}`);
    const content = provider.choices?.[0]?.message?.content;
    if (!provider.id || typeof content !== 'string' || !content.trim()) throw new Error('OpenRouter returned an incomplete provider response');
    const receipt = { id: provider.id, model: provider.model || model, usage: provider.usage || null };
    const stored = await db.query(
      `INSERT INTO runtime_ai_results (user_id, feature, input, content, model, provider_receipt)
       VALUES ($1, 'invoice-readiness', $2, $3, $4, $5) RETURNING id, created_at`,
      [req.user.id, { context }, content, receipt.model, receipt]
    );
    res.json({ success: true, content, model: receipt.model, providerReceipt: receipt, resultId: stored.rows[0].id, persistedAt: stored.rows[0].created_at });
  } catch (error) {
    console.error('[runtime-ai] invoice-readiness failed:', error.message);
    res.status(502).json({ error: 'OpenRouter invoice readiness failed' });
  }
});

module.exports = router;
