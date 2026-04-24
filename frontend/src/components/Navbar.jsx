import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="logo">AP</div>
        <span>AI AP/AR Automation</span>
      </Link>
      <div className="navbar-links">
        <Link to="/reports" className="navbar-link">Reports</Link>
        <Link to="/contacts" className="navbar-link">Contacts</Link>
        <Link to="/alerts" className="navbar-link">Alerts</Link>
        <Link to="/audit-log" className="navbar-link">Audit Log</Link>
      </div>
      <div className="navbar-right">
        <span className="navbar-user">
          Welcome, <strong>{user?.name || 'User'}</strong>
        </span>
        <Link to="/settings" className="btn-logout" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Settings</Link>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
