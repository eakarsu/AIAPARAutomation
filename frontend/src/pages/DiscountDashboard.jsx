import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ai } from '../services/api';

const prioColor = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };

export default function DiscountDashboard() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await ai.discountDashboard();
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const metrics = result?.metrics || {};
  const captureRate = metrics.capture_rate || 0;
  const benchmark = 80;
  const gap = result?.gap_to_benchmark ?? (benchmark - captureRate);
  const recs = result?.recommendations || [];
  const quickWins = result?.quick_wins || [];

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Discount Opportunity Dashboard</h1>
        <p style={{ color: '#94a3b8' }}>Executive view of discount capture rate vs 80% benchmark with AI-driven quick wins.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <button onClick={run} disabled={loading} className="btn-primary">
          {loading ? 'Analyzing discounts...' : 'Analyze Discount Performance'}
        </button>
        {error && <div style={{ color: '#f87171', marginTop: 12 }}>{error}</div>}
      </div>

      {result && (
        <>
          {/* KPI cards */}
          <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Capture Rate</div>
              <div className="stat-value" style={{ color: captureRate >= benchmark ? '#22c55e' : '#f87171', fontSize: 28 }}>
                {captureRate.toFixed(1)}%
              </div>
              <div className="stat-change" style={{ color: '#94a3b8', fontSize: 11 }}>Benchmark: {benchmark}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Captured ($)</div>
              <div className="stat-value" style={{ color: '#22c55e', fontSize: 20 }}>
                ${Number(metrics.captured?.amount || 0).toLocaleString()}
              </div>
              <div className="stat-change" style={{ color: '#94a3b8' }}>{metrics.captured?.count || 0} discounts</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Missed ($)</div>
              <div className="stat-value" style={{ color: '#f87171', fontSize: 20 }}>
                ${Number(metrics.missed?.amount || 0).toLocaleString()}
              </div>
              <div className="stat-change" style={{ color: '#94a3b8' }}>{metrics.missed?.count || 0} discounts</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending ($)</div>
              <div className="stat-value" style={{ color: '#fbbf24', fontSize: 20 }}>
                ${Number(metrics.pending?.amount || 0).toLocaleString()}
              </div>
              <div className="stat-change" style={{ color: '#94a3b8' }}>{metrics.pending?.count || 0} discounts</div>
            </div>
          </div>

          {/* Gauge bar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Capture Rate vs Benchmark</span>
              <span style={{ color: gap > 0 ? '#f87171' : '#22c55e', fontSize: 13, fontWeight: 600 }}>
                {gap > 0 ? `${gap.toFixed(1)}% below benchmark` : 'Above benchmark'}
              </span>
            </div>
            <div style={{ background: '#1e293b', borderRadius: 6, height: 24, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${Math.min(captureRate, 100)}%`, height: '100%', background: captureRate >= benchmark ? '#22c55e' : '#2d5be3', transition: 'width 0.5s' }} />
              <div style={{ position: 'absolute', left: `${benchmark}%`, top: 0, bottom: 0, width: 2, background: '#f87171' }} />
              <span style={{ position: 'absolute', right: 8, top: 3, fontSize: 12, color: 'white', fontWeight: 600 }}>
                {captureRate.toFixed(1)}% / {benchmark}% target
              </span>
            </div>
          </div>

          {/* Executive summary */}
          {result.executive_summary && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Executive Summary</h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>{result.executive_summary}</p>
            </div>
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Strategic Recommendations</h3>
              {recs.map((r, i) => (
                <div key={i} style={{ padding: 12, marginBottom: 8, background: '#0f172a', borderRadius: 6, borderLeft: `3px solid ${prioColor[r.priority] || '#94a3b8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{r.action}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.expected_savings != null && (
                        <span style={{ color: '#22c55e', fontSize: 12 }}>${Number(r.expected_savings).toLocaleString()} savings</span>
                      )}
                      <span style={{ color: prioColor[r.priority] || '#94a3b8', fontSize: 11, fontWeight: 600 }}>{r.priority?.toUpperCase()}</span>
                    </div>
                  </div>
                  {r.timeline && <p style={{ color: '#94a3b8', fontSize: 12, margin: '4px 0 0' }}>Timeline: {r.timeline}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Quick wins */}
          {quickWins.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 8, color: '#22c55e' }}>Quick Wins — Pay Today</h3>
              <ul style={{ paddingLeft: 20, color: '#cbd5e1' }}>
                {quickWins.map((w, i) => <li key={i} style={{ marginBottom: 6 }}>{w}</li>)}
              </ul>
            </div>
          )}

          {result.raw && <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', marginTop: 12 }}>{result.raw}</pre>}
        </>
      )}
    </div>
  );
}
