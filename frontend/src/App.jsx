import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InvoiceMatching from './pages/InvoiceMatching';
import PaymentReconciliation from './pages/PaymentReconciliation';
import DunningOptimization from './pages/DunningOptimization';
import CashApplication from './pages/CashApplication';
import DiscountCapture from './pages/DiscountCapture';
import AgingAnalysis from './pages/AgingAnalysis';
import Reports from './pages/Reports';
import Contacts from './pages/Contacts';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import Alerts from './pages/Alerts';
import VendorHealth from './pages/VendorHealth';
import CreditAdvisor from './pages/CreditAdvisor';
import DunningLetterGenerator from './pages/DunningLetterGenerator';
import InvoiceAnomalyDetector from './pages/InvoiceAnomalyDetector';
import CashFlowForecast from './pages/CashFlowForecast';
import IntercompanyOptimizer from './pages/IntercompanyOptimizer';
import TaxCompliance from './pages/TaxCompliance';
import DiscountDashboard from './pages/DiscountDashboard';
import AIHistory from './pages/AIHistory';
import ThreeWayMatching from './pages/ThreeWayMatching';
import VendorFraudDetection from './pages/VendorFraudDetection';
import MultiCurrencyFx from './pages/MultiCurrencyFx';
import ErpMappingSuggest from './pages/ErpMappingSuggest';
import CustomViewsPage from './pages/CustomViewsPage';
import PaymentRunApprovalMatrix from './pages/PaymentRunApprovalMatrix';
import Navbar from './components/Navbar';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogin = (tokenVal, userVal) => {
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('user', JSON.stringify(userVal));
    setToken(tokenVal);
    setUser(userVal);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const handleUpdateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/" element={<Dashboard token={token} />} />
          <Route path="/invoice-matching" element={<InvoiceMatching token={token} />} />
          <Route path="/payment-reconciliation" element={<PaymentReconciliation token={token} />} />
          <Route path="/dunning-optimization" element={<DunningOptimization token={token} />} />
          <Route path="/cash-application" element={<CashApplication token={token} />} />
          <Route path="/discount-capture" element={<DiscountCapture token={token} />} />
          <Route path="/aging-analysis" element={<AgingAnalysis token={token} />} />
          <Route path="/reports" element={<Reports token={token} />} />
          <Route path="/contacts" element={<Contacts token={token} />} />
          <Route path="/audit-log" element={<AuditLog token={token} />} />
          <Route path="/settings" element={<Settings token={token} user={user} onUpdateUser={handleUpdateUser} />} />
          <Route path="/alerts" element={<Alerts token={token} />} />
          <Route path="/vendor-health" element={<VendorHealth token={token} />} />
          <Route path="/credit-advisor" element={<CreditAdvisor token={token} />} />
          <Route path="/dunning-letter" element={<DunningLetterGenerator token={token} />} />
          <Route path="/invoice-anomaly" element={<InvoiceAnomalyDetector token={token} />} />
          <Route path="/cash-forecast" element={<CashFlowForecast token={token} />} />
          <Route path="/intercompany" element={<IntercompanyOptimizer token={token} />} />
          <Route path="/tax-compliance" element={<TaxCompliance token={token} />} />
          <Route path="/discount-dashboard" element={<DiscountDashboard token={token} />} />
          <Route path="/ai-history" element={<AIHistory token={token} />} />
          <Route path="/three-way-matching" element={<ThreeWayMatching token={token} />} />
          <Route path="/vendor-fraud-detection" element={<VendorFraudDetection token={token} />} />
          <Route path="/multi-currency-fx" element={<MultiCurrencyFx token={token} />} />
          <Route path="/erp-mapping-suggest" element={<ErpMappingSuggest token={token} />} />
          <Route path="/custom-views" element={<CustomViewsPage token={token} />} />
          <Route path="/payment-run-approval-matrix" element={<PaymentRunApprovalMatrix token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
