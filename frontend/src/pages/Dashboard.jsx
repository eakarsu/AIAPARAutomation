import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    title: 'Invoice Matching',
    description: 'Automatically match invoices to purchase orders with AI-powered accuracy scoring and discrepancy detection.',
    path: '/invoice-matching',
    icon: '📄',
    count: '17 invoices',
  },
  {
    title: 'Payment Reconciliation',
    description: 'Reconcile incoming payments with bank statements and open invoices using intelligent matching algorithms.',
    path: '/payment-reconciliation',
    icon: '💳',
    count: '16 payments',
  },
  {
    title: 'Dunning Optimization',
    description: 'AI-optimized collection strategies with risk scoring, escalation paths, and communication timing.',
    path: '/dunning-optimization',
    icon: '📬',
    count: '16 records',
  },
  {
    title: 'Cash Application',
    description: 'Intelligent cash receipt matching with remittance parsing and automatic invoice application.',
    path: '/cash-application',
    icon: '💰',
    count: '16 receipts',
  },
  {
    title: 'Discount Capture',
    description: 'Never miss an early payment discount. AI prioritizes payments to maximize savings capture.',
    path: '/discount-capture',
    icon: '🏷️',
    count: '16 discounts',
  },
  {
    title: 'Aging Analysis',
    description: 'Comprehensive AR/AP aging reports with AI-powered risk assessment and collection forecasting.',
    path: '/aging-analysis',
    icon: '📊',
    count: '16 entities',
  },
];

const nonAiFeatures = [
  {
    title: 'Reports & Analytics',
    description: 'Comprehensive dashboards with KPI summaries, trends, aging buckets, and performance metrics.',
    path: '/reports',
    icon: '📈',
  },
  {
    title: 'Contacts Directory',
    description: 'Manage vendor and customer contacts with payment terms, credit limits, and communication history.',
    path: '/contacts',
    icon: '👥',
  },
  {
    title: 'Audit Log',
    description: 'Track all system changes with user attribution, timestamps, and detailed action history.',
    path: '/audit-log',
    icon: '📋',
  },
  {
    title: 'Notifications & Alerts',
    description: 'Real-time alerts for overdue invoices, expiring discounts, unreconciled payments, and more.',
    path: '/alerts',
    icon: '🔔',
  },
  {
    title: 'User Settings',
    description: 'Manage your profile, change password, and configure account preferences.',
    path: '/settings',
    icon: '⚙️',
  },
];

export default function Dashboard({ token }) {
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (token) {
      fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => setAlertCount(data.summary?.total || 0))
        .catch(() => {});
    }
  }, [token]);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>AI-powered accounts payable and receivable automation platform</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>17</div>
          <div className="stat-change" style={{ color: '#34d399' }}>8 matched, 5 partial, 3 unmatched</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Reconciliation</div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>6</div>
          <div className="stat-change" style={{ color: '#94a3b8' }}>3 unreconciled, 3 partial</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue Accounts</div>
          <div className="stat-value" style={{ color: '#f87171' }}>16</div>
          <div className="stat-change" style={{ color: '#f87171' }}>3 critical, 5 high risk</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value" style={{ color: '#fb923c' }}>{alertCount}</div>
          <div className="stat-change">
            <span style={{ color: '#60a5fa', cursor: 'pointer' }} onClick={() => navigate('/alerts')}>View All &rarr;</span>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#e2e8f0' }}>AI-Powered Modules</h2>
      <div className="dashboard-grid">
        {features.map((feature) => (
          <div
            key={feature.path}
            className="feature-card"
            onClick={() => navigate(feature.path)}
          >
            <div className="card-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <div className="card-count">
              <span>{feature.count}</span>
              <span>View All &rarr;</span>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, color: '#e2e8f0' }}>Tools & Settings</h2>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {nonAiFeatures.map((feature) => (
          <div
            key={feature.path}
            className="feature-card feature-card-small"
            onClick={() => navigate(feature.path)}
          >
            <div className="card-icon" style={{ width: 40, height: 40, fontSize: 20, marginBottom: 12 }}>{feature.icon}</div>
            <h3 style={{ fontSize: 15 }}>{feature.title}</h3>
            <p style={{ fontSize: 12 }}>{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
