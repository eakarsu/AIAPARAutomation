import React from 'react';

export default function DetailModal({ title, item, fields, onClose, onEdit, onDelete }) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            {fields.map((field) => (
              <div key={field.key} className={`detail-item ${field.full ? 'detail-full' : ''}`}>
                <div className="detail-label">{field.label}</div>
                <div className="detail-value">
                  {field.render ? field.render(item[field.key], item) : (item[field.key] ?? '—')}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => onEdit(item)}>Edit</button>
          <button className="btn btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}
