import React, { useState, useEffect } from 'react';

export default function FormModal({ title, fields, initialData, onSave, onClose }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (initialData) {
      const data = { ...initialData };
      // Format date fields
      fields.forEach((f) => {
        if (f.type === 'date' && data[f.key]) {
          data[f.key] = data[f.key].split('T')[0];
        }
      });
      setFormData(data);
    } else {
      const defaults = {};
      fields.forEach((f) => { defaults[f.key] = f.defaultValue || ''; });
      setFormData(defaults);
    }
  }, [initialData, fields]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {fields.map((field) => (
                <div key={field.key} className="form-group" style={field.full ? { gridColumn: '1 / -1' } : {}}>
                  <label>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      required={field.required}
                      step={field.type === 'number' ? '0.01' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success">{initialData ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
