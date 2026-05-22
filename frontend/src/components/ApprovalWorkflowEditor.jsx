import React, { useEffect, useState } from 'react';

// Approval Workflow Rules Editor — non-viz, CRUD.
// Backend supports per-rule POST (create), PUT (update), DELETE (remove)
// plus bulk POST { name, steps[] } (replace). This UI uses the granular
// endpoints so each row is an independent CRUD operation.
const ACTIONS = ['review_and_code', 'approve', 'final_approve', 'notify_only'];

export default function ApprovalWorkflowEditor({ token }) {
  const [name, setName] = useState('');
  const [rules, setRules] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);
  const [draft, setDraft] = useState({ role: 'Reviewer', threshold: 0, action: 'approve', sla_hours: 24 });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const applySnapshot = (d) => {
    setName(d.name);
    setRules(d.rules || d.steps || []);
    setUpdatedAt(d.updated_at);
  };

  const load = () => {
    setLoading(true);
    fetch('/api/custom-views/approval-workflow', { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(applySnapshot)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const flash = (msg) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2200);
  };

  const createRule = async () => {
    setBusyId('new'); setError(null);
    try {
      const res = await fetch('/api/custom-views/approval-workflow', {
        method: 'POST', headers, body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      applySnapshot(d.workflow);
      flash('Rule added');
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const updateRule = async (rule, patch) => {
    setBusyId(rule.id); setError(null);
    try {
      const res = await fetch(`/api/custom-views/approval-workflow/${rule.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ ...rule, ...patch }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      applySnapshot(d.workflow);
      flash('Rule updated');
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const deleteRule = async (id) => {
    setBusyId(id); setError(null);
    try {
      const res = await fetch(`/api/custom-views/approval-workflow/${id}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      applySnapshot(d.workflow);
      flash('Rule removed');
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const saveAll = async () => {
    setBusyId('all'); setError(null);
    try {
      const res = await fetch('/api/custom-views/approval-workflow', {
        method: 'POST', headers, body: JSON.stringify({ name, steps: rules }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      applySnapshot(d.workflow);
      flash('Workflow saved');
    } catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading workflow…</div>;

  return (
    <div data-testid="approval-workflow-editor" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#e2e8f0' }}>Approval Workflow Rules</h3>
        {updatedAt && (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Updated: {new Date(updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
        Workflow name
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>

      <table style={{ width: '100%', color: '#cbd5e1', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', width: 40 }}>ID</th>
            <th style={{ padding: '6px 8px' }}>Role</th>
            <th style={{ padding: '6px 8px' }}>Threshold ($)</th>
            <th style={{ padding: '6px 8px' }}>Action</th>
            <th style={{ padding: '6px 8px' }}>SLA (h)</th>
            <th style={{ padding: '6px 8px', width: 140 }}></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #1e293b' }}>
              <td style={{ padding: '6px 8px', color: '#64748b' }}>{r.id}</td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  defaultValue={r.role}
                  onBlur={(e) => e.target.value !== r.role && updateRule(r, { role: e.target.value })}
                  style={inputStyle}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  type="number"
                  defaultValue={r.threshold}
                  onBlur={(e) => Number(e.target.value) !== r.threshold && updateRule(r, { threshold: Number(e.target.value) })}
                  style={{ ...inputStyle, width: 120 }}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <select
                  defaultValue={r.action}
                  onChange={(e) => updateRule(r, { action: e.target.value })}
                  style={inputStyle}
                >
                  {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  type="number"
                  defaultValue={r.sla_hours}
                  onBlur={(e) => Number(e.target.value) !== r.sla_hours && updateRule(r, { sla_hours: Number(e.target.value) })}
                  style={{ ...inputStyle, width: 80 }}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <button
                  onClick={() => deleteRule(r.id)}
                  disabled={busyId === r.id}
                  style={dangerBtn}
                >
                  {busyId === r.id ? '…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 14, padding: 10, border: '1px dashed #334155', borderRadius: 6 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Add new rule</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr 0.8fr auto', gap: 8 }}>
          <input
            placeholder="Role"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Threshold"
            value={draft.threshold}
            onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })}
            style={inputStyle}
          />
          <select value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} style={inputStyle}>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            type="number"
            placeholder="SLA h"
            value={draft.sla_hours}
            onChange={(e) => setDraft({ ...draft, sla_hours: Number(e.target.value) })}
            style={inputStyle}
          />
          <button onClick={createRule} disabled={busyId === 'new'} style={btnStyle}>
            {busyId === 'new' ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <button onClick={saveAll} disabled={busyId === 'all'} style={{ ...btnStyle, background: '#1e293b', color: '#cbd5e1' }}>
          {busyId === 'all' ? 'Saving…' : 'Save name + reorder'}
        </button>
        {savedMsg && <span style={{ color: '#22c55e' }}>{savedMsg}</span>}
        {error && <span style={{ color: '#ef4444' }}>Error: {error}</span>}
      </div>
    </div>
  );
}

const inputStyle = { padding: '6px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', width: '100%' };
const btnStyle = { padding: '8px 16px', background: '#2d5be3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 };
const dangerBtn = { padding: '4px 10px', background: '#1e293b', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
