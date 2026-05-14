import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResultDisplay from '../components/AIResultDisplay';
import PaginationControl from '../components/PaginationControl';

const detailFields = [
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'vendor_name', label: 'Vendor Name' },
  { key: 'amount', label: 'Amount', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'po_number', label: 'PO Number' },
  { key: 'po_amount', label: 'PO Amount', render: (v) => v ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—' },
  { key: 'match_status', label: 'Match Status' },
  { key: 'match_score', label: 'Match Score', render: (v) => v ? `${v}%` : '—' },
  { key: 'invoice_date', label: 'Invoice Date', render: (v) => new Date(v).toLocaleDateString() },
  { key: 'due_date', label: 'Due Date', render: (v) => new Date(v).toLocaleDateString() },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description', full: true },
];

const formFields = [
  { key: 'invoice_number', label: 'Invoice Number', required: true },
  { key: 'vendor_name', label: 'Vendor Name', required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'po_number', label: 'PO Number' },
  { key: 'po_amount', label: 'PO Amount', type: 'number' },
  { key: 'match_status', label: 'Match Status', type: 'select', options: ['pending', 'matched', 'partial_match', 'unmatched'] },
  { key: 'invoice_date', label: 'Invoice Date', type: 'date', required: true },
  { key: 'due_date', label: 'Due Date', type: 'date', required: true },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description', type: 'textarea', full: true },
];

export default function InvoiceMatching({ token }) {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchItems = async (p = page) => {
    const params = new URLSearchParams({ page: p, limit: 20 });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('vendor', search);
    const res = await fetch(`/api/invoices?${params}`, { headers });
    const data = await res.json();
    setItems(data.data || data);
    if (data.pagination) setPagination(data.pagination);
  };

  useEffect(() => { fetchItems(page); }, [page, statusFilter]);

  useEffect(() => {
    // client-side search on current page results when status filter is applied server-side
    let result = items;
    if (search && statusFilter !== 'all') {
      const s = search.toLowerCase();
      result = result.filter(i => (i.invoice_number || '').toLowerCase().includes(s) || (i.vendor_name || '').toLowerCase().includes(s));
    }
    setFiltered(result);
  }, [items, search, statusFilter]);

  const handleCreate = async (data) => {
    await fetch('/api/invoices', { method: 'POST', headers, body: JSON.stringify(data) });
    setShowForm(false);
    fetchItems(page);
  };

  const handleUpdate = async (data) => {
    await fetch(`/api/invoices/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    setEditItem(null);
    setSelectedItem(null);
    fetchItems(page);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    await fetch(`/api/invoices/${id}`, { method: 'DELETE', headers });
    setSelectedItem(null);
    fetchItems(page);
  };

  const runAI = async (itemId) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/invoice-matching', {
        method: 'POST', headers, body: JSON.stringify({ invoiceId: itemId || null }),
      });
      setAiResult(await res.json());
    } catch (err) {
      setAiResult({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString() });
    }
    setAiLoading(false);
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} invoices?`)) return;
    await fetch('/api/bulk/invoices/delete', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected] }) });
    setSelected(new Set());
    fetchItems(page);
  };

  const bulkStatus = async (status) => {
    await fetch('/api/bulk/invoices/status', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected], status }) });
    setSelected(new Set());
    fetchItems(page);
  };

  const handleExport = () => { window.open('/api/export/invoices', '_blank'); };

  const getStatusBadge = (status) => {
    const map = { matched: 'badge-success', partial_match: 'badge-warning', unmatched: 'badge-danger', pending: 'badge-gray' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status?.replace('_', ' ')}</span>;
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Invoice Matching</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-ai" onClick={() => runAI()}>AI Analyze All</button>
          <button className="btn btn-success" onClick={() => setShowForm(true)}>+ New Invoice</button>
        </div>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Statuses</option>
          <option value="matched">Matched</option>
          <option value="partial_match">Partial Match</option>
          <option value="unmatched">Unmatched</option>
          <option value="pending">Pending</option>
        </select>
        {selected.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-count">{selected.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={() => bulkStatus('matched')}>Mark Matched</button>
            <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Delete Selected</button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th>Invoice #</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>PO #</th>
              <th>Status</th>
              <th>Score</th>
              <th>Due Date</th>
              <th>AI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => toggleSelect(item.id, e)} /></td>
                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{item.invoice_number}</td>
                <td>{item.vendor_name}</td>
                <td className="amount">${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>{item.po_number || '—'}</td>
                <td>{getStatusBadge(item.match_status)}</td>
                <td>{item.match_score ? `${item.match_score}%` : '—'}</td>
                <td>{new Date(item.due_date).toLocaleDateString()}</td>
                <td><button className="btn btn-ai btn-sm" onClick={(e) => { e.stopPropagation(); runAI(item.id); }}>AI</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControl pagination={pagination} onPageChange={(p) => { setPage(p); setSelected(new Set()); }} />
      <AIResultDisplay result={aiResult} loading={aiLoading} />

      {selectedItem && !editItem && (
        <DetailModal title={`Invoice ${selectedItem.invoice_number}`} item={selectedItem} fields={detailFields}
          onClose={() => setSelectedItem(null)} onEdit={setEditItem} onDelete={handleDelete} />
      )}
      {editItem && (
        <FormModal title={`Edit Invoice ${editItem.invoice_number}`} fields={formFields} initialData={editItem}
          onSave={handleUpdate} onClose={() => setEditItem(null)} />
      )}
      {showForm && (
        <FormModal title="New Invoice" fields={formFields} onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
