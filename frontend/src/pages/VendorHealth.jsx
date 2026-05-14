import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AIResultDisplay from '../components/AIResultDisplay';
import { ai, contacts } from '../services/api';

const ratingColor = { A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444' };
const recColor = { strengthen: '#22c55e', maintain: '#60a5fa', review: '#eab308', sunset: '#ef4444' };

export default function VendorHealth() {
  const [vendors, setVendors] = useState([]);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    contacts.vendors().then(setVendors).catch(() => setVendors([]));
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await ai.vendorHealth(selected ? Number(selected) : null);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const vendorList = result?.vendors || [];

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Vendor Payment Health Score</h1>
        <p style={{ color: '#94a3b8' }}>
          AI scores each vendor by on-time payment %, discounts captured, and reliability rating.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1' }}>Vendor (optional — leave blank to analyze all)</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
            >
              <option value="">All vendors (top 25 by spend)</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name || v.contact_name}</option>
              ))}
            </select>
          </div>
          <button onClick={runAnalysis} disabled={loading} className="btn-primary">
            {loading ? 'Analyzing...' : 'Run Health Analysis'}
          </button>
        </div>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {loading && (
        <div className="ai-result-container">
          <div className="ai-loading"><div className="spinner"></div><span>AI is analyzing vendor data...</span></div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Structured vendor table */}
          {vendorList.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Vendor Health Scores</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12 }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Vendor</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Score</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>On-Time %</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Total Spend</th>
                    <th style={{ textAlign: 'center', padding: 8 }}>Rating</th>
                    <th style={{ textAlign: 'center', padding: 8 }}>Action</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorList.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{v.name}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        <span style={{ color: v.health_score >= 80 ? '#22c55e' : v.health_score >= 60 ? '#eab308' : '#f87171', fontWeight: 700 }}>
                          {v.health_score ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#94a3b8' }}>{v.on_time_payment_pct != null ? `${v.on_time_payment_pct}%` : '—'}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#94a3b8' }}>
                        {v.total_spend != null ? `$${Number(v.total_spend).toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: ratingColor[v.reliability_rating] || '#94a3b8' }}>
                          {v.reliability_rating || '—'}
                        </span>
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: recColor[v.recommendation] || '#94a3b8' }}>
                          {v.recommendation?.toUpperCase() || '—'}
                        </span>
                      </td>
                      <td style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{v.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top reliable vendors & improvement actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {result.top_3_reliable?.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: 8, color: '#22c55e' }}>Top 3 Reliable Vendors</h3>
                <ol style={{ paddingLeft: 20, color: '#cbd5e1' }}>
                  {result.top_3_reliable.map((v, i) => <li key={i} style={{ marginBottom: 6 }}>{v}</li>)}
                </ol>
              </div>
            )}
            {result.improvement_actions?.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: 8, color: '#60a5fa' }}>Improvement Actions</h3>
                <ul style={{ paddingLeft: 20, color: '#cbd5e1' }}>
                  {result.improvement_actions.map((a, i) => <li key={i} style={{ marginBottom: 6 }}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Fallback: free-text */}
          {vendorList.length === 0 && result.analysis && (
            <AIResultDisplay result={result} loading={false} />
          )}
        </>
      )}
    </div>
  );
}
