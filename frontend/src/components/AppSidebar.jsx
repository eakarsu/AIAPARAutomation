import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './AppSidebar.css';

const LINKS = [
  { to: '/insights/timeline', label: 'Timeline View', group: 'Insights' },
  { to: '/codex/custom-viz', label: 'Custom Viz', group: 'Insights' },
  { to: '/codex/operations', label: 'Operations', group: 'Insights' },
  { to: '/', label: 'Dashboard', group: 'Workspace' },
  { to: '/invoice-matching', label: 'Invoice Matching', group: 'Workspace' },
  { to: '/payment-reconciliation', label: 'Payment Reconciliation', group: 'Workspace' },
  { to: '/dunning-optimization', label: 'Dunning Optimization', group: 'Workspace' },
  { to: '/cash-application', label: 'Cash Application', group: 'Workspace' },
  { to: '/discount-capture', label: 'Discount Capture', group: 'Workspace' },
  { to: '/aging-analysis', label: 'Aging Analysis', group: 'Workspace' },
  { to: '/reports', label: 'Reports', group: 'Workspace' },
  { to: '/contacts', label: 'Contacts', group: 'Workspace' },
  { to: '/audit-log', label: 'Audit Log', group: 'Workspace' },
  { to: '/settings', label: 'Settings', group: 'Workspace' },
  { to: '/alerts', label: 'Alerts', group: 'Workspace' },
  { to: '/vendor-health', label: 'Vendor Health', group: 'Workspace' },
  { to: '/credit-advisor', label: 'Credit Advisor', group: 'Workspace' },
  { to: '/dunning-letter', label: 'Dunning Letter Generator', group: 'Workspace' },
  { to: '/invoice-anomaly', label: 'Invoice Anomaly Detector', group: 'Workspace' },
  { to: '/cash-forecast', label: 'Cash Flow Forecast', group: 'Workspace' },
  { to: '/intercompany', label: 'Intercompany Optimizer', group: 'Workspace' },
  { to: '/tax-compliance', label: 'Tax Compliance', group: 'Workspace' },
  { to: '/discount-dashboard', label: 'Discount Dashboard', group: 'Workspace' },
  { to: '/ai-history', label: 'AI History', group: 'Workspace' },
  { to: '/three-way-matching', label: 'Three Way Matching', group: 'Workspace' },
  { to: '/vendor-fraud-detection', label: 'Vendor Fraud Detection', group: 'Workspace' },
  { to: '/multi-currency-fx', label: 'Multi Currency FX', group: 'Workspace' },
  { to: '/erp-mapping-suggest', label: 'Erp Mapping Suggest', group: 'Workspace' },
  { to: '/custom-views', label: 'Custom Views', group: 'Workspace' },
  { to: '/payment-run-approval-matrix', label: 'Payment Run Approval Matrix', group: 'Workspace' },
];

export default function AppSidebar() {
  const [query, setQuery] = useState('');
  const visible = LINKS.filter(link => link.label.toLowerCase().includes(query.toLowerCase().trim()));
  return <aside className="codex-side" aria-label="Application navigation">
    <div className="codex-side-brand"><strong>AIAPARAutomation</strong><span>Workspace</span></div>
    <label className="codex-side-search-label" htmlFor="codex-side-search">Find a section</label>
    <input id="codex-side-search" className="codex-side-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search navigation" />
    <nav className="codex-side-links" aria-label="Sections">
      {['Workspace', 'AI tools', 'Insights'].map(group => {
        const items = visible.filter(link => link.group === group);
        return items.length ? <div className="codex-side-group" key={group}>
          <span className="codex-side-heading">{group}</span>
          {items.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `codex-side-link${isActive ? ' active' : ''}`}>{link.label}</NavLink>)}
        </div> : null;
      })}
      {visible.length === 0 && <p className="codex-side-empty">No matching sections</p>}
    </nav>
  </aside>;
}
