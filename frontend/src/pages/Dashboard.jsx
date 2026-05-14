import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    title: 'Invoice Matching',
    description: 'Automatically match invoices to purchase orders with AI-powered accuracy scoring and discrepancy detection.',
    path: '/invoice-matching',
    icon: '📄',
  },
  {
    title: 'Payment Reconciliation',
    description: 'Reconcile incoming payments with bank statements and open invoices using intelligent matching algorithms.',
    path: '/payment-reconciliation',
    icon: '💳',
  },
  {
    title: 'Dunning Optimization',
    description: 'AI-optimized collection strategies with risk scoring, escalation paths, and communication timing.',
    path: '/dunning-optimization',
    icon: '📬',
  },
  {
    title: 'Cash Application',
    description: 'Intelligent cash receipt matching with remittance parsing and automatic invoice application.',
    path: '/cash-application',
    icon: '💰',
  },
  {
    title: 'Discount Capture',
    description: 'Never miss an early payment discount. AI prioritizes payments to maximize savings capture.',
    path: '/discount-capture',
    icon: '🏷️',
  },
  {
    title: 'Aging Analysis',
    description: 'Comprehensive AR/AP aging reports with AI-powered risk assessment and collection forecasting.',
    path: '/aging-analysis',
    icon: '📊',
  },
  {
    title: 'Vendor Health Score',
    description: 'Score each vendor on payment behaviour, discounts captured, and reliability rating (A-F).',
    path: '/vendor-health',
    icon: '🩺',
  },
  {
    title: 'Customer Credit Advisor',
    description: 'Predict default risk and recommend credit limit increases / decreases / freezes per customer.',
    path: '/credit-advisor',
    icon: '🎯',
  },
  {
    title: 'Dunning Letter Generator',
    description: 'AI writes personalised, multi-tone dunning letters per overdue invoice & customer history.',
    path: '/dunning-letter',
    icon: '✉️',
  },
  {
    title: 'Invoice Anomaly Detector',
    description: 'Flag duplicates, amount spikes, and suspicious payment terms across your invoice set.',
    path: '/invoice-anomaly',
    icon: '🚨',
  },
  {
    title: 'Cash Flow Forecast',
    description: 'AI-powered 90-day cash flow prediction with weekly breakdowns and risk factor analysis.',
    path: '/cash-forecast',
    icon: '📉',
  },
  {
    title: 'Intercompany Optimizer',
    description: 'Minimize bank transfers between entities with AI netting recommendations.',
    path: '/intercompany',
    icon: '🔀',
  },
  {
    title: 'Tax Compliance Validator',
    description: 'Validate invoices against US/EU tax rules and flag compliance violations automatically.',
    path: '/tax-compliance',
    icon: '🏛️',
  },
  {
    title: 'Discount Dashboard',
    description: 'Executive view of discount capture rate vs 80% benchmark with AI-driven quick wins.',
    path: '/discount-dashboard',
    icon: '📋',
  },
  {
    title: '3-Way Matching',
    description: 'Match Invoice ↔ PO ↔ Receipt and surface variance, discrepancies, and post recommendations.',
    path: '/three-way-matching',
    icon: '🔗',
  },
  {
    title: 'Vendor Fraud Detection',
    description: 'Score vendor fraud risk (duplicates, round-dollar, escalating amounts, bank-change anomalies).',
    path: '/vendor-fraud-detection',
    icon: '🚨',
  },
  {
    title: 'Multi-Currency FX',
    description: 'Aggregate FX exposures, recommend hedging actions, and run scenario analysis.',
    path: '/multi-currency-fx',
    icon: '💱',
  },
  {
    title: 'ERP Mapping Suggestions',
    description: 'Plan field-to-field mapping into NetSuite / SAP / Oracle / QuickBooks (planning aid only).',
    path: '/erp-mapping-suggest',
    icon: '🗺️',
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
    title: 'AI History',
    description: 'Browse all past AI analyses, replay results, and track AI usage by module.',
    path: '/ai-history',
    icon: '🧠',
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
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch('/api/alerts', { headers })
      .then(r => r.json())
      .then(data => setAlertCount(data.summary?.total || 0))
      .catch(() => {});

    fetch('/api/reports/summary', { headers })
      .then(r => r.json())
      .then(data => { setStats(data); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }, [token]);

  const inv = stats?.invoices || {};
  const pay = stats?.payments || {};
  const dun = stats?.dunning || {};

  return (
    <div>
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>AI-powered accounts payable and receivable automation platform</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>
            {loadingStats ? '—' : (inv.total || 0)}
          </div>
          <div className="stat-change" style={{ color: '#34d399' }}>
            {loadingStats ? '' : `${inv.matched || 0} matched, ${inv.partial || 0} partial, ${inv.unmatched || 0} unmatched`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Payments</div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>
            {loadingStats ? '—' : (pay.total || 0)}
          </div>
          <div className="stat-change" style={{ color: '#94a3b8' }}>
            {loadingStats ? '' : `${pay.unreconciled || 0} unreconciled, ${pay.partial || 0} partial`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue Accounts</div>
          <div className="stat-value" style={{ color: '#f87171' }}>
            {loadingStats ? '—' : (inv.overdue || 0)}
          </div>
          <div className="stat-change" style={{ color: '#f87171' }}>
            {loadingStats ? '' : `${dun.critical || 0} critical, ${dun.high_risk || 0} high risk`}
          </div>
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
              <span>View All &rarr;</span>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, color: '#e2e8f0' }}>Tools & Settings</h2>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
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
