import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResultDisplay from '../components/AIResultDisplay';

const detailFields = [
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'vendor_name', label: 'Vendor' },
  { key: 'invoice_amount', label: 'Invoice Amount', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'discount_terms', label: 'Terms' },
  { key: 'discount_percent', label: 'Discount %', render: (v) => `${v}%` },
  { key: 'discount_amount', label: 'Discount Amount', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'discount_deadline', label: 'Deadline', render: (v) => new Date(v).toLocaleDateString() },
  { key: 'payment_status', label: 'Payment Status' },
  { key: 'capture_status', label: 'Capture Status' },
  { key: 'potential_savings', label: 'Potential Savings', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'priority', label: 'Priority' },
];

const formFields = [
  { key: 'invoice_number', label: 'Invoice Number', required: true },
  { key: 'vendor_name', label: 'Vendor Name', required: true },
  { key: 'invoice_amount', label: 'Invoice Amount', type: 'number', required: true },
  { key: 'discount_terms', label: 'Discount Terms' },
  { key: 'discount_percent', label: 'Discount %', type: 'number' },
  { key: 'discount_amount', label: 'Discount Amount', type: 'number' },
  { key: 'discount_deadline', label: 'Discount Deadline', type: 'date', required: true },
  { key: 'payment_status', label: 'Payment Status', type: 'select', options: ['paid', 'unpaid'] },
  { key: 'capture_status', label: 'Capture Status', type: 'select', options: ['available', 'captured', 'missed', 'expiring_soon'] },
  { key: 'potential_savings', label: 'Potential Savings', type: 'number' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'] },
];

export default function DiscountCapture({ token }) {
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

  const fetchItems = async () => {
    const res = await fetch('/api/discounts?limit=200', { headers });
    const data = await res.json();
    setItems(data.data || data);
  };
  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    let result = items;
    if (search) { const s = search.toLowerCase(); result = result.filter(i => i.invoice_number.toLowerCase().includes(s) || i.vendor_name.toLowerCase().includes(s)); }
    if (statusFilter !== 'all') result = result.filter(i => i.capture_status === statusFilter);
    setFiltered(result);
  }, [items, search, statusFilter]);

  const handleCreate = async (data) => { await fetch('/api/discounts', { method: 'POST', headers, body: JSON.stringify(data) }); setShowForm(false); fetchItems(); };
  const handleUpdate = async (data) => { await fetch(`/api/discounts/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) }); setEditItem(null); setSelectedItem(null); fetchItems(); };
  const handleDelete = async (id) => { if (!confirm('Delete this discount record?')) return; await fetch(`/api/discounts/${id}`, { method: 'DELETE', headers }); setSelectedItem(null); fetchItems(); };

  const runAI = async (itemId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch('/api/ai/discount-capture', { method: 'POST', headers, body: JSON.stringify({ discountId: itemId || null }) }); setAiResult(await res.json()); }
    catch (err) { setAiResult({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString() }); }
    setAiLoading(false);
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); };
  const toggleAll = () => { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(i => i.id))); };
  const bulkDelete = async () => { if (!confirm(`Delete ${selected.size} records?`)) return; await fetch('/api/bulk/discounts/delete', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected] }) }); setSelected(new Set()); fetchItems(); };
  const bulkStatus = async (status) => { await fetch('/api/bulk/discounts/status', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected], status }) }); setSelected(new Set()); fetchItems(); };
  const handleExport = () => { window.open('/api/export/discounts', '_blank'); };

  const getCaptureBadge = (status) => { const map = { captured: 'badge-success', available: 'badge-info', expiring_soon: 'badge-warning', missed: 'badge-danger' }; return <span className={`badge ${map[status] || 'badge-gray'}`}>{status?.replace('_', ' ')}</span>; };
  const getPriorityBadge = (priority) => { const map = { low: 'badge-gray', medium: 'badge-info', high: 'badge-warning', critical: 'badge-danger' }; return <span className={`badge ${map[priority] || 'badge-gray'}`}>{priority}</span>; };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Discount Capture</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-ai" onClick={() => runAI()}>AI Optimize Savings</button>
          <button className="btn btn-success" onClick={() => setShowForm(true)}>+ New Discount</button>
        </div>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search discounts..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="captured">Captured</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="missed">Missed</option>
        </select>
        {selected.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-count">{selected.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={() => bulkStatus('captured')}>Mark Captured</button>
            <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Delete Selected</button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th>Invoice</th><th>Vendor</th><th>Amount</th><th>Terms</th><th>Savings</th><th>Deadline</th><th>Status</th><th>Priority</th><th>AI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => toggleSelect(item.id, e)} /></td>
                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{item.invoice_number}</td>
                <td>{item.vendor_name}</td>
                <td className="amount">${Number(item.invoice_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>{item.discount_terms}</td>
                <td className="amount amount-positive">${Number(item.potential_savings).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>{new Date(item.discount_deadline).toLocaleDateString()}</td>
                <td>{getCaptureBadge(item.capture_status)}</td>
                <td>{getPriorityBadge(item.priority)}</td>
                <td><button className="btn btn-ai btn-sm" onClick={(e) => { e.stopPropagation(); runAI(item.id); }}>AI</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIResultDisplay result={aiResult} loading={aiLoading} />

      {selectedItem && !editItem && (
        <DetailModal title={`Discount: ${selectedItem.invoice_number}`} item={selectedItem} fields={detailFields}
          onClose={() => setSelectedItem(null)} onEdit={setEditItem} onDelete={handleDelete} />
      )}
      {editItem && (
        <FormModal title={`Edit Discount ${editItem.invoice_number}`} fields={formFields} initialData={editItem}
          onSave={handleUpdate} onClose={() => setEditItem(null)} />
      )}
      {showForm && (
        <FormModal title="New Discount Record" fields={formFields} onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
