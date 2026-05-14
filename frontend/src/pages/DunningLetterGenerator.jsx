import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ai, invoices as invoicesApi } from '../services/api';

export default function DunningLetterGenerator() {
  const [invoices, setInvoices] = useState([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [tone, setTone] = useState('friendly');
  const [language, setLanguage] = useState('English');
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    invoicesApi.listAll().then(setInvoices).catch(() => setInvoices([]));
  }, []);

  const generate = async () => {
    if (!invoiceId) { setError('Choose an invoice'); return; }
    setLoading(true);
    setError('');
    setStrategy(null);
    try {
      const r = await ai.dunningLetter({ invoice_id: Number(invoiceId), tone, language });
      setStrategy(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Dunning Letter Template Generator</h1>
        <p style={{ color: '#94a3b8' }}>
          AI writes a personalised, multi-touch dunning sequence for any overdue invoice.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1' }}>Invoice</label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
            >
              <option value="">— select —</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoice_number} — {i.vendor_name} — ${Number(i.amount).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1' }}>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}>
              <option value="friendly">Friendly</option>
              <option value="firm">Firm</option>
              <option value="legal">Legal</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1' }}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Portuguese</option>
            </select>
          </div>
          <button onClick={generate} disabled={loading} className="btn-primary">
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {strategy && (
        <div className="card">
          {strategy.risk_assessment && (
            <div style={{ marginBottom: 16, padding: 12, background: '#1e293b', borderRadius: 6 }}>
              <strong>Risk:</strong> {strategy.risk_assessment} {' | '}
              <strong>Recovery probability:</strong> {strategy.estimated_recovery_probability}%
              {strategy.escalation_recommendation && (
                <p style={{ marginTop: 8, color: '#cbd5e1' }}>{strategy.escalation_recommendation}</p>
              )}
            </div>
          )}
          {Array.isArray(strategy.messages) ? (
            strategy.messages.map((m, i) => (
              <div key={i} className="card" style={{ background: '#0f172a', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Day {m.day} — {m.tone}</strong>
                  <button
                    onClick={() => navigator.clipboard.writeText(`Subject: ${m.subject}\n\n${m.template}`)}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Subject:</strong> {m.subject}
                </div>
                <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{m.template}</pre>
              </div>
            ))
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{JSON.stringify(strategy, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
