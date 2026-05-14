import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const detailFields = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'payment_terms', label: 'Payment Terms' },
  { key: 'credit_limit', label: 'Credit Limit', render: (v) => v ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—' },
  { key: 'status', label: 'Status' },
  { key: 'address', label: 'Address', full: true },
  { key: 'notes', label: 'Notes', full: true },
];

const formFields = [
  { key: 'name', label: 'Name', required: true },
  { key: 'type', label: 'Type', type: 'select', options: ['customer', 'vendor'], required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'payment_terms', label: 'Payment Terms' },
  { key: 'credit_limit', label: 'Credit Limit', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
  { key: 'address', label: 'Address', type: 'textarea', full: true },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export default function Contacts({ token }) {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    const res = await fetch('/api/contacts?limit=200', { headers });
    const data = await res.json();
    setItems(data.data || data);
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(s) || i.company?.toLowerCase().includes(s) || i.email?.toLowerCase().includes(s));
    }
    if (typeFilter !== 'all') result = result.filter(i => i.type === typeFilter);
    setFiltered(result);
  }, [items, search, typeFilter]);

  const handleCreate = async (data) => {
    await fetch('/api/contacts', { method: 'POST', headers, body: JSON.stringify(data) });
    setShowForm(false);
    fetchItems();
  };

  const handleUpdate = async (data) => {
    await fetch(`/api/contacts/${data.id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
    setEditItem(null);
    setSelectedItem(null);
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE', headers });
    setSelectedItem(null);
    fetchItems();
  };

  const handleExport = () => {
    window.open(`/api/export/contacts`, '_blank');
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Contacts Directory</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-success" onClick={() => setShowForm(true)}>+ New Contact</button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name, company, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-select">
          <option value="all">All Types</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
        </select>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Terms</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => setSelectedItem(item)}>
                <td style={{ fontWeight: 600, color: '#60a5fa' }}>{item.name}</td>
                <td><span className={`badge ${item.type === 'customer' ? 'badge-info' : 'badge-purple'}`}>{item.type}</span></td>
                <td>{item.company || '—'}</td>
                <td>{item.email || '—'}</td>
                <td>{item.phone || '—'}</td>
                <td>{item.payment_terms || '—'}</td>
                <td><span className={`badge ${item.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && !editItem && (
        <DetailModal title={`${selectedItem.name}`} item={selectedItem} fields={detailFields}
          onClose={() => setSelectedItem(null)} onEdit={setEditItem} onDelete={handleDelete} />
      )}
      {editItem && (
        <FormModal title={`Edit ${editItem.name}`} fields={formFields} initialData={editItem}
          onSave={handleUpdate} onClose={() => setEditItem(null)} />
      )}
      {showForm && (
        <FormModal title="New Contact" fields={formFields} onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
