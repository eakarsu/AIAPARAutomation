import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResultDisplay from '../components/AIResultDisplay';

const detailFields = [
  { key: 'entity_name', label: 'Entity Name' },
  { key: 'entity_type', label: 'Type' },
  { key: 'total_outstanding', label: 'Total Outstanding', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'current_amount', label: 'Current', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'days_1_30', label: '1-30 Days', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'days_31_60', label: '31-60 Days', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'days_61_90', label: '61-90 Days', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'days_over_90', label: '90+ Days', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
  { key: 'credit_limit', label: 'Credit Limit', render: (v) => v ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—' },
  { key: 'risk_rating', label: 'Risk Rating' },
  { key: 'last_payment_date', label: 'Last Payment', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  { key: 'avg_days_to_pay', label: 'Avg Days to Pay' },
];

const formFields = [
  { key: 'entity_name', label: 'Entity Name', required: true },
  { key: 'entity_type', label: 'Type', type: 'select', options: ['customer', 'vendor'], required: true },
  { key: 'total_outstanding', label: 'Total Outstanding', type: 'number', required: true },
  { key: 'current_amount', label: 'Current', type: 'number' },
  { key: 'days_1_30', label: '1-30 Days', type: 'number' },
  { key: 'days_31_60', label: '31-60 Days', type: 'number' },
  { key: 'days_61_90', label: '61-90 Days', type: 'number' },
  { key: 'days_over_90', label: '90+ Days', type: 'number' },
  { key: 'credit_limit', label: 'Credit Limit', type: 'number' },
  { key: 'risk_rating', label: 'Risk Rating', type: 'select', options: ['low', 'medium', 'high'] },
  { key: 'last_payment_date', label: 'Last Payment Date', type: 'date' },
  { key: 'avg_days_to_pay', label: 'Avg Days to Pay', type: 'number' },
];

export default function AgingAnalysis({ token }) {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    const res = await fetch('/api/aging?limit=200', { headers });
    const data = await res.json();
    setItems(data.data || data);
  };
  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    let result = items;
    if (search) { const s = search.toLowerCase(); result = result.filter(i => i.entity_name.toLowerCase().includes(s)); }
    if (typeFilter !== 'all') result = result.filter(i => i.entity_type === typeFilter);
    if (riskFilter !== 'all') result = result.filter(i => i.risk_rating === riskFilter);
    setFiltered(result);
  }, [items, search, typeFilter, riskFilter]);

  const handleCreate = async (data) => { await fetch('/api/aging', { method: 'POST', headers, body: JSON.stringify(data) }); setShowForm(false); fetchItems(); };
  const handleUpdate = async (data) => { await fetch(`/api/aging/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) }); setEditItem(null); setSelectedItem(null); fetchItems(); };
  const handleDelete = async (id) => { if (!confirm('Delete this aging record?')) return; await fetch(`/api/aging/${id}`, { method: 'DELETE', headers }); setSelectedItem(null); fetchItems(); };

  const runAI = async (itemId) => {
    setAiLoading(true); setAiResult(null);
    try { const res = await fetch('/api/ai/aging-analysis', { method: 'POST', headers, body: JSON.stringify({ agingId: itemId || null }) }); setAiResult(await res.json()); }
    catch (err) { setAiResult({ analysis: 'Error: ' + err.message, timestamp: new Date().toISOString() }); }
    setAiLoading(false);
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next); };
  const toggleAll = () => { selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(i => i.id))); };
  const bulkDelete = async () => { if (!confirm(`Delete ${selected.size} records?`)) return; await fetch('/api/bulk/aging/delete', { method: 'POST', headers, body: JSON.stringify({ ids: [...selected] }) }); setSelected(new Set()); fetchItems(); };
  const handleExport = () => { window.open('/api/export/aging', '_blank'); };

  const getRiskBadge = (risk) => { const map = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger' }; return <span className={`badge ${map[risk] || 'badge-gray'}`}>{risk}</span>; };
  const getTypeBadge = (type) => <span className={`badge ${type === 'customer' ? 'badge-info' : 'badge-purple'}`}>{type}</span>;

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Aging Analysis</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-ai" onClick={() => runAI()}>AI Full Analysis</button>
          <button className="btn btn-success" onClick={() => setShowForm(true)}>+ New Entity</button>
        </div>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="Search entities..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-select">
          <option value="all">All Types</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="filter-select">
          <option value="all">All Risk</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {selected.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-count">{selected.size} selected</span>
            <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Delete Selected</button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th>Entity</th><th>Type</th><th>Total Outstanding</th><th>Current</th><th>1-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Risk</th><th>AI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td><input type="checkbox" checked={selected.has(item.id)} onChange={(e) => toggleSelect(item.id, e)} /></td>
                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{item.entity_name}</td>
                <td>{getTypeBadge(item.entity_type)}</td>
                <td className="amount">${Number(item.total_outstanding).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="amount">${Number(item.current_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="amount">${Number(item.days_1_30).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="amount">${Number(item.days_31_60).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="amount" style={{ color: Number(item.days_61_90) > 0 ? '#fbbf24' : '' }}>
                  ${Number(item.days_61_90).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="amount" style={{ color: Number(item.days_over_90) > 0 ? '#f87171' : '' }}>
                  ${Number(item.days_over_90).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td>{getRiskBadge(item.risk_rating)}</td>
                <td><button className="btn btn-ai btn-sm" onClick={(e) => { e.stopPropagation(); runAI(item.id); }}>AI</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AIResultDisplay result={aiResult} loading={aiLoading} />

      {selectedItem && !editItem && (
        <DetailModal title={`Aging: ${selectedItem.entity_name}`} item={selectedItem} fields={detailFields}
          onClose={() => setSelectedItem(null)} onEdit={setEditItem} onDelete={handleDelete} />
      )}
      {editItem && (
        <FormModal title={`Edit: ${editItem.entity_name}`} fields={formFields} initialData={editItem}
          onSave={handleUpdate} onClose={() => setEditItem(null)} />
      )}
      {showForm && (
        <FormModal title="New Aging Record" fields={formFields} onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
