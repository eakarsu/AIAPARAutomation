import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ai } from '../services/api';

const sevColor = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export default function InvoiceAnomalyDetector() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detect = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const r = await ai.invoiceAnomaly();
      setReport(r);
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
        <h1>Invoice Anomaly Detector</h1>
        <p style={{ color: '#94a3b8' }}>
          Detect duplicates, amount spikes, and suspicious vendor patterns. Flags for manual review.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <button onClick={detect} disabled={loading} className="btn-primary">
          {loading ? 'Scanning invoices...' : 'Scan Recent Invoices'}
        </button>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {report && (
        <>
          {report.summary && (
            <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
              <div className="stat-card">
                <div className="stat-label">Reviewed</div>
                <div className="stat-value">{report.summary.total_reviewed || report.invoices_reviewed || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Anomalies found</div>
                <div className="stat-value" style={{ color: '#f87171' }}>{report.summary.anomalies_found || (report.anomalies?.length ?? 0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Risk score</div>
                <div className="stat-value" style={{ color: '#eab308' }}>{report.summary.risk_score ?? '—'}</div>
              </div>
            </div>
          )}

          {Array.isArray(report.anomalies) && report.anomalies.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Anomalies</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Invoice</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Severity</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Explanation</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.anomalies.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: 8 }}>{a.invoice_number || a.invoice_id || '—'}</td>
                      <td style={{ padding: 8 }}>{a.type}</td>
                      <td style={{ padding: 8, color: sevColor[a.severity] || '#cbd5e1', fontWeight: 600 }}>
                        {a.severity}
                      </td>
                      <td style={{ padding: 8 }}>{a.explanation}</td>
                      <td style={{ padding: 8, color: '#94a3b8' }}>{a.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.raw && (
            <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{report.raw}</pre>
          )}
        </>
      )}
    </div>
  );
}
