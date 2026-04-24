import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Settings({ token, user, onUpdateUser }) {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/settings/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setProfile({ name: data.name, email: data.email }));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    try {
      const res = await fetch('/api/settings/profile', { method: 'PUT', headers, body: JSON.stringify(profile) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const data = await res.json();
      setProfileMsg('Profile updated successfully');
      if (onUpdateUser) onUpdateUser({ ...user, name: data.name, email: data.email });
    } catch (err) {
      setProfileErr(err.message);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordErr('New passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 4) {
      setPasswordErr('Password must be at least 4 characters');
      return;
    }
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PUT', headers,
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setPasswordMsg('Password updated successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordErr(err.message);
    }
  };

  return (
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Profile */}
        <div className="data-table-container" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Profile</h3>
          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input type="text" value={user?.role || 'user'} disabled style={{ opacity: 0.6 }} />
            </div>
            {profileMsg && <div style={{ color: '#34d399', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: 6 }}>{profileMsg}</div>}
            {profileErr && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>{profileErr}</div>}
            <button type="submit" className="btn btn-success">Save Profile</button>
          </form>
        </div>

        {/* Password */}
        <div className="data-table-container" style={{ padding: 28 }}>
          <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
            </div>
            {passwordMsg && <div style={{ color: '#34d399', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: 6 }}>{passwordMsg}</div>}
            {passwordErr && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>{passwordErr}</div>}
            <button type="submit" className="btn btn-success">Update Password</button>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="data-table-container" style={{ padding: 28, marginTop: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Account Information</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">User ID</div>
            <div className="detail-value">{user?.id}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Role</div>
            <div className="detail-value"><span className={`badge ${user?.role === 'admin' ? 'badge-purple' : 'badge-info'}`}>{user?.role}</span></div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Email</div>
            <div className="detail-value">{user?.email}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Name</div>
            <div className="detail-value">{user?.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
