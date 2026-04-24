import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResultDisplay from '../components/AIResultDisplay';

const detailFields = [
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'customer_email', label: 'Email' },
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'amount_due', label: 'Amount Due', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'days_overdue', label: 'Days Overdue' },
  { key: 'dunning_level', label: 'Dunning Level' },
  { key: 'last_contact_date', label: 'Last Contact', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  { key: 'next_action_date', label: 'Next Action', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  { key: 'status', label: 'Status' },
  { key: 'contact_attempts', label: 'Contact Attempts' },
  { key: 'risk_score', label: 'Risk Score' },
  { key: 'notes', label: 'Notes', full: true },
];

const formFields = [
  { key: 'customer_name', label: 'Customer Name', required: true },
  { key: 'customer_email', label: 'Customer Email', type: 'email' },
  { key: 'invoice_number', label: 'Invoice Number', required: true },
  { key: 'amount_due', label: 'Amount Due', type: 'number', required: true },
  { key: 'days_overdue', label: 'Days Overdue', type: 'number', required: true },
  { key: 'dunning_level', label: 'Dunning Level', type: 'select', options: ['1', '2', '3'] },
  { key: 'last_contact_date', label: 'Last Contact Date', type: 'date' },
  { key: 'next_action_date', label: 'Next Action Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'escalated', 'legal', 'resolved', 'paused'] },
  { key: 'contact_attempts', label: 'Contact Attempts', type: 'number' },
  { key: 'risk_score', label: 'Risk Score', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export default function DunningOptimization({ token }) {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchItems = async () => { const res = await fetch('/api/dunning', { headers }); setItems(await res.json()); };
  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    let result = items;
    if (search) { const s = search.toLowerCase(); result = result.filter(i => i.customer_name.toLowerCase().includes(s) || i.invoice_number.toLowerCase().includes(s)); }
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    if (riskFilter !== 'all') result = result.filter(i => i.risk_score === riskFilter);
    setFiltered(result);
  }, [items, search, statusFilter, riskFilter]);

  const handleCreate = async (data) => { await fetch('/api/dunning', { method: 'POST', headers, body: JSON.stringify(data) }); setShowForm(false); fetchItems(); };
  const handleUpdate = async (data) => { await fetch(`/api/dunning/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) }); setEditItem(null); setSelectedItem(null); fetchItems(); };
  const handleDelete = async (id) => { if (!confirm('Delete this dunning record?')) return; await fetch(`/api/dunning/${id}`, { method: 'DELETE', headers }); setSelectedItem(null); fetchItems(); };

  const runAI = async (itemId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch('/api/ai/dunning-optimization', { method: 'POST', headers, body: JSON.stringify({ dunningId: itemId || null }) }); setAiResult(await res.json()); }
    catch (err) { setAiResult({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString() }); }
    setAiLoading(false);
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); };
  const toggleAll = () => { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(i => i.id))); };
  const bulkDelete = async () => { if (!confirm(`Delete ${selected.size} records?`)) return; await fetch('/api/bulk/dunning/delete', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected] }) }); setSelected(new Set()); fetchItems(); };
  const bulkStatus = async (status) => { await fetch('/api/bulk/dunning/status', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected], status }) }); setSelected(new Set()); fetchItems(); };
  const handleExport = () => { window.open('/api/export/dunning', '_blank'); };

  const getRiskBadge = (risk) => { const map = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' }; return <span className={`badge ${map[risk] || 'badge-gray'}`}>{risk}</span>; };
  const getStatusBadge = (status) => { const map = { active: 'badge-info', escalated: 'badge-warning', legal: 'badge-danger', resolved: 'badge-success', paused: 'badge-gray' }; return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>; };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Dunning Optimization</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-ai" onClick={() => runAI()}>AI Optimize</button>
          <button className="btn btn-success" onClick={() => setShowForm(true)}>+ New Record</button>
        </div>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search by customer or invoice..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="escalated">Escalated</option>
          <option value="legal">Legal</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="filter-select">
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {selected.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-count">{selected.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={() => bulkStatus('resolved')}>Mark Resolved</button>
            <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Delete Selected</button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th>Customer</th><th>Invoice</th><th>Amount Due</th><th>Days Overdue</th><th>Level</th><th>Status</th><th>Risk</th><th>Attempts</th><th>AI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => toggleSelect(item.id, e)} /></td>
                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{item.customer_name}</td>
                <td>{item.invoice_number}</td>
                <td className="amount">${Number(item.amount_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ color: item.days_overdue > 60 ? '#f87171' : item.days_overdue > 30 ? '#fbbf24' : '#34d399' }}>{item.days_overdue}</td>
                <td>{item.dunning_level}</td>
                <td>{getStatusBadge(item.status)}</td>
                <td>{getRiskBadge(item.risk_score)}</td>
                <td>{item.contact_attempts}</td>
                <td><button className="btn btn-ai btn-sm" onClick={(e) => { e.stopPropagation(); runAI(item.id); }}>AI</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIResultDisplay result={aiResult} loading={aiLoading} />

      {selectedItem && !editItem && (
        <DetailModal title={`Dunning: ${selectedItem.customer_name}`} item={selectedItem} fields={detailFields}
          onClose={() => setSelectedItem(null)} onEdit={setEditItem} onDelete={handleDelete} />
      )}
      {editItem && (
        <FormModal title={`Edit: ${editItem.customer_name}`} fields={formFields} initialData={editItem}
          onSave={handleUpdate} onClose={() => setEditItem(null)} />
      )}
      {showForm && (
        <FormModal title="New Dunning Record" fields={formFields} onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
