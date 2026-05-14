import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ai } from '../services/api';

export default function IntercompanyOptimizer() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await ai.intercompanyOptimizer();
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const matrix = result?.netting_matrix || [];

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Intercompany Settlement Optimizer</h1>
        <p style={{ color: '#94a3b8' }}>Minimize bank transfers between entities with AI netting recommendations.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <button onClick={run} disabled={loading} className="btn-primary">
          {loading ? 'Analyzing...' : 'Run Netting Analysis'}
        </button>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {result && (
        <>
          {/* Savings summary */}
          <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Transfers Eliminated</div>
              <div className="stat-value" style={{ color: '#22c55e' }}>{result.total_transfers_eliminated ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Estimated Savings</div>
              <div className="stat-value" style={{ color: '#60a5fa' }}>
                ${Number(result.total_savings_estimate || 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">FX + Wire Fees Saved</div>
              <div className="stat-value" style={{ color: '#a78bfa' }}>
                ${Number((result.savings_breakdown?.fx_fees || 0) + (result.savings_breakdown?.wire_fees || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Executive summary */}
          {result.summary && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Executive Summary</h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>{result.summary}</p>
            </div>
          )}

          {/* Netting matrix */}
          {matrix.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Netting Matrix</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12 }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>From Entity</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>To Entity</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Gross</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Net (after netting)</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Saving</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => {
                    const saving = Number(row.gross_amount || 0) - Number(row.net_amount || 0);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: 8 }}>{row.from_entity}</td>
                        <td style={{ padding: 8 }}>{row.to_entity}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#f87171' }}>${Number(row.gross_amount || 0).toLocaleString()}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#22c55e' }}>${Number(row.net_amount || 0).toLocaleString()}</td>
                        <td style={{ padding: 8, textAlign: 'right', color: '#60a5fa' }}>${saving.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Risk warnings */}
          {Array.isArray(result.risk_warnings) && result.risk_warnings.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 8, color: '#fbbf24' }}>Risk Warnings</h3>
              <ul style={{ paddingLeft: 20, color: '#fbbf24' }}>
                {result.risk_warnings.map((w, i) => <li key={i} style={{ marginBottom: 6 }}>{w}</li>)}
              </ul>
            </div>
          )}

          {result.raw && <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{result.raw}</pre>}
        </>
      )}
    </div>
  );
}
