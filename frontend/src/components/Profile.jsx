import { useState, useEffect, useCallback } from 'react';
import '../styles/Profile.css';

export default function Profile({ token, apiKey, onLogout }) {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.status === 'success') {
        setUser(data.user);
        setEditForm({
          name: data.user.name,
          email: data.user.email,
        });
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [fetchProfile, token]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/user/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setUser(data.user);
        setMessage('✅ Profile updated successfully');
        setEditMode(false);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/user/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessage('✅ Password changed successfully');
        setPasswordMode(false);
        setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  const handleRegenerateAPIKey = async () => {
    if (!confirm('Are you sure? This will invalidate your current API key.')) {
      return;
    }

    try {
      const response = await fetch('/api/user/api-key/regenerate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessage('🔑 API key regenerated! Logging out for security...');
        setTimeout(() => onLogout(), 2000);
      } else {
        setError('Failed to regenerate API key');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey || user?.api_key || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} /> &nbsp; Loading Profile…
      </div>
    );
  }

  return (
    <div className="profile-wrapper animate-fadeIn">
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="profile-grid">
        {/* Left Column: Avatar & Summary */}
        <div className="profile-sidebar-card">
          <div className="profile-avatar-large">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <h2 className="profile-name-title">{user?.name}</h2>
          <p className="profile-role-tag">@{user?.username}</p>
          <div className="profile-badge-pill">Developer Mode Active</div>
          
          <div className="profile-quick-stats">
            <div className="profile-stat-item">
              <span className="stat-num">Active</span>
              <span className="stat-lbl">Account Status</span>
            </div>
            <div className="profile-stat-item">
              <span className="stat-num">v2.0</span>
              <span className="stat-lbl">API Version</span>
            </div>
          </div>

          <button onClick={onLogout} className="btn btn-logout-full">
            🚪 Log Out of Session
          </button>
        </div>

        {/* Right Column: Cards & Details */}
        <div className="profile-main-content">
          {/* Card 1: User Profile details */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h3 className="card-title">👤 Personal Information</h3>
                <p className="card-subtitle">Manage your account details and contacts</p>
              </div>
              {!editMode && (
                <button className="btn btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setEditMode(true)}>
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {!editMode ? (
              <div className="profile-details-list">
                <div className="profile-details-row">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-val">{user?.name}</span>
                </div>
                <div className="profile-details-row">
                  <span className="detail-label">Username</span>
                  <span className="detail-val">@{user?.username}</span>
                </div>
                <div className="profile-details-row">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-val">{user?.email}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="form-grid">
                <div className="form-group full">
                  <label>Full Name</label>
                  <input required name="name" value={editForm.name} onChange={handleEditChange} placeholder="Enter your full name" />
                </div>
                <div className="form-group full">
                  <label>Email Address</label>
                  <input required type="email" name="email" value={editForm.email} onChange={handleEditChange} placeholder="your@email.com" />
                </div>
                <div className="button-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, marginTop: 0 }}>💾 Save Changes</button>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Card 2: Security & Password */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h3 className="card-title">🔐 Security Credentials</h3>
                <p className="card-subtitle">Keep your account secure by resetting your password</p>
              </div>
              {!passwordMode && (
                <button className="btn btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setPasswordMode(true)}>
                  🔑 Change Password
                </button>
              )}
            </div>

            {passwordMode && (
              <form onSubmit={handleChangePassword} className="form-grid">
                <div className="form-group full">
                  <label>Current Password</label>
                  <input required type="password" name="old_password" value={passwordForm.old_password} onChange={handlePasswordChange} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input required type="password" name="new_password" value={passwordForm.new_password} onChange={handlePasswordChange} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input required type="password" name="confirm_password" value={passwordForm.confirm_password} onChange={handlePasswordChange} placeholder="••••••••" />
                </div>
                <div className="button-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, marginTop: 0 }}>🔒 Update Password</button>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setPasswordMode(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Card 3: Developer Settings & API Key */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div>
                <h3 className="card-title" style={{ color: 'var(--primary)' }}>⚡ Developer Settings</h3>
                <p className="card-subtitle">Use your unique API key to communicate with the Microservices directly</p>
              </div>
            </div>

            <div className="api-section-box">
              <span className="api-key-label">Your Secure API Key</span>
              <div className="api-key-container">
                <code className="api-key-code">
                  {showKey ? (apiKey || user?.api_key) : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                </code>
                <div className="api-key-actions">
                  <button type="button" className="btn btn-ghost api-btn" onClick={() => setShowKey(!showKey)}>
                    {showKey ? '👁️ Hide' : '👁️ Show'}
                  </button>
                  <button type="button" className="btn btn-ghost api-btn" onClick={handleCopyKey}>
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>

              <div className="api-key-warning-row">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text-profile">
                  Keep this key secret! Do not share it or commit it to public repositories. Regenerating will instantly invalidate the old key.
                </span>
              </div>

              <button type="button" className="btn btn-regenerate-premium" onClick={handleRegenerateAPIKey}>
                ♻️ Regenerate Developer API Key
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
