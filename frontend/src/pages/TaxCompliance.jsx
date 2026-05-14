import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ai } from '../services/api';

const statusColor = { compliant: '#22c55e', warning: '#eab308', violation: '#ef4444' };
const statusBg = { compliant: '#14532d', warning: '#713f12', violation: '#7f1d1d' };

export default function TaxCompliance() {
  const [jurisdiction, setJurisdiction] = useState('US');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await ai.taxCompliance(jurisdiction);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const results = result?.results || [];
  const summary = result?.summary || {};

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Tax Compliance Validator</h1>
        <p style={{ color: '#94a3b8' }}>Validate invoices against tax rules and flag compliance issues.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1' }}>Jurisdiction</label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              style={{ padding: 10, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
            >
              <option value="US">United States</option>
              <option value="EU">European Union</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="IN">India</option>
            </select>
          </div>
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? 'Validating...' : 'Validate Invoices'}
          </button>
        </div>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {result && (
        <>
          {/* Summary */}
          {Object.keys(summary).length > 0 && (
            <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
              <div className="stat-card">
                <div className="stat-label">Reviewed</div>
                <div className="stat-value">{summary.total_reviewed || results.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Compliant</div>
                <div className="stat-value" style={{ color: '#22c55e' }}>{summary.compliant || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Warnings</div>
                <div className="stat-value" style={{ color: '#eab308' }}>{summary.warnings || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Violations</div>
                <div className="stat-value" style={{ color: '#ef4444' }}>{summary.violations || 0}</div>
              </div>
            </div>
          )}

          {/* Executive summary */}
          {result.executive_summary && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Assessment</h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>{result.executive_summary}</p>
            </div>
          )}

          {/* Per-invoice results */}
          {results.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Invoice Results</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12 }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Invoice #</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Rule Cited</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Remediation</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: 8, fontWeight: 600, color: '#60a5fa' }}>{r.invoice_number || r.invoice_id}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          color: statusColor[r.compliance_status] || '#94a3b8',
                          background: statusBg[r.compliance_status] || '#1e293b',
                        }}>
                          {r.compliance_status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 8, fontSize: 12, color: '#94a3b8' }}>{r.rule_cited}</td>
                      <td style={{ padding: 8, fontSize: 12, color: '#cbd5e1' }}>{r.remediation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.raw && <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', marginTop: 12 }}>{result.raw}</pre>}
        </>
      )}
    </div>
  );
}
