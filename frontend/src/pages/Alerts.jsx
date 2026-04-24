import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Alerts({ token }) {
  const [data, setData] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/alerts', { headers }).then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading alerts...</div>;

  const moduleRoutes = {
    invoices: '/invoice-matching',
    payments: '/payment-reconciliation',
    dunning: '/dunning-optimization',
    'cash-applications': '/cash-application',
    discounts: '/discount-capture',
  };

  let alerts = data.alerts;
  if (typeFilter !== 'all') alerts = alerts.filter(a => a.type === typeFilter);
  if (severityFilter !== 'all') alerts = alerts.filter(a => a.severity === severityFilter);

  const severityColors = {
    critical: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: '#dc2626' },
    high: { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '#f97316' },
    medium: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '#f59e0b' },
    low: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '#64748b' },
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Notifications & Alerts</h1>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Alerts</div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>{data.summary.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical</div>
          <div className="stat-value" style={{ color: '#f87171' }}>{data.summary.critical}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High</div>
          <div className="stat-value" style={{ color: '#fb923c' }}>{data.summary.high}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Medium</div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>{data.summary.medium}</div>
        </div>
      </div>

      <div className="filter-bar">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-select">
          <option value="all">All Types</option>
          <option value="overdue_invoice">Overdue Invoices</option>
          <option value="unreconciled_payment">Unreconciled Payments</option>
          <option value="high_risk_dunning">High Risk Dunning</option>
          <option value="expiring_discount">Expiring Discounts</option>
          <option value="unapplied_cash">Unapplied Cash</option>
        </select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="filter-select">
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.length === 0 && (
          <div className="data-table-container" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            No alerts match the selected filters.
          </div>
        )}
        {alerts.map((alert) => {
          const sev = severityColors[alert.severity];
          return (
            <div
              key={alert.id}
              className="alert-card"
              style={{
                background: '#1e293b',
                border: `1px solid ${sev.border}33`,
                borderLeft: `4px solid ${sev.border}`,
                borderRadius: 8,
                padding: '16px 20px',
                cursor: moduleRoutes[alert.module] ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onClick={() => moduleRoutes[alert.module] && navigate(moduleRoutes[alert.module])}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span className={`badge`} style={{ background: sev.bg, color: sev.color }}>{alert.severity}</span>
                    <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{alert.title}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{alert.message}</div>
                </div>
                {alert.date && (
                  <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', marginLeft: 16 }}>
                    {new Date(alert.date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
