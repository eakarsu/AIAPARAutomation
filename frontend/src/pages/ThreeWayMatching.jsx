import React, { useState } from 'react';
import AIResultDisplay from '../components/AIResultDisplay';

// 3-way matching FE — POSTs JSON-formatted invoice/PO/receipt blobs to
// /api/ai/three-way-matching. Surfaces 503 if OPENROUTER_API_KEY is unset.
export default function ThreeWayMatching({ token }) {
  const [invoice, setInvoice] = useState('{\n  "invoice_number": "INV-1001",\n  "vendor_name": "Acme",\n  "amount": 1200.00,\n  "po_number": "PO-555"\n}');
  const [po, setPo] = useState('{\n  "po_number": "PO-555",\n  "amount": 1200.00,\n  "qty": 10\n}');
  const [receipt, setReceipt] = useState('{\n  "id": 9,\n  "qty_received": 10,\n  "po_number": "PO-555"\n}');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  function tryParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }

  const run = async () => {
    setErr(null); setAiResult(null); setLoading(true);
    try {
      const body = {
        invoice: tryParse(invoice),
        po: tryParse(po),
        receipt: tryParse(receipt),
      };
      const r = await fetch('/api/ai/three-way-matching', { method: 'POST', headers, body: JSON.stringify(body) });
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
      <div className="page-header"><h1>AI 3-Way Matching</h1></div>
      <div className="card" style={{ padding: 16 }}>
        <p style={{ marginTop: 0, color: '#555' }}>
          Compare an Invoice against its Purchase Order and Receipt. Returns a match status, variance %, discrepancies, and a recommended action.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label>Invoice JSON</label>
            <textarea rows={10} style={{ width: '100%', fontFamily: 'monospace' }} value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          </div>
          <div>
            <label>PO JSON</label>
            <textarea rows={10} style={{ width: '100%', fontFamily: 'monospace' }} value={po} onChange={(e) => setPo(e.target.value)} />
          </div>
          <div>
            <label>Receipt JSON</label>
            <textarea rows={10} style={{ width: '100%', fontFamily: 'monospace' }} value={receipt} onChange={(e) => setReceipt(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={run} disabled={loading}>{loading ? 'Analyzing…' : 'Run AI Match'}</button>
        </div>
        {err && <div style={{ color: '#b00020', marginTop: 12 }}>{err}</div>}
        {(loading || aiResult) && <AIResultDisplay loading={loading} result={aiResult} onClose={() => setAiResult(null)} />}
      </div>
    </div>
  );
}
