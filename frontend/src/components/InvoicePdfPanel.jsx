import React, { useState } from 'react';

// Invoice PDF panel — non-viz; lets the user generate / preview an invoice PDF.
// The PDF endpoint requires Authorization: Bearer <token>, so we fetch the
// PDF as a blob and open it via object URL rather than a plain link.
export default function InvoicePdfPanel({ token }) {
  const [invoice, setInvoice] = useState('INV-1042');
  const [vendor, setVendor] = useState('Cedar Supply Co.');
  const [customer, setCustomer] = useState('Acme Industries');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    try {
      const qs = new URLSearchParams({ invoice, vendor, customer }).toString();
      const res = await fetch(`/api/custom-views/invoice-pdf?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="invoice-pdf-panel" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
      <h3 style={{ margin: '0 0 12px', color: '#e2e8f0' }}>Invoice PDF Generator</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#94a3b8' }}>
          Invoice #
          <input value={invoice} onChange={(e) => setInvoice(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#94a3b8' }}>
          Vendor
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#94a3b8' }}>
          Customer
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={generate} disabled={loading} style={btnStyle}>
          {loading ? 'Generating…' : 'Generate PDF'}
        </button>
        {pdfUrl && (
          <a href={pdfUrl} download={`${invoice}.pdf`} style={{ ...btnStyle, background: '#1e293b', color: '#cbd5e1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Download
          </a>
        )}
      </div>

      {error && <div style={{ color: '#ef4444', marginTop: 8 }}>Error: {error}</div>}

      {pdfUrl && (
        <iframe
          title="invoice-pdf"
          src={pdfUrl}
          style={{ width: '100%', height: 480, border: '1px solid #1e293b', borderRadius: 6, marginTop: 12, background: 'white' }}
        />
      )}
    </div>
  );
}

const inputStyle = { padding: '6px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0' };
const btnStyle = { padding: '8px 16px', background: '#2d5be3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 };
