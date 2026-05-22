import React, { useEffect, useState } from 'react';

// Payment Cycle Funnel — SVG trapezoid funnel of stages
const STAGE_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#22c55e'];

export default function PaymentCycleFunnel({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/custom-views/payment-cycle-funnel', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading payment funnel…</div>;
  if (error) return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return null;

  const maxCount = data.stages[0].count;
  const width = 480;
  const height = 320;
  const stageHeight = height / data.stages.length;

  return (
    <div data-testid="payment-cycle-funnel" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Payment Cycle Funnel</h3>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          Conversion: <strong style={{ color: '#22c55e' }}>{data.conversion_pct}%</strong> ·{' '}
          Cycle: {data.total_cycle_days}d
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ flexShrink: 0 }}>
          {data.stages.map((s, i) => {
            const ratioTop = s.count / maxCount;
            const next = data.stages[i + 1];
            const ratioBot = next ? next.count / maxCount : ratioTop * 0.6;
            const topW = ratioTop * width;
            const botW = ratioBot * width;
            const x1Top = (width - topW) / 2;
            const x2Top = x1Top + topW;
            const x1Bot = (width - botW) / 2;
            const x2Bot = x1Bot + botW;
            const y = i * stageHeight;
            const points = `${x1Top},${y} ${x2Top},${y} ${x2Bot},${y + stageHeight} ${x1Bot},${y + stageHeight}`;
            return (
              <g key={s.key}>
                <polygon
                  points={points}
                  fill={STAGE_COLORS[i % STAGE_COLORS.length]}
                  opacity={0.85}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <text
                  x={width / 2}
                  y={y + stageHeight / 2 + 5}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {s.label} · {s.count}
                </text>
              </g>
            );
          })}
        </svg>

        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', color: '#cbd5e1', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px' }}>Stage</th>
                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Count</th>
                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Avg days</th>
              </tr>
            </thead>
            <tbody>
              {data.stages.map((s, i) => (
                <tr key={s.key} style={{ borderTop: '1px solid #1e293b' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: STAGE_COLORS[i % STAGE_COLORS.length], marginRight: 6, borderRadius: 2 }} />
                    {s.label}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{s.count.toLocaleString()}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>${s.amount.toLocaleString()}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{s.avg_days_in_stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
