import React, { useEffect, useState } from 'react';

// Aging Report Chart — stacked horizontal bars for current/1-30/31-60/61-90/90+
// Pure SVG, no external chart dep.
const BUCKETS = [
  { key: 'current', label: 'Current', color: '#22c55e' },
  { key: 'days_1_30', label: '1-30', color: '#84cc16' },
  { key: 'days_31_60', label: '31-60', color: '#f59e0b' },
  { key: 'days_61_90', label: '61-90', color: '#f97316' },
  { key: 'days_over_90', label: '90+', color: '#ef4444' },
];

export default function AgingReportChart({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/custom-views/aging-report', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading aging report…</div>;
  if (error) return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return null;

  const maxTotal = Math.max(...data.rows.map((r) => r.total));

  return (
    <div data-testid="aging-report-chart" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Aging Report</h3>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          Grand total: ${data.grand_total.toLocaleString()}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {BUCKETS.map((b) => (
          <span key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: 12 }}>
            <span style={{ width: 12, height: 12, background: b.color, borderRadius: 2 }} />
            {b.label}: ${data.bucket_totals[b.key].toLocaleString()}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.rows.map((row) => {
          const width = Math.max(8, (row.total / maxTotal) * 100);
          return (
            <div key={row.entity} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 150, color: '#e2e8f0', fontSize: 13 }} title={row.entity}>
                {row.entity}
                <span style={{ color: '#64748b', marginLeft: 6, fontSize: 11 }}>({row.type})</span>
              </div>
              <div style={{ flex: 1, height: 22, background: '#1e293b', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', width: `${width}%`, height: '100%' }}>
                  {BUCKETS.map((b) => {
                    const seg = (row[b.key] / row.total) * 100;
                    return (
                      <div
                        key={b.key}
                        title={`${b.label}: $${row[b.key].toLocaleString()}`}
                        style={{ background: b.color, width: `${seg}%`, height: '100%' }}
                      />
                    );
                  })}
                </div>
              </div>
              <div style={{ width: 100, textAlign: 'right', color: '#e2e8f0', fontSize: 12 }}>
                ${row.total.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
