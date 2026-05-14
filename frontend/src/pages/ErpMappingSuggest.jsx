import React, { useState } from 'react';
import AIResultDisplay from '../components/AIResultDisplay';

// ERP mapping suggestion FE — POSTs target ERP + entity type to
// /api/ai/erp-mapping-suggest. Server introspects local schema if sourceFields
// is omitted. NEEDS-CREDS for actual ERP connectors — this is planning aid only.
export default function ErpMappingSuggest({ token }) {
  const [targetErp, setTargetErp] = useState('NetSuite');
  const [entityType, setEntityType] = useState('invoice');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const run = async () => {
    setErr(null); setAiResult(null); setLoading(true);
    try {
      const r = await fetch('/api/ai/erp-mapping-suggest', {
        method: 'POST', headers,
        body: JSON.stringify({ targetErp, entityType }),
      });
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
      <div className="page-header"><h1>AI ERP Mapping Suggestions</h1></div>
      <div className="card" style={{ padding: 16 }}>
        <p style={{ marginTop: 0, color: '#555' }}>
          Plan a field-to-field mapping from this app's schema to your target ERP's standard object. Returns a mapping table,
          unmapped fields, and required-field gaps. Actual ERP connectors are a separate (NEEDS-CREDS) backlog item.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Target ERP</label>
            <select value={targetErp} onChange={(e) => setTargetErp(e.target.value)} style={{ width: '100%' }}>
              <option>NetSuite</option>
              <option>SAP</option>
              <option>Oracle</option>
              <option>QuickBooks</option>
              <option>Microsoft Dynamics</option>
            </select>
          </div>
          <div>
            <label>Entity</label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ width: '100%' }}>
              <option value="invoice">Invoice</option>
              <option value="payment">Payment</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={run} disabled={loading}>{loading ? 'Generating…' : 'Suggest Mapping'}</button>
        </div>
        {err && <div style={{ color: '#b00020', marginTop: 12 }}>{err}</div>}
        {(loading || aiResult) && <AIResultDisplay loading={loading} result={aiResult} onClose={() => setAiResult(null)} />}
      </div>
    </div>
  );
}
