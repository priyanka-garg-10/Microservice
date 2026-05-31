import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function SendEmail({ token }) {
  const [senders, setSenders] = useState([]);
  const [form, setForm] = useState({
    sender: '',
    receivers: [''],
    cc: [''],
    bcc: [''],
    subject: '',
    body: '',
    is_html: false,
  });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const [suggestion, setSuggestion] = useState('');

  // Load saved senders on mount
  useEffect(() => {
    if (token) {
      axios.get('/api/email/credentials', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => setSenders(Array.isArray(r.data) ? r.data : []))
        .catch(() => setSenders([]));
    }
  }, [token]);

  const fetchSuggestion = async (body) => {
    if (body.trim().length < 5 || !form.subject) return;
    try {
      const res = await axios.post('/api/email/suggest',
        { subject: form.subject, body },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestion(' ' + res.data.suggestion);
    } catch { setSuggestion(''); }
  };
  const handleBodyChange = (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, body: val }));
    setSuggestion('');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestion(val), 600);
  };
  const handleBodyKeyDown = (e) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      setForm(prev => ({ ...prev, body: prev.body + suggestion }));
      setSuggestion('');
    }
    if (e.key === 'Escape') setSuggestion('');
  };

  const updateArrayField = (field, idx, value) => {
    setForm(prev => {
      const arr = [...prev[field]];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addRow = (field) => {
    setForm(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeRow = (field, idx) => {
    setForm(prev => {
      const arr = prev[field].filter((_, i) => i !== idx);
      return { ...prev, [field]: arr.length ? arr : [''] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    // Basic client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const collected = [];
    if (form.sender) collected.push(form.sender);
    collected.push(...form.receivers.filter(Boolean));
    collected.push(...form.cc.filter(Boolean));
    collected.push(...form.bcc.filter(Boolean));
    const invalid = collected.find(eAddr => !emailRegex.test(eAddr));
    if (invalid) {
      setStatus('❌ Invalid email address: ' + invalid);
      return;
    }

    if (form.smtp_port && isNaN(Number(form.smtp_port))) {
      setStatus('❌ SMTP port must be a number');
      return;
    }

    setLoading(true);
    const payload = [{
      sender: form.sender,
      receivers: form.receivers.filter(Boolean),
      cc: form.cc.filter(Boolean),
      bcc: form.bcc.filter(Boolean),
      subject: form.subject,
      body: form.body,
      is_html: form.is_html,
      smtp_host: form.smtp_host || undefined,
      smtp_port: form.smtp_port ? Number(form.smtp_port) : undefined,
    }];
    try {
      await axios.post('/api/email/send', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStatus('✅ Email queued successfully!');
      // Reset form
      setForm({
        sender: '',
        receivers: [''],
        cc: [''],
        bcc: [''],
        subject: '',
        body: '',
        is_html: false,
      });
    } catch (err) {
      setStatus('❌ Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📧 Send Email</h2>
        <p className="card-subtitle">Queue multiple recipients, CC/BCC and toggle HTML</p>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        {/* Sender dropdown */}
        <div className="form-group full">
          <label>Sender (Saved Credentials)</label>
          <select required value={form.sender} onChange={e => setForm({ ...form, sender: e.target.value })}>
            <option value="">Select a saved email…</option>
            {senders.map(s => (
              <option key={s.sender_email} value={s.sender_email}>
                {s.sender_email} — {s.smtp_host}:{s.smtp_port}
              </option>
            ))}
          </select>
        </div>

        {/* Receivers */}
        <div className="form-group full">
          <label>To (Receivers)</label>
          <div className="receivers-container">
            {form.receivers.map((val, i) => (
              <div key={i} className="receiver-row">
                <input type="email" required placeholder="receiver@example.com" value={val} onChange={e => updateArrayField('receivers', i, e.target.value)} />
                {form.receivers.length > 1 && <button type="button" className="btn btn-danger-ghost" onClick={() => removeRow('receivers', i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => addRow('receivers')}>+ Add Receiver</button>
          </div>
        </div>

        {/* CC */}
        <div className="form-group full">
          <label>CC (optional)</label>
          <div className="receivers-container">
            {form.cc.map((val, i) => (
              <div key={i} className="receiver-row">
                <input type="email" placeholder="cc@example.com" value={val} onChange={e => updateArrayField('cc', i, e.target.value)} />
                {form.cc.length > 1 && <button type="button" className="btn btn-danger-ghost" onClick={() => removeRow('cc', i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => addRow('cc')}>+ Add CC</button>
          </div>
        </div>

        {/* BCC */}
        <div className="form-group full">
          <label>BCC (optional)</label>
          <div className="receivers-container">
            {form.bcc.map((val, i) => (
              <div key={i} className="receiver-row">
                <input type="email" placeholder="bcc@example.com" value={val} onChange={e => updateArrayField('bcc', i, e.target.value)} />
                {form.bcc.length > 1 && <button type="button" className="btn btn-danger-ghost" onClick={() => removeRow('bcc', i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn btn-add" onClick={() => addRow('bcc')}>+ Add BCC</button>
          </div>
        </div>

        {/* Subject & Body */}
        <div className="form-group full">
          <label>Subject</label>
          <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Your subject…" />
        </div>
        <div className="form-group full">
          <label>Body {form.is_html && '(HTML)'} </label>
          {/* <textarea required rows={6} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Message…" /> */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              padding: '8px 10px', fontFamily: 'inherit', fontSize: 'inherit',
              lineHeight: '1.6', whiteSpace: 'pre-wrap', wordWrap: 'break-word',
              pointerEvents: 'none', color: 'transparent', minHeight: 120
            }}>
              {form.body}<span style={{ color: '#aaa' }}>{suggestion}</span>
            </div>
            <textarea
              required rows={6}
              value={form.body}
              onChange={handleBodyChange}
              onKeyDown={handleBodyKeyDown}
              placeholder="Message…"
              style={{ background: 'transparent', position: 'relative', width: '100%' }}
            />
          </div>
          {suggestion && (
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
              Press <kbd>Tab</kbd> to accept · <kbd>Esc</kbd> to dismiss
            </p>
          )}
        </div>

        {/* HTML toggle */}
        <div className="form-group full toggle-row">
          <span>Send as HTML</span>
          <label className="toggle">
            <input type="checkbox" checked={form.is_html} onChange={e => setForm({ ...form, is_html: e.target.checked })} />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Optional custom SMTP (overrides saved) */}
        <div className="form-group full">
          <label>Custom SMTP Host (optional)</label>
          <input placeholder="smtp.gmail.com" value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} />
        </div>
        <div className="form-group full">
          <label>Custom SMTP Port (optional)</label>
          <input placeholder="587" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: e.target.value })} />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <span className="spinner" /> : '🚀 Queue Email'}
        </button>
        {status && <div className={status.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'}>{status}</div>}
      </form>
    </div>
  );
}
