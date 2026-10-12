import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AIReport from './AIReport';
import FullFieldPresets from './FullFieldPresets';
import Modal from './AIWorkspaceModal';

const API = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '').replace(/\/api$/, '');
export const workspaceFields = [
  { key: 'input', label: 'Request / brief', required: true, wide: true },
  { key: 'context', label: 'Background and client context', wide: true },
  { key: 'goal', label: 'Desired outcome', required: true },
  { key: 'audience', label: 'Audience' },
  { key: 'source_data', label: 'Source data and observations', wide: true },
  { key: 'constraints', label: 'Constraints and requirements', wide: true },
  { key: 'budget', label: 'Budget and resources' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
  { key: 'tone', label: 'Writing tone', options: ['Professional', 'Friendly', 'Executive'] },
  { key: 'output_format', label: 'Report format', options: ['Summary and action plan', 'Detailed report', 'Executive briefing'] },
];
const emptyFields = () => Object.fromEntries(workspaceFields.map((field) => [field.key, '']));
const readResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data;
};

export function workspacePresets(feature) {
  const samples = feature.samples || [];
  return ['Scenario', 'Data sample', 'Executive review'].map((label, index) => ({ label, values: {
    input: samples[index]?.value || `Prepare a ${feature.title} report for this example. Identify priorities, assumptions, risks, and next steps.`,
    context: `Example AP/AR planning exercise for ${feature.title}. A finance owner needs a practical review before changing a record or committing funds.`,
    goal: ['Prepare an achievable plan with priorities and owners.', 'Identify patterns, gaps, and corrective actions in the supplied observations.', 'Explain the available options and the decisions needed today.'][index],
    audience: ['Accounts payable analyst and reviewer', 'Accounts receivable manager and reviewers', 'Finance leadership and controllers'][index],
    source_data: ['Illustrative invoice review: a vendor invoice, purchase order, and receipt disagree on one line. Confirm actual records before matching.', 'Illustrative reconciliation: a bank payment has a partial invoice reference; one remittance note is missing; no write-off is approved.', 'Illustrative receivables review: an overdue balance has a pending dispute and no documented promise-to-pay. Separate evidence from assumptions.'][index],
    constraints: ['Use existing financial records; protect customer details; flag unverified matches and approvals.', 'Prioritize material exceptions; identify missing remittance evidence; do not invent transaction IDs.', 'Compare exposure, due dates, dependencies, and risk; include decisions for finance review.'][index],
    budget: ['Illustrative review capacity: two analysts; $2,400 exposure', 'Illustrative variance: $650; use existing reconciliation staff', 'Illustrative overdue balance: $4,200; approval required for any adjustment'][index],
    deadline: new Date(Date.now() + (index + 7) * 86400000).toISOString().slice(0, 10),
    tone: ['Professional', 'Friendly', 'Executive'][index],
    output_format: ['Summary and action plan', 'Detailed report', 'Executive briefing'][index],
  } })).map((preset, index) => ({
    label: feature.presets?.[index]?.label || preset.label,
    values: { ...preset.values, ...feature.presets?.[index]?.values },
  }));
}

