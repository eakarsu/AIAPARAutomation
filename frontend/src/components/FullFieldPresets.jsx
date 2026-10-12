import React from 'react';

export function fillEveryField(values, variant = 0, choices = {}) {
  const names = ['Invoice matching review', 'Payment reconciliation review', 'Receivables follow-up'];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (/(^id$|_id$|Id$|(?:reference|ref)$|^file$|_file$|File$|upload|attachment|created_at|updated_at|user_id)/i.test(key)) return [key, value];
    if (key === 'ai_suggestions') return [key, value];
    if (Array.isArray(choices[key]) && choices[key].length) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [`${names[variant]} example`, 'Review evidence and record any material variance']];
    if (value && typeof value === 'object') return [key, value];
    if (typeof value === 'boolean') return [key, true];
    if (/date|deadline|valid_until/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, key === 'scheduled_date' ? 16 : 10)];
    if (/email/.test(key)) return [key, `finance-review-${variant + 1}@example.com`];
    if (/photo_name|filename/.test(key)) return [key, value];
    if (/budget|price|cost|amount/.test(key)) return [key, [2400, 650, 4200][variant]];
    if (/duration/.test(key)) return [key, [6, 2, 8][variant]];
    if (typeof value === 'number') return [key, [3, 2, 5][variant]];
    if (/location|address|market/.test(key)) return [key, ['Accounts payable office', 'Bank reconciliation team', 'Receivables team'][variant]];
    if (/status/.test(key)) return [key, 'Pending'];
    if (/tone/.test(key)) return [key, ['Professional', 'Friendly', 'Executive'][variant]];
    if (/type/.test(key)) return [key, ['Invoice review', 'Payment review', 'Receivables review'][variant]];
    if (/title|name/.test(key)) return [key, names[variant]];
    return [key, `${names[variant]} example: compare available AP/AR records, flag missing evidence, and recommend a review action without claiming a payment or approval occurred.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false }) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Invoice review', 'Payment review', 'Receivables review'];
  return <div className="ai-preset-bar"><div><strong>Fill every field</strong><p>Each example fills required and optional fields. Review real record references and uploads before generating.</p></div><div className="ai-actions">{labels.map((label, index) => <button type="button" className="btn btn-secondary" key={label} disabled={disabled} onClick={() => onChange(presets ? { ...value, ...presets[index].values } : fillEveryField(value, index, choices))}>{label}</button>)}</div></div>;
}
