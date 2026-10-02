import React from 'react';
import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: "/invoice-matching", label: "Invoice Matching" },
  { to: "/payment-reconciliation", label: "Payment Reconciliation" },
  { to: "/dunning-optimization", label: "Dunning Optimization" },
  { to: "/cash-application", label: "Cash Application" },
  { to: "/discount-capture", label: "Discount Capture" },
  { to: "/aging-analysis", label: "Aging Analysis" },
  { to: "/reports", label: "Reports" },
  { to: "/contacts", label: "Contacts" },
  { to: "/audit-log", label: "Audit Log" },
  { to: "/settings", label: "Settings" },
  { to: "/alerts", label: "Alerts" },
  { to: "/vendor-health", label: "Vendor Health" },
  { to: "/credit-advisor", label: "Credit Advisor" },
  { to: "/dunning-letter", label: "Dunning Letter Generator" },
  { to: "/invoice-anomaly", label: "Invoice Anomaly Detector" },
  { to: "/cash-forecast", label: "Cash Flow Forecast" },
  { to: "/intercompany", label: "Intercompany Optimizer" },
  { to: "/tax-compliance", label: "Tax Compliance" },
  { to: "/discount-dashboard", label: "Discount Dashboard" },
  { to: "/ai-history", label: "AIHistory" },
  { to: "/three-way-matching", label: "Three Way Matching" },
  { to: "/vendor-fraud-detection", label: "Vendor Fraud Detection" },
  { to: "/multi-currency-fx", label: "Multi Currency Fx" },
  { to: "/erp-mapping-suggest", label: "Erp Mapping Suggest" },
  { to: "/custom-views", label: "Custom Views Page" },
  { to: "/payment-run-approval-matrix", label: "Payment Run Approval Matrix" },
];

const CSS = `
.app-shell{display:grid;grid-template-columns:264px 1fr;min-height:100vh}
.sidebar{background:#0b1220;color:#fff;padding:22px 14px;position:sticky;top:0;height:100vh;overflow:auto;display:flex;flex-direction:column;gap:6px}
.sidebar-brand{padding:6px 10px 16px;border-bottom:1px solid #ffffff18;margin-bottom:10px}
.sidebar-brand .eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800;color:#7dd3fc}
.sidebar-brand h1{font-size:17px;margin:8px 0 0;line-height:1.25;word-break:break-word}
.sidebar-nav{display:flex;flex-direction:column;gap:2px;flex:1;overflow:auto}
.sidebar-nav a{display:block;border-radius:10px;color:#94a3b8;padding:9px 12px;text-decoration:none;font-weight:600;font-size:13.5px}
.sidebar-nav a:hover{background:#ffffff12;color:#fff}
.sidebar-nav a.active{background:#2563eb;color:#fff}
.sidebar-foot{margin-top:12px;padding-top:12px;border-top:1px solid #ffffff18;display:flex;flex-direction:column;gap:8px}
.sidebar-user{font-size:12px;color:#cbd5e1}
.sidebar-logout{border:0;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer;background:#1e293b;color:#e2e8f0}
.sidebar-logout:hover{background:#334155}
@media(max-width:900px){.app-shell{grid-template-columns:1fr}.sidebar{position:relative;height:auto}}
`;

export default function Sidebar({ user, onLogout }) {
  return (
    <>
      <style>{CSS}</style>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="eyebrow">Sidebar app</span>
          <h1>AIAPARAutomation</h1>
        </div>
        <nav className="sidebar-nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {user && <span className="sidebar-user">{user.name || user.email || 'Signed in'}</span>}
          <button className="sidebar-logout" onClick={onLogout}>Logout</button>
        </div>
      </aside>
    </>
  );
}
