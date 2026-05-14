import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResultDisplay from '../components/AIResultDisplay';
import PaginationControl from '../components/PaginationControl';

const detailFields = [
  { key: 'payment_ref', label: 'Payment Ref' },
  { key: 'payer_name', label: 'Payer Name' },
  { key: 'amount', label: 'Amount', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'payment_method', label: 'Payment Method' },
  { key: 'bank_reference', label: 'Bank Reference' },
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'reconciliation_status', label: 'Status' },
  { key: 'payment_date', label: 'Payment Date', render: (v) => new Date(v).toLocaleDateString() },
  { key: 'bank_statement_date', label: 'Bank Statement Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  { key: 'difference_amount', label: 'Difference', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'notes', label: 'Notes', full: true },
];

const formFields = [
  { key: 'payment_ref', label: 'Payment Ref', required: true },
  { key: 'payer_name', label: 'Payer Name', required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Wire Transfer', 'ACH', 'Check', 'Credit Card'] },
  { key: 'bank_reference', label: 'Bank Reference' },
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'reconciliation_status', label: 'Status', type: 'select', options: ['reconciled', 'unreconciled', 'partial'] },
  { key: 'payment_date', label: 'Payment Date', type: 'date', required: true },
  { key: 'bank_statement_date', label: 'Bank Statement Date', type: 'date' },
  { key: 'difference_amount', label: 'Difference Amount', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export default function PaymentReconciliation({ token }) {
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
    const res = await fetch(`/api/payments?${params}`, { headers });
    const data = await res.json();
    setItems(data.data || data);
    if (data.pagination) setPagination(data.pagination);
  };

  useEffect(() => { fetchItems(page); }, [page, statusFilter]);

  useEffect(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => (i.payment_ref || '').toLowerCase().includes(s) || (i.payer_name || '').toLowerCase().includes(s));
    }
    setFiltered(result);
  }, [items, search]);

  const handleCreate = async (data) => { await fetch('/api/payments', { method: 'POST', headers, body: JSON.stringify(data) }); setShowForm(false); fetchItems(page); };
  const handleUpdate = async (data) => { await fetch(`/api/payments/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) }); setEditItem(null); setSelectedItem(null); fetchItems(page); };
  const handleDelete = async (id) => { if (!confirm('Delete this payment?')) return; await fetch(`/api/payments/${id}`, { method: 'DELETE', headers }); setSelectedItem(null); fetchItems(page); };

  const runAI = async (itemId) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch('/api/ai/payment-reconciliation', { method: 'POST', headers, body: JSON.stringify({ paymentId: itemId || null }) });
      setAiResult(await res.json());
    } catch (err) { setAiResult({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString() }); }
    setAiLoading(false);
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); };
  const toggleAll = () => { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(i => i.id))); };
  const bulkDelete = async () => { if (!confirm(`Delete ${selected.size} payments?`)) return; await fetch('/api/bulk/payments/delete', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected] }) }); setSelected(new Set()); fetchItems(page); };
  const bulkStatus = async (status) => { await fetch('/api/bulk/payments/status', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected], status }) }); setSelected(new Set()); fetchItems(page); };
  const handleExport = () => { window.open('/api/export/payments', '_blank'); };

  const getStatusBadge = (status) => {
    const map = { reconciled: 'badge-success', partial: 'badge-warning', unreconciled: 'badge-danger' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Payment Reconciliation</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-ai" onClick={() => runAI()}>AI Analyze All</button>
          <button className="btn btn-success" onClick={() => setShowForm(true)}>+ New Payment</button>
        </div>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
          <option value="all">All Statuses</option>
          <option value="reconciled">Reconciled</option>
          <option value="partial">Partial</option>
          <option value="unreconciled">Unreconciled</option>
        </select>
        {selected.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-count">{selected.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={() => bulkStatus('reconciled')}>Mark Reconciled</button>
            <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Delete Selected</button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th>Ref</th><th>Payer</th><th>Amount</th><th>Method</th><th>Invoice</th><th>Status</th><th>Difference</th><th>Date</th><th>AI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => toggleSelect(item.id, e)} /></td>
                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{item.payment_ref}</td>
                <td>{item.payer_name}</td>
                <td className="amount">${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>{item.payment_method}</td>
                <td>{item.invoice_number || '—'}</td>
                <td>{getStatusBadge(item.reconciliation_status)}</td>
                <td className={`amount ${Number(item.difference_amount) !== 0 ? 'amount-negative' : ''}`}>
                  ${Number(item.difference_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td>{new Date(item.payment_date).toLocaleDateString()}</td>
                <td><button className="btn btn-ai btn-sm" onClick={(e) => { e.stopPropagation(); runAI(item.id); }}>AI</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControl pagination={pagination} onPageChange={(p) => { setPage(p); setSelected(new Set()); }} />
      <AIResultDisplay result={aiResult} loading={aiLoading} />

      {selectedItem && !editItem && (
        <DetailModal title={`Payment ${selectedItem.payment_ref}`} item={selectedItem} fields={detailFields}
          onClose={() => setSelectedItem(null)} onEdit={setEditItem} onDelete={handleDelete} />
      )}
      {editItem && (
        <FormModal title={`Edit Payment ${editItem.payment_ref}`} fields={formFields} initialData={editItem}
          onSave={handleUpdate} onClose={() => setEditItem(null)} />
      )}
      {showForm && (
        <FormModal title="New Payment" fields={formFields} onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
