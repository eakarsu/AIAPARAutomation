import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function AuditLog({ token }) {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchEntries = async () => {
    const params = new URLSearchParams();
    if (moduleFilter) params.set('module', moduleFilter);
    if (actionFilter) params.set('action', actionFilter);
    params.set('limit', '100');
    const res = await fetch(`/api/audit-log?${params}`, { headers });
    const data = await res.json();
    setEntries(data.entries || []);
    setTotal(data.total || 0);
  };

  useEffect(() => { fetchEntries(); }, [moduleFilter, actionFilter]);

  const handleExport = () => {
    window.open('/api/export/audit-log', '_blank');
  };

  const getActionBadge = (action) => {
    const map = { create: 'badge-success', update: 'badge-warning', delete: 'badge-danger' };
    return <span className={`badge ${map[action] || 'badge-gray'}`}>{action}</span>;
  };

  const getModuleBadge = (module) => {
    const colors = {
      invoices: 'badge-info', payments: 'badge-success', dunning: 'badge-warning',
      'cash-applications': 'badge-purple', discounts: 'badge-info', aging: 'badge-gray', contacts: 'badge-info'
    };
    return <span className={`badge ${colors[module] || 'badge-gray'}`}>{module}</span>;
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Audit Log</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <span style={{ color: '#94a3b8', fontSize: 13, alignSelf: 'center' }}>{total} total entries</span>
        </div>
      </div>

      <div className="filter-bar">
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="filter-select">
          <option value="">All Modules</option>
          <option value="invoices">Invoices</option>
          <option value="payments">Payments</option>
          <option value="dunning">Dunning</option>
          <option value="cash-applications">Cash Applications</option>
          <option value="discounts">Discounts</option>
          <option value="aging">Aging</option>
          <option value="contacts">Contacts</option>
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="filter-select">
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Module</th>
              <th>Action</th>
              <th>Record ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} style={{ cursor: 'default' }}>
                <td style={{ fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{entry.user_name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{entry.user_email}</div>
                </td>
                <td>{getModuleBadge(entry.module)}</td>
                <td>{getActionBadge(entry.action)}</td>
                <td style={{ color: '#60a5fa' }}>#{entry.record_id}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
