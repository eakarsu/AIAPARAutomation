import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AIResultDisplay from '../components/AIResultDisplay';
import { ai, contacts } from '../services/api';

const actionColor = { increase: '#22c55e', decrease: '#f87171', freeze: '#ef4444', maintain: '#60a5fa' };
const riskColor = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };

export default function CreditAdvisor() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    contacts.customers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await ai.creditAdvisor(selected ? Number(selected) : null);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const recs = result?.recommendations || [];

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Customer Credit Limit Advisor</h1>
        <p style={{ color: '#94a3b8' }}>
          Predict customer default risk and recommend credit limit adjustments based on payment history.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1' }}>Customer (optional)</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
            >
              <option value="">All customers (top 25)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.contact_name}</option>
              ))}
            </select>
          </div>
          <button onClick={runAnalysis} disabled={loading} className="btn-primary">
            {loading ? 'Analyzing...' : 'Get Credit Recommendations'}
          </button>
        </div>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {loading && (
        <div className="ai-result-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is analyzing credit data...</span></div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary */}
          {result.summary && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Executive Summary</h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>{result.summary}</p>
            </div>
          )}

          {/* High-risk alert */}
          {result.high_risk_customers?.length > 0 && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid #ef4444' }}>
              <h3 style={{ color: '#ef4444', marginBottom: 8 }}>High-Risk Customers</h3>
              <ul style={{ paddingLeft: 20, color: '#fca5a5' }}>
                {result.high_risk_customers.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {/* Recommendations table */}
          {recs.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Credit Limit Recommendations</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12 }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Customer</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Current Limit</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Suggested Limit</th>
                    <th style={{ textAlign: 'center', padding: 8 }}>Action</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Default Risk</th>
                    <th style={{ textAlign: 'center', padding: 8 }}>Risk Level</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {recs.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{r.customer_name}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#94a3b8' }}>
                        {r.current_credit_limit != null ? `$${Number(r.current_credit_limit).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                        ${Number(r.suggested_credit_limit || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: actionColor[r.action] || '#94a3b8' }}>
                          {r.action?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: r.default_risk_pct >= 50 ? '#f87171' : '#94a3b8' }}>
                        {r.default_risk_pct != null ? `${r.default_risk_pct}%` : '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: riskColor[r.risk_level] || '#94a3b8' }}>
                          {r.risk_level?.toUpperCase() || '—'}
                        </span>
                      </td>
                      <td style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{r.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fallback free-text */}
          {recs.length === 0 && result.analysis && (
            <AIResultDisplay result={result} loading={false} />
          )}
        </>
      )}
    </div>
  );
}
