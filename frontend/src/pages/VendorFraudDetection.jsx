import React, { useState } from 'react';
import AIResultDisplay from '../components/AIResultDisplay';

// Vendor fraud detection FE — POSTs JSON-formatted vendor/invoices/payment-history
// blobs to /api/ai/vendor-fraud-detection. 503 if OPENROUTER_API_KEY unset.
export default function VendorFraudDetection({ token }) {
  const [vendor, setVendor] = useState('{\n  "vendor_name": "Beta LLC",\n  "tax_id": "12-3456789",\n  "bank_account_last4": "9921",\n  "address": "100 Main St"\n}');
  const [recentInvoices, setRecentInvoices] = useState('[\n  { "invoice_number": "INV-200", "amount": 9999.00 },\n  { "invoice_number": "INV-201", "amount": 9999.00 }\n]');
  const [paymentHistory, setPaymentHistory] = useState('[\n  { "date": "2024-01-15", "amount": 5000 }\n]');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  function tryParse(s, fallback) { try { return JSON.parse(s); } catch (_) { return fallback; } }

  const run = async () => {
    setErr(null); setAiResult(null); setLoading(true);
    try {
      const body = {
        vendor: tryParse(vendor, {}),
        recentInvoices: tryParse(recentInvoices, []),
        paymentHistory: tryParse(paymentHistory, []),
      };
      const r = await fetch('/api/ai/vendor-fraud-detection', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) {
        setErr(r.status === 503 ? `AI unavailable: ${data.missing || 'OPENROUTER_API_KEY'} not set` : (data.error || `HTTP ${r.status}`));
      } else {
        setAiResult(data);
      }
    } catch (e) { setErr(String(e)); } finally { setLoading(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>AI Vendor Fraud Detection</h1></div>
      <div className="card" style={{ padding: 16 }}>
        <p style={{ marginTop: 0, color: '#555' }}>
          Score vendor fraud risk from profile, recent invoices, and payment history. Flags duplicate invoices, round-dollar
          patterns, escalating amounts, new bank account changes, and other anomalies.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label>Vendor JSON</label>
            <textarea rows={10} style={{ width: '100%', fontFamily: 'monospace' }} value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div>
            <label>Recent Invoices JSON</label>
            <textarea rows={10} style={{ width: '100%', fontFamily: 'monospace' }} value={recentInvoices} onChange={(e) => setRecentInvoices(e.target.value)} />
          </div>
          <div>
            <label>Payment History JSON</label>
            <textarea rows={10} style={{ width: '100%', fontFamily: 'monospace' }} value={paymentHistory} onChange={(e) => setPaymentHistory(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={run} disabled={loading}>{loading ? 'Scoring…' : 'Score Vendor Risk'}</button>
        </div>
        {err && <div style={{ color: '#b00020', marginTop: 12 }}>{err}</div>}
        {(loading || aiResult) && <AIResultDisplay loading={loading} result={aiResult} onClose={() => setAiResult(null)} />}
      </div>
    </div>
  );
}
