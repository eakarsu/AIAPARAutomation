import React from 'react';

export default function PaginationControl({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', color: '#94a3b8', fontSize: 13 }}>
      <span>Showing {start}–{end} of {total} records</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          style={{ padding: '4px 10px', borderRadius: 4, background: page === 1 ? '#1e293b' : '#2d5be3', color: 'white', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
        >«</button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{ padding: '4px 10px', borderRadius: 4, background: page === 1 ? '#1e293b' : '#2d5be3', color: 'white', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
        >‹ Prev</button>

        {/* Page numbers (show up to 5 around current page) */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} style={{ padding: '4px 6px', color: '#64748b' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                style={{
                  padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: p === page ? '#2d5be3' : '#1e293b',
                  color: p === page ? 'white' : '#94a3b8',
                  fontWeight: p === page ? 700 : 400,
                }}
              >{p}</button>
            )
          )
        }

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{ padding: '4px 10px', borderRadius: 4, background: page === totalPages ? '#1e293b' : '#2d5be3', color: 'white', border: 'none', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
        >Next ›</button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          style={{ padding: '4px 10px', borderRadius: 4, background: page === totalPages ? '#1e293b' : '#2d5be3', color: 'white', border: 'none', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
        >»</button>
      </div>
    </div>
  );
}