export default function AIWorkspace({ feature, token: suppliedToken, sourceData = '' }) {
  const [fields, setFields] = useState(() => ({...emptyFields(),source_data:sourceData}));
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(null);
  const historyRequest = useRef(null);
  const formRef = useRef(null);
  const token = suppliedToken || (typeof window === 'undefined' ? '' : [localStorage.getItem("token"), localStorage.getItem('token'), localStorage.getItem('authToken')].find(Boolean) || '');
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token]);
  const endpoint = `${API}/api/report-workspace`;
  const loadHistory = useCallback(async (signal) => {
    historyRequest.current?.abort();
    const controller = new AbortController(); historyRequest.current = controller;
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', abort, { once: true });
    setHistoryLoading(true); setHistoryError('');
    try {
      const response = await fetch(`${endpoint}/runs?feature=${encodeURIComponent(feature.id)}`, { headers, signal: controller.signal });
      const data = await readResponse(response);
      if (!Array.isArray(data.items)) throw new Error('Saved report history returned an invalid response.');
      if (historyRequest.current === controller && !controller.signal.aborted) setHistory(data.items);
    } catch (failure) {
      if (historyRequest.current === controller && !controller.signal.aborted && failure.name !== 'AbortError') setHistoryError(failure.message);
      throw failure;
    } finally {
      signal?.removeEventListener('abort', abort);
      if (historyRequest.current === controller && !controller.signal.aborted) { historyRequest.current = null; setHistoryLoading(false); }
    }
  }, [endpoint, feature.id, headers]);
  useEffect(() => {
    const controller = new AbortController();
    loadHistory(controller.signal).catch(() => {});
    return () => { controller.abort(); historyRequest.current?.abort(); historyRequest.current = null; request.current?.abort(); request.current = null; };
    // A feature route owns its form, result, and history.
  }, [loadHistory]);

  const cancel = () => { request.current?.abort(); request.current = null; setLoading(false); setMessage('Request cancelled.'); };
  const run = async (event) => {
    event.preventDefault(); if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setMessage(''); setResult(null);
    try {
      const response = await fetch(`${endpoint}/run`, { method: 'POST', headers, signal: controller.signal, body: JSON.stringify({ feature: feature.id, fields, ...(editingId ? { id: editingId } : {}) }) });
      const data = await readResponse(response);
      if (request.current !== controller) return;
      if (!data.item?.id) throw new Error('The report service returned an invalid saved report.');
      setResult(data.item); setEditingId(data.item.id); setMessage('Report saved to your history.');
      await loadHistory(controller.signal);
    } catch (failure) { if (request.current === controller && failure.name !== 'AbortError') setError(failure.message); }
    finally { if (request.current === controller) { request.current = null; setLoading(false); } }
  };
  const edit = (item) => {
    setFields({ ...emptyFields(), ...item.input }); setEditingId(item.id); setResult(item.status==='draft'?null:item); setSelected(null); setDeleting(false); setError(''); setMessage('Edit any field, then generate the updated report.');
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const remove = async () => {
    const response = await fetch(`${endpoint}/runs/${selected.id}`, { method: 'DELETE', headers });
    await readResponse(response);
    if (editingId === selected.id) { setEditingId(null); setResult(null); }
    setSelected(null); setDeleting(false); setMessage('Saved report deleted.'); await loadHistory();
  };
  return <section className="ai-workspace"><header className="ai-workspace-heading"><span className="ai-eyebrow">AI workspace · OpenRouter</span><h1>{feature.title}</h1><p>{feature.description}</p></header>
    <form className="ai-workspace-panel" onSubmit={run} ref={formRef}>
      <FullFieldPresets value={fields} presets={workspacePresets(feature)} disabled={loading} onChange={(next) => { setFields({...next,...(fields.source_data?.trim()?{source_data:fields.source_data}:{})}); setResult(null); setError(''); setMessage('All 10 fields filled, including optional fields. Review the example before generating.'); }} />
      <div className="ai-form-grid">{workspaceFields.map((field) => <div key={field.key} className={`ai-form-field ${field.wide ? 'ai-form-field-wide' : ''}`}><label htmlFor={`${feature.id}-${field.key}`}>{field.label}<span>{field.required ? 'Required' : 'Optional'}</span></label>{field.options ? <select id={`${feature.id}-${field.key}`} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })}><option value="">Select…</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.type ? <input id={`${feature.id}-${field.key}`} type={field.type} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })} /> : <textarea id={`${feature.id}-${field.key}`} rows={field.wide ? 4 : 2} required={field.required} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })} />}</div>)}</div>
      <footer className="ai-workspace-footer"><p className="ai-muted">Review the brief and any examples before generating.</p><div className="ai-actions"><button type="button" className="btn btn-secondary" onClick={() => { if (loading) cancel(); else { setFields({...emptyFields(),source_data:sourceData}); setResult(null); setEditingId(null); setError(''); setMessage('Form cleared.'); } }}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading || !fields.input.trim() || !fields.goal.trim()}>{loading ? 'Generating report…' : 'Generate with OpenRouter'}</button></div></footer>
    </form>
    {message && <p role="status" className="ai-muted">{message}</p>}
    <AIReport response={result} loading={loading} error={error} title={feature.title} onRetry={() => formRef.current?.requestSubmit()} />
    <section className="ai-history"><h2>Saved planning drafts and reports</h2><p className="ai-muted">Open a saved draft or generated report to review its inputs, edit, or delete it. Drafts have no AI answer.</p>{historyLoading ? <p role="status" className="ai-muted">Loading saved report history…</p> : historyError ? <div className="native-load-error" role="alert"><strong>Saved report history could not be loaded.</strong><p>{historyError}</p><button type="button" className="btn btn-secondary" onClick={() => loadHistory().catch(() => {})}>Retry</button></div> : !history.length ? <p className="ai-muted">Your generated reports will appear here.</p> : history.map((item) => <button type="button" className="ai-history-row" key={item.id} onClick={() => { setSelected(item); setDeleting(false); }}><span><strong>{String(item.input?.goal || feature.title).slice(0, 100)}</strong><br /><small className="ai-muted">{new Date(item.created_at).toLocaleString()} · {item.status==='draft'?'Draft · Not generated':item.model}</small></span><span>{item.status==='draft'?'Open planning draft →':'Open report →'}</span></button>)}</section>
    {selected && <Modal className="ai-workspace-dialog" title={deleting ? 'Delete saved report?' : feature.title} onClose={() => { setSelected(null); setDeleting(false); }} footer={<><button type="button" className="btn btn-secondary" onClick={() => { setSelected(null); setDeleting(false); }}>Cancel</button>{!deleting && <button type="button" className="btn btn-secondary" onClick={() => edit(selected)}>Edit</button>}<button type="button" className="btn btn-danger" onClick={() => { if (!deleting) setDeleting(true); else remove().catch((failure) => setError(failure.message)); }}>{deleting ? 'Confirm delete' : 'Delete'}</button></>}>
      {error&&<p role="alert">{error}</p>}
      {deleting ? <p>This deletes the saved report from your history.</p> : <>{selected.status==='draft'?<div className="ai-muted" role="note"><strong>Planning draft · Not generated</strong><p>No provider answer, model execution, approval, payment, or external action is claimed. Choose Edit, review all supplied fields, then generate with OpenRouter.</p></div>:<AIReport response={selected} title={feature.title} />}<details open={selected.status==='draft'}><summary>Request inputs</summary><dl>{workspaceFields.map((field) => <React.Fragment key={field.key}><dt><strong>{field.label}</strong></dt><dd>{String(selected.input?.[field.key] || 'Not provided')}</dd></React.Fragment>)}</dl></details></>}
    </Modal>}
  </section>;
}
