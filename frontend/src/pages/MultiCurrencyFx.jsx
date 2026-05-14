import React, { useState } from 'react';
import AIResultDisplay from '../components/AIResultDisplay';

// Multi-currency FX exposure FE — POSTs reportingCurrency + provided rate map.
// PRODUCT-DECISION: rates are passed in by user (no live FX API in this pass).
export default function MultiCurrencyFx({ token }) {
  const [reportingCurrency, setReportingCurrency] = useState('USD');
  const [rates, setRates] = useState('{\n  "USD": 1.0,\n  "EUR": 1.07,\n  "GBP": 1.25,\n  "JPY": 0.0067\n}');
  const [exposures, setExposures] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  function tryParse(s, fallback) { try { return JSON.parse(s); } catch (_) { return fallback; } }

  const run = async () => {
    setErr(null); setAiResult(null); setLoading(true);
    try {
      const body = {
        reportingCurrency: reportingCurrency || 'USD',
        rates: tryParse(rates, {}),
        exposures: exposures.trim() ? tryParse(exposures, null) : null,
      };
      const r = await fetch('/api/ai/multi-currency-fx', { method: 'POST', headers, body: JSON.stringify(body) });
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
      <div className="page-header"><h1>AI Multi-Currency FX Exposure</h1></div>
      <div className="card" style={{ padding: 16 }}>
        <p style={{ marginTop: 0, color: '#555' }}>
          Summarize FX exposures across currencies, compute net positions, and recommend hedging actions. Provide rate map
          relative to your reporting currency. If exposures are blank, the server will aggregate from your invoices table.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: 12 }}>
          <div>
            <label>Reporting currency</label>
            <input type="text" value={reportingCurrency} onChange={(e) => setReportingCurrency(e.target.value.toUpperCase())} style={{ width: '100%' }} />
          </div>
          <div>
            <label>FX rates JSON (currency &rarr; reporting)</label>
            <textarea rows={8} style={{ width: '100%', fontFamily: 'monospace' }} value={rates} onChange={(e) => setRates(e.target.value)} />
          </div>
          <div>
            <label>Exposures JSON (optional, leave blank to aggregate from DB)</label>
            <textarea rows={8} style={{ width: '100%', fontFamily: 'monospace' }} value={exposures} onChange={(e) => setExposures(e.target.value)} placeholder='[{"currency":"EUR","amount":50000}]' />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={run} disabled={loading}>{loading ? 'Analyzing…' : 'Analyze FX'}</button>
        </div>
        {err && <div style={{ color: '#b00020', marginTop: 12 }}>{err}</div>}
        {(loading || aiResult) && <AIResultDisplay loading={loading} result={aiResult} onClose={() => setAiResult(null)} />}
      </div>
    </div>
  );
}
