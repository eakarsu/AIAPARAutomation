import React from 'react';
import AgingReportChart from '../components/AgingReportChart';
import CashflowForecast from '../components/CashflowForecast';
import InvoicePdfPanel from '../components/InvoicePdfPanel';
import ApprovalWorkflowEditor from '../components/ApprovalWorkflowEditor';

export default function CustomViewsPage({ token }) {
  return (
    <div data-testid="custom-views-page" style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#e2e8f0', margin: 0 }}>Finance Views</h1>
        <p style={{ color: '#94a3b8', marginTop: 4 }}>
          Synthesized views for accounts payable / receivable analytics, document generation,
          and approval workflow configuration.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
        <AgingReportChart token={token} />
        <CashflowForecast token={token} />
      </div>

      <div style={{ height: 20 }} />

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }}>
        <InvoicePdfPanel token={token} />
        <ApprovalWorkflowEditor token={token} />
      </div>
    </div>
  );
}
