import React, { useEffect, useState } from 'react';

// Cashflow Forecast — multi-series SVG line chart
// Series: AR inflows, AP outflows, projected balance
export default function CashflowForecast({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeks, setWeeks] = useState(12);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/custom-views/cashflow-forecast?weeks=${weeks}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, weeks]);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading cashflow forecast…</div>;
  if (error) return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return null;

  const W = 520;
  const H = 280;
  const PAD = { top: 16, right: 12, bottom: 36, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const series = data.series;

  const allVals = series.flatMap((s) => [s.inflows_ar, s.outflows_ap, s.projected_balance]);
  const yMin = Math.min(0, ...allVals);
  const yMax = Math.max(...allVals);
  const yRange = yMax - yMin || 1;

  const x = (i) => PAD.left + (i / (series.length - 1 || 1)) * innerW;
  const y = (v) => PAD.top + innerH - ((v - yMin) / yRange) * innerH;

  const path = (key) =>
    series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)},${y(p[key])}`).join(' ');

  const LINES = [
    { key: 'inflows_ar', label: 'AR Inflows', color: '#22c55e' },
    { key: 'outflows_ap', label: 'AP Outflows', color: '#ef4444' },
    { key: 'projected_balance', label: 'Projected Balance', color: '#3b82f6' },
  ];

  const yTicks = 5;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (i / yTicks) * yRange);

  return (
    <div data-testid="cashflow-forecast" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Cashflow Forecast</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>Weeks:</label>
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 12 }}
          >
            {[4, 8, 12, 16, 26].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, color: '#94a3b8', fontSize: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <span>Start: <strong style={{ color: '#cbd5e1' }}>${data.starting_balance.toLocaleString()}</strong></span>
        <span>End: <strong style={{ color: '#cbd5e1' }}>${data.ending_balance.toLocaleString()}</strong></span>
        <span>Min: <strong style={{ color: '#cbd5e1' }}>${data.min_balance.toLocaleString()}</strong></span>
        <span>Max: <strong style={{ color: '#cbd5e1' }}>${data.max_balance.toLocaleString()}</strong></span>
      </div>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto' }}>
        {/* gridlines + Y labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">
              ${Math.round(t / 1000)}k
            </text>
          </g>
        ))}

        {/* X axis labels (sparsified) */}
        {series.map((p, i) => (
          i % Math.max(1, Math.floor(series.length / 8)) === 0 ? (
            <text key={i} x={x(i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="10" fill="#64748b">
              {p.label}
            </text>
          ) : null
        ))}

        {/* lines */}
        {LINES.map((ln) => (
          <g key={ln.key}>
            <path d={path(ln.key)} stroke={ln.color} strokeWidth="2" fill="none" />
            {series.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p[ln.key])} r="3" fill={ln.color}>
                <title>{`${p.label} · ${ln.label}: $${p[ln.key].toLocaleString()}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>

      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        {LINES.map((ln) => (
          <span key={ln.key} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: 12 }}>
            <span style={{ width: 16, height: 3, background: ln.color, borderRadius: 2 }} />
            {ln.label}
          </span>
        ))}
      </div>
    </div>
  );
}
