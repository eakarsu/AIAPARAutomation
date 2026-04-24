import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResultDisplay from '../components/AIResultDisplay';

const detailFields = [
  { key: 'receipt_ref', label: 'Receipt Ref' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'received_amount', label: 'Received', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'applied_amount', label: 'Applied', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'unapplied_amount', label: 'Unapplied', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'application_status', label: 'Status' },
  { key: 'receipt_date', label: 'Receipt Date', render: (v) => new Date(v).toLocaleDateString() },
  { key: 'bank_account', label: 'Bank Account' },
  { key: 'payment_method', label: 'Payment Method' },
  { key: 'invoice_references', label: 'Invoice References' },
  { key: 'remittance_info', label: 'Remittance Info', full: true },
];

const formFields = [
  { key: 'receipt_ref', label: 'Receipt Ref', required: true },
  { key: 'customer_name', label: 'Customer Name', required: true },
  { key: 'received_amount', label: 'Received Amount', type: 'number', required: true },
  { key: 'applied_amount', label: 'Applied Amount', type: 'number' },
  { key: 'unapplied_amount', label: 'Unapplied Amount', type: 'number' },
  { key: 'application_status', label: 'Status', type: 'select', options: ['unapplied', 'partially_applied', 'fully_applied'] },
  { key: 'receipt_date', label: 'Receipt Date', type: 'date', required: true },
  { key: 'bank_account', label: 'Bank Account' },
  { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Wire Transfer', 'ACH', 'Check', 'Credit Card'] },
  { key: 'invoice_references', label: 'Invoice References' },
  { key: 'remittance_info', label: 'Remittance Info', type: 'textarea', full: true },
];

export default function CashApplication({ token }) {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchItems = async () => { const res = await fetch('/api/cash-applications', { headers }); setItems(await res.json()); };
  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    let result = items;
    if (search) { const s = search.toLowerCase(); result = result.filter(i => i.receipt_ref.toLowerCase().includes(s) || i.customer_name.toLowerCase().includes(s)); }
    if (statusFilter !== 'all') result = result.filter(i => i.application_status === statusFilter);
    setFiltered(result);
  }, [items, search, statusFilter]);

  const handleCreate = async (data) => { await fetch('/api/cash-applications', { method: 'POST', headers, body: JSON.stringify(data) }); setShowForm(false); fetchItems(); };
  const handleUpdate = async (data) => { await fetch(`/api/cash-applications/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) }); setEditItem(null); setSelectedItem(null); fetchItems(); };
  const handleDelete = async (id) => { if (!confirm('Delete this record?')) return; await fetch(`/api/cash-applications/${id}`, { method: 'DELETE', headers }); setSelectedItem(null); fetchItems(); };

  const runAI = async (itemId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch('/api/ai/cash-application', { method: 'POST', headers, body: JSON.stringify({ cashAppId: itemId || null }) }); setAiResult(await res.json()); }
    catch (err) { setAiResult({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString() }); }
    setAiLoading(false);
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); };
  const toggleAll = () => { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(i => i.id))); };
  const bulkDelete = async () => { if (!confirm(`Delete ${selected.size} records?`)) return; await fetch('/api/bulk/cash-applications/delete', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected] }) }); setSelected(new Set()); fetchItems(); };
  const bulkStatus = async (status) => { await fetch('/api/bulk/cash-applications/status', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected], status }) }); setSelected(new Set()); fetchItems(); };
  const handleExport = () => { window.open('/api/export/cash-applications', '_blank'); };

  const getStatusBadge = (status) => {
    const map = { fully_applied: 'badge-success', partially_applied: 'badge-warning', unapplied: 'badge-danger' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status?.replace('_', ' ')}</span>;
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Cash Application</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-ai" onClick={() => runAI()}>AI Suggest Matches</button>
          <button className="btn btn-success" onClick={() => setShowForm(true)}>+ New Receipt</button>
        </div>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search receipts..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Statuses</option>
          <option value="fully_applied">Fully Applied</option>
          <option value="partially_applied">Partially Applied</option>
          <option value="unapplied">Unapplied</option>
        </select>
        {selected.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-count">{selected.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={() => bulkStatus('fully_applied')}>Mark Applied</button>
            <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Delete Selected</button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th>Receipt Ref</th><th>Customer</th><th>Received</th><th>Applied</th><th>Unapplied</th><th>Status</th><th>Date</th><th>AI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => toggleSelect(item.id, e)} /></td>
                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{item.receipt_ref}</td>
                <td>{item.customer_name}</td>
                <td className="amount">${Number(item.received_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="amount amount-positive">${Number(item.applied_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className={`amount ${Number(item.unapplied_amount) > 0 ? 'amount-negative' : ''}`}>
                  ${Number(item.unapplied_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td>{getStatusBadge(item.application_status)}</td>
                <td>{new Date(item.receipt_date).toLocaleDateString()}</td>
                <td><button className="btn btn-ai btn-sm" onClick={(e) => { e.stopPropagation(); runAI(item.id); }}>AI</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIResultDisplay result={aiResult} loading={aiLoading} />

      {selectedItem && !editItem && (
        <DetailModal title={`Receipt ${selectedItem.receipt_ref}`} item={selectedItem} fields={detailFields}
          onClose={() => setSelectedItem(null)} onEdit={setEditItem} onDelete={handleDelete} />
      )}
      {editItem && (
        <FormModal title={`Edit Receipt ${editItem.receipt_ref}`} fields={formFields} initialData={editItem}
          onSave={handleUpdate} onClose={() => setEditItem(null)} />
      )}
      {showForm && (
        <FormModal title="New Cash Receipt" fields={formFields} onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
