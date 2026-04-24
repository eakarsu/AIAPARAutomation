import React, { useState, useEffect } from 'react';
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
import Navbar from './components/Navbar';

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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
