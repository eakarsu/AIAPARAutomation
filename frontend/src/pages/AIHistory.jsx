import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ai } from '../services/api';
import PaginationControl from '../components/PaginationControl';

const moduleLabels = {
  'invoice-matching': 'Invoice Matching',
  'payment-reconciliation': 'Payment Reconciliation',
  'dunning-optimization': 'Dunning Optimization',
  'cash-application': 'Cash Application',
  'discount-capture': 'Discount Capture',
  'aging-analysis': 'Aging Analysis',
  'dunning-strategy': 'Dunning Letter',
  'cash-flow-forecast': 'Cash Flow Forecast',
  'detect-anomalies': 'Anomaly Detection',
  'vendor-health': 'Vendor Health',
  'credit-advisor': 'Credit Advisor',
  'intercompany-optimizer': 'Intercompany',
  'tax-compliance': 'Tax Compliance',
  'discount-dashboard': 'Discount Dashboard',
};

export default function AIHistory() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit: 20 };
      if (moduleFilter) params.module = moduleFilter;
      const data = await ai.history(params);
      setItems(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(page); }, [page, moduleFilter]);

  const loadDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const d = await ai.historyItem(id);
      setSelected(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>AI Analysis History</h1>
        <p style={{ color: '#94a3b8' }}>Browse all past AI analyses by module and date.</p>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select
          value={moduleFilter}
          onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
          style={{ padding: 10, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
        >
          <option value="">All modules</option>
          {Object.entries(moduleLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div>
          <div className="data-table-container">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Module</th>
                    <th>Summary</th>
                    <th>Model</th>
                    <th>Tokens</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => loadDetail(item.id)}
                      style={{ cursor: 'pointer', background: selected?.id === item.id ? '#1e293b' : undefined }}
                    >
                      <td style={{ color: '#60a5fa', fontWeight: 600 }}>#{item.id}</td>
                      <td><span className="badge badge-gray">{moduleLabels[item.module] || item.module}</span></td>
                      <td style={{ color: '#94a3b8', fontSize: 12, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.prompt_summary || '—'}
                      </td>
                      <td style={{ fontSize: 11, color: '#64748b' }}>{item.model?.split('/').pop() || '—'}</td>
                      <td style={{ fontSize: 12 }}>{item.tokens_used ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {items.length === 0 && !loading && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No AI results yet.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <PaginationControl pagination={pagination} onPageChange={(p) => setPage(p)} />
        </div>

        {selected && (
          <div className="card" style={{ position: 'sticky', top: 16, maxHeight: '80vh', overflowY: 'auto' }}>
            {loadingDetail ? (
              <div style={{ color: '#94a3b8' }}>Loading detail...</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3>Result #{selected.id} — {moduleLabels[selected.module] || selected.module}</h3>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  {new Date(selected.created_at).toLocaleString()} | Tokens: {selected.tokens_used ?? '—'} | Model: {selected.model}
                </div>
                {selected.prompt_summary && (
                  <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>{selected.prompt_summary}</p>
                )}
                <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12, background: '#0f172a', padding: 12, borderRadius: 6 }}>
                  {selected.raw_text || JSON.stringify(selected.result, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
