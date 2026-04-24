import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Reports({ token }) {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [topEntities, setTopEntities] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch('/api/reports/summary', { headers }).then(r => r.json()),
      fetch('/api/reports/trends', { headers }).then(r => r.json()),
      fetch('/api/reports/top-entities', { headers }).then(r => r.json()),
    ]).then(([s, t, e]) => {
      setSummary(s);
      setTrends(t);
      setTopEntities(e);
    });
  }, []);

  const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (!summary) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading reports...</div>;

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Reports & Analytics</h1>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Invoices Value</div>
          <div className="stat-value" style={{ color: '#60a5fa', fontSize: 22 }}>{fmt(summary.invoices.total_amount)}</div>
          <div className="stat-change" style={{ color: '#94a3b8' }}>{summary.invoices.total} invoices | {summary.invoices.overdue} overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Payments Received</div>
          <div className="stat-value" style={{ color: '#34d399', fontSize: 22 }}>{fmt(summary.payments.total_amount)}</div>
          <div className="stat-change" style={{ color: '#94a3b8' }}>{summary.payments.reconciled} reconciled / {summary.payments.total} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding Dunning</div>
          <div className="stat-value" style={{ color: '#f87171', fontSize: 22 }}>{fmt(summary.dunning.total_due)}</div>
          <div className="stat-change" style={{ color: '#f87171' }}>{summary.dunning.critical} critical, {summary.dunning.high_risk} high risk</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cash Received</div>
          <div className="stat-value" style={{ color: '#a78bfa', fontSize: 22 }}>{fmt(summary.cashApplications.total_received)}</div>
          <div className="stat-change" style={{ color: '#fbbf24' }}>{fmt(summary.cashApplications.total_unapplied)} unapplied</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Discount Savings</div>
          <div className="stat-value" style={{ color: '#34d399', fontSize: 22 }}>{fmt(summary.discounts.captured_savings)}</div>
          <div className="stat-change" style={{ color: '#f87171' }}>{fmt(summary.discounts.missed_savings)} missed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total AR/AP Outstanding</div>
          <div className="stat-value" style={{ color: '#fbbf24', fontSize: 22 }}>{fmt(summary.aging.total_outstanding)}</div>
          <div className="stat-change" style={{ color: '#94a3b8' }}>{summary.aging.customers} customers, {summary.aging.vendors} vendors</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Invoice Status Breakdown */}
        <div className="data-table-container" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Invoice Status Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Matched', value: summary.invoices.matched, color: '#34d399', total: summary.invoices.total },
              { label: 'Partial Match', value: summary.invoices.partial, color: '#fbbf24', total: summary.invoices.total },
              { label: 'Unmatched', value: summary.invoices.unmatched, color: '#f87171', total: summary.invoices.total },
              { label: 'Pending', value: summary.invoices.pending, color: '#94a3b8', total: summary.invoices.total },
            ].map(bar => (
              <div key={bar.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#cbd5e1' }}>{bar.label}</span>
                  <span style={{ color: bar.color, fontWeight: 600 }}>{bar.value}</span>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 4, height: 8 }}>
                  <div style={{ background: bar.color, borderRadius: 4, height: 8, width: `${(bar.value / bar.total) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Reconciliation */}
        <div className="data-table-container" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Payment Reconciliation</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Reconciled', value: summary.payments.reconciled, color: '#34d399', total: summary.payments.total },
              { label: 'Partial', value: summary.payments.partial, color: '#fbbf24', total: summary.payments.total },
              { label: 'Unreconciled', value: summary.payments.unreconciled, color: '#f87171', total: summary.payments.total },
            ].map(bar => (
              <div key={bar.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#cbd5e1' }}>{bar.label}</span>
                  <span style={{ color: bar.color, fontWeight: 600 }}>{bar.value}</span>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 4, height: 8 }}>
                  <div style={{ background: bar.color, borderRadius: 4, height: 8, width: `${(bar.value / bar.total) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #334155', fontSize: 13, color: '#94a3b8' }}>
            Total Difference: <span style={{ color: '#fbbf24', fontWeight: 600 }}>{fmt(summary.payments.total_difference)}</span>
          </div>
        </div>

        {/* Aging Buckets */}
        <div className="data-table-container" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Aging Buckets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Current', value: summary.aging.total_current, color: '#34d399' },
              { label: '1-30 Days', value: summary.aging.total_1_30, color: '#60a5fa' },
              { label: '31-60 Days', value: summary.aging.total_31_60, color: '#fbbf24' },
              { label: '61-90 Days', value: summary.aging.total_61_90, color: '#f97316' },
              { label: '90+ Days', value: summary.aging.total_over_90, color: '#f87171' },
            ].map(bar => (
              <div key={bar.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#cbd5e1' }}>{bar.label}</span>
                  <span style={{ color: bar.color, fontWeight: 600 }}>{fmt(bar.value)}</span>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 4, height: 8 }}>
                  <div style={{ background: bar.color, borderRadius: 4, height: 8, width: `${(bar.value / summary.aging.total_outstanding) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discount Performance */}
        <div className="data-table-container" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Discount Capture Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Captured', value: summary.discounts.captured, color: '#34d399', total: summary.discounts.total },
              { label: 'Available', value: summary.discounts.available, color: '#60a5fa', total: summary.discounts.total },
              { label: 'Expiring Soon', value: summary.discounts.expiring_soon, color: '#fbbf24', total: summary.discounts.total },
              { label: 'Missed', value: summary.discounts.missed, color: '#f87171', total: summary.discounts.total },
            ].map(bar => (
              <div key={bar.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#cbd5e1' }}>{bar.label}</span>
                  <span style={{ color: bar.color, fontWeight: 600 }}>{bar.value}</span>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 4, height: 8 }}>
                  <div style={{ background: bar.color, borderRadius: 4, height: 8, width: `${(bar.value / bar.total) * 100}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #334155', fontSize: 13, color: '#94a3b8' }}>
            Total Potential: <span style={{ color: '#34d399', fontWeight: 600 }}>{fmt(summary.discounts.total_savings)}</span>
          </div>
        </div>
      </div>

      {/* Top Entities */}
      {topEntities && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr><th colSpan={3} style={{ fontSize: 14 }}>Top Vendors by Amount</th></tr>
                <tr><th>Vendor</th><th>Invoices</th><th>Total Amount</th></tr>
              </thead>
              <tbody>
                {topEntities.topVendors.map((v, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: '#60a5fa' }}>{v.vendor_name}</td>
                    <td>{v.invoice_count}</td>
                    <td className="amount">{fmt(v.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr><th colSpan={3} style={{ fontSize: 14 }}>Top Customers by Outstanding</th></tr>
                <tr><th>Customer</th><th>Records</th><th>Total Due</th></tr>
              </thead>
              <tbody>
                {topEntities.topCustomers.map((c, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: '#f87171' }}>{c.customer_name}</td>
                    <td>{c.record_count}</td>
                    <td className="amount">{fmt(c.total_due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trends */}
      {trends && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr><th colSpan={3} style={{ fontSize: 14 }}>Monthly Invoice Trends</th></tr>
                <tr><th>Month</th><th>Count</th><th>Total Amount</th></tr>
              </thead>
              <tbody>
                {trends.invoiceTrends.map((t, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600 }}>{t.month}</td>
                    <td>{t.count}</td>
                    <td className="amount">{fmt(t.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr><th colSpan={3} style={{ fontSize: 14 }}>Monthly Payment Trends</th></tr>
                <tr><th>Month</th><th>Count</th><th>Total Amount</th></tr>
              </thead>
              <tbody>
                {trends.paymentTrends.map((t, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600 }}>{t.month}</td>
                    <td>{t.count}</td>
                    <td className="amount">{fmt(t.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
