import React, { useEffect, useState } from 'react';

export default function PaymentRunApprovalMatrix({ token }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/payment-run-approval-matrix', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, [token]);

  return (
    <div className="page-container">
      <h1>Payment Run Approval Matrix</h1>
      <p>Route AP payment batches by amount, vendor risk, cash reserve, and approval authority.</p>
      <div className="stats-grid">
        {data && Object.entries(data.summary).map(([key, value]) => (
          <div className="stat-card" key={key}>
            <span>{key.replaceAll('_', ' ')}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="card">
        {(data?.matrix || []).map((run) => (
          <div key={run.run} style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
            <strong>{run.run}</strong>
            <div>${run.amount} - {run.approver} - {run.risk} risk - {run.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
