import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function EditModal({ cred, onClose, onSaved, token }) {
  const [form, setForm] = useState({
    smtp_host: cred.smtp_host,
    smtp_port: cred.smtp_port,
    smtp_pass: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      const res = await axios.put('/api/email/credentials', {
        sender_email: cred.sender_email,
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port,
        smtp_pass: form.smtp_pass,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStatus('✅ ' + res.data.message);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch (err) {
      setStatus('❌ ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Credential</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-email-badge">
          <span className="credential-avatar small">{cred.sender_email ? cred.sender_email[0].toUpperCase() : '?'}</span>
          <span>{cred.sender_email}</span>
        </div>

        <form className="form-grid" onSubmit={handleUpdate}>
          <div className="form-group full">
            <label>SMTP Host</label>
            <input required value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} />
          </div>
          <div className="form-group full">
            <label>SMTP Port</label>
            <input required value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} />
          </div>
          <div className="form-group full">
            <label>New App Password (leave blank to keep current)</label>
            <input type="password" placeholder="••••••••••••••••" value={form.smtp_pass} onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : '💾 Save Changes'}
          </button>
          {status && (
            <div className={status.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'}>
              {status}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function Settings({ token }) {
  const [credentials, setCredentials] = useState([]);
  const [form, setForm] = useState({
    sender_email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_pass: '',
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [editCred, setEditCred] = useState(null);

  const reloadCredentials = useCallback(() => {
    if (token) {
      axios.get('/api/email/credentials', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((r) => setCredentials(r.data))
        .catch(() => setCredentials([]));
    }
  }, [token]);

  useEffect(() => {
    reloadCredentials();
  }, [reloadCredentials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      const res = await axios.post('/api/email/credentials', form, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStatus('✅ ' + res.data.message);
      setForm({ sender_email: '', smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_pass: '' });
      reloadCredentials();
    } catch (err) {
      setStatus('❌ ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handleDelete = async (email) => {
    if (!window.confirm(`Delete credentials for ${email}?`)) return;
    try {
      await axios.delete(`/api/email/credentials?sender=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      reloadCredentials();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">🔐 SMTP Credentials</h2>
          <p className="card-subtitle">Manage Gmail App Passwords — stored with AES-256 encryption</p>
        </div>
        <span className="topbar-badge">{credentials.length} saved</span>
      </div>

      {/* Saved credentials list */}
      <div className="credentials-list">
        {credentials.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <p>No credentials saved yet. Add one below.</p>
          </div>
        )}
        {credentials.map((cred) => (
          <div key={cred.sender_email} className="credential-item">
            <div className="credential-info">
              <div className="credential-avatar">{cred.sender_email ? cred.sender_email[0].toUpperCase() : '?'}</div>
              <div>
                <div className="credential-email">{cred.sender_email}</div>
                <div className="credential-host">{cred.smtp_host}:{cred.smtp_port}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="credential-badge">Saved</span>
              <button
                className="btn btn-ghost"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
                onClick={() => setEditCred(cred)}
              >
                ✏️ Edit
              </button>
              <button
                className="btn btn-danger-ghost"
                style={{ padding: '0.3rem 0.6rem' }}
                onClick={() => handleDelete(cred.sender_email)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new credential */}
      <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-muted)' }}>
          ➕ Add New Credential
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group full">
            <label>Gmail Address (used as Sender)</label>
            <input required type="email" value={form.sender_email} onChange={(e) => setForm({ ...form, sender_email: e.target.value })} placeholder="you@gmail.com" />
          </div>
          <div className="form-group full">
            <label>SMTP Host</label>
            <input required value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} />
          </div>
          <div className="form-group full">
            <label>SMTP Port</label>
            <input required value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} />
          </div>
          <div className="form-group full">
            <label>Google App Password (16-char)</label>
            <input required type="password" value={form.smtp_pass} onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })} placeholder="xxxx xxxx xxxx xxxx" />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : '💾 Save Credential'}
          </button>
          {status && (
            <div className={status.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'}>
              {status}
            </div>
          )}
        </form>
      </div>

      {/* Edit Modal */}
      {editCred && (
        <EditModal
          cred={editCred}
          onClose={() => setEditCred(null)}
          onSaved={reloadCredentials}
          token={token}
        />
      )}
    </div>
  );
}
