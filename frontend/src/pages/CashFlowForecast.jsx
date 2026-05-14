import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ai } from '../services/api';

const confColor = (conf) => {
  if (conf >= 0.8) return '#22c55e';
  if (conf >= 0.5) return '#eab308';
  return '#f87171';
};

const sevColor = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };

export default function CashFlowForecast() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    setForecast(null);
    try {
      const r = await ai.cashForecast(90);
      setForecast(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const weeks = forecast?.weekly_forecast || [];
  const maxAbs = weeks.length ? Math.max(...weeks.map(w => Math.abs(w.net || 0)), 1) : 1;

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Cash Flow Forecast</h1>
        <p style={{ color: '#94a3b8' }}>AI-powered 90-day cash flow prediction with weekly breakdowns and risk factors.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <button onClick={run} disabled={loading} className="btn-primary">
          {loading ? 'Generating forecast...' : 'Generate 90-Day Forecast'}
        </button>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {forecast && (
        <>
          {/* Summary cards */}
          {forecast.summary && (
            <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
              <div className="stat-card">
                <div className="stat-label">Expected Inflow</div>
                <div className="stat-value" style={{ color: '#22c55e', fontSize: 20 }}>
                  ${Number(forecast.summary.total_expected_inflow || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Expected Outflow</div>
                <div className="stat-value" style={{ color: '#f87171', fontSize: 20 }}>
                  ${Number(forecast.summary.total_expected_outflow || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net Position</div>
                <div className="stat-value" style={{ color: Number(forecast.summary.net_position) >= 0 ? '#22c55e' : '#f87171', fontSize: 20 }}>
                  ${Number(forecast.summary.net_position || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Collection Rate Est.</div>
                <div className="stat-value" style={{ color: '#60a5fa', fontSize: 20 }}>
                  {forecast.summary.collection_rate_estimate ?? '—'}%
                </div>
              </div>
            </div>
          )}

          {/* Weekly forecast bar chart */}
          {weeks.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 16 }}>Weekly Cash Flow (90 Days)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12 }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Week</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px' }}>Inflow</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px' }}>Outflow</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px' }}>Net</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', width: '35%' }}>Net bar</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px' }}>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((w, i) => {
                      const net = Number(w.net || 0);
                      const pct = Math.round((Math.abs(net) / maxAbs) * 100);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '7px 6px', fontSize: 12 }}>{w.week_start || w.week}</td>
                          <td style={{ padding: '7px 6px', textAlign: 'right', color: '#22c55e', fontSize: 12 }}>
                            ${Number(w.expected_inflow || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '7px 6px', textAlign: 'right', color: '#f87171', fontSize: 12 }}>
                            ${Number(w.expected_outflow || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 600, color: net >= 0 ? '#22c55e' : '#f87171', fontSize: 12 }}>
                            {net >= 0 ? '+' : ''}{net.toLocaleString()}
                          </td>
                          <td style={{ padding: '7px 6px' }}>
                            <div style={{ background: '#0f172a', borderRadius: 3, height: 10, position: 'relative' }}>
                              <div style={{
                                position: 'absolute', left: net >= 0 ? '50%' : `calc(50% - ${pct / 2}%)`,
                                width: `${pct / 2}%`, height: '100%', borderRadius: 3,
                                background: net >= 0 ? '#22c55e' : '#f87171',
                              }} />
                              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#334155' }} />
                            </div>
                          </td>
                          <td style={{ padding: '7px 6px', textAlign: 'right', fontSize: 12, color: confColor(w.confidence) }}>
                            {w.confidence != null ? `${Math.round(w.confidence * 100)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk factors */}
          {Array.isArray(forecast.risk_factors) && forecast.risk_factors.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Risk Factors</h3>
              {forecast.risk_factors.map((rf, i) => (
                <div key={i} style={{ padding: 12, marginBottom: 8, background: '#0f172a', borderRadius: 6, borderLeft: `3px solid ${sevColor[rf.severity] || '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ color: '#e2e8f0' }}>{rf.factor}</strong>
                    <span style={{ color: sevColor[rf.severity] || '#94a3b8', fontSize: 12, fontWeight: 600 }}>{rf.severity?.toUpperCase()}</span>
                  </div>
                  <p style={{ color: '#94a3b8', margin: '6px 0 0', fontSize: 13 }}>{rf.description}</p>
                  {rf.mitigation && <p style={{ color: '#60a5fa', margin: '4px 0 0', fontSize: 12 }}>Mitigation: {rf.mitigation}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {Array.isArray(forecast.recommendations) && forecast.recommendations.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Recommendations</h3>
              <ul style={{ paddingLeft: 20, color: '#cbd5e1' }}>
                {forecast.recommendations.map((r, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {forecast.raw && (
            <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{forecast.raw}</pre>
          )}
        </>
      )}
    </div>
  );
}
