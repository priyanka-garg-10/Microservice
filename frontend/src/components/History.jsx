import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PAGE_SIZE = 20;

export default function History({ token }) {
  const [data, setData] = useState({ history: [], total: 0, pages: 1 });
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [draft, setDraft] = useState({ sender: '', status: '', from: '', to: '' });
  const [applied, setApplied] = useState({ sender: '', status: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  // ✅ FIX 1: Restore the senders fetch that was lost in refactor
  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/email/credentials', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setSenders(r.data))
      .catch(() => setSenders([]));
  }, [token]);

  const fetchHistory = useCallback(
    (filters, pg) => {
      if (!token) return;
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE });
      if (filters.sender) params.set('sender', filters.sender);
      if (filters.status) params.set('status', filters.status);
      if (filters.from) params.set('date_from', filters.from);
      if (filters.to) params.set('date_to', filters.to);

      axios
        .get(`/api/email/history?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((r) => setData(r.data))
        .catch((err) => setError(err.response?.data?.error || err.message))
        .finally(() => setLoading(false));
    },
    [token]
  );

  // Load initial data on mount
  useEffect(() => {
    fetchHistory(applied, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    setApplied(draft);
    setPage(1);
    fetchHistory(draft, 1);
  };

  const handlePageChange = (pg) => {
    setPage(pg);
    fetchHistory(applied, pg);
  };

  const removeChip = (key) => {
    const next = { ...applied, [key]: '' };
    setApplied(next);
    setDraft((prev) => ({ ...prev, [key]: '' }));
    setPage(1);
    fetchHistory(next, 1);
  };

  const clearAll = () => {
    const empty = { sender: '', status: '', from: '', to: '' };
    setApplied(empty);
    setDraft(empty);
    setPage(1);
    fetchHistory(empty, 1);
  };

  const chips = [
    applied.sender && { key: 'sender', label: `Sender: ${applied.sender}` },
    applied.status && { key: 'status', label: `Status: ${applied.status}` },
    applied.from && { key: 'from', label: `From: ${applied.from}` },
    applied.to && { key: 'to', label: `To: ${applied.to}` },
  ].filter(Boolean);

  function paginationNums() {
    const total = data.pages;
    const nums = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= page - 2 && i <= page + 2)) {
        nums.push(i);
      } else if (nums[nums.length - 1] !== '…') {
        nums.push('…');
      }
    }
    return nums;
  }

  const segClass = (val) => {
    if (draft.status !== val) return 'seg-btn';
    if (val === '') return 'seg-btn active-all';
    if (val === 'SUCCESS') return 'seg-btn active-ok';
    return 'seg-btn active-fail';
  };

  return (
    <div>
      {/* Stats strip */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-icon purple">📧</div>
          <div>
            <div className="stat-label">Total</div>
            <div className="stat-value">{data.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-label">Delivered</div>
            <div className="stat-value">
              {data.history.filter((h) => h.status === 'SUCCESS').length}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">❌</div>
          <div>
            <div className="stat-label">Failed</div>
            <div className="stat-value">
              {data.history.filter((h) => h.status === 'FAILED').length}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">📋 Email History</h2>
            <p className="card-subtitle">
              {chips.length
                ? 'Filtered: ' + chips.map((c) => c.label).join(' · ')
                : 'Showing all results'}
            </p>
          </div>
        </div>

        {/* ✅ FIX 2: Filter items on ONE row, each in its own column — no overlap */}
        <div className="filter-row">

          {/* Sender */}
          <div className="filter-group">
            <label className="filter-label">Sender</label>
            <select
              value={draft.sender}
              onChange={(e) => setDraft((d) => ({ ...d, sender: e.target.value }))}
            >
              <option value="">All senders</option>
              {/* ✅ FIX 1: senders now populated from API */}
              {senders.map((s) => (
                <option key={s.sender_email} value={s.sender_email}>
                  {s.sender_email}
                </option>
              ))}
            </select>
          </div>

          {/* Status — segmented, independent of other filters */}
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <div className="seg-group">
              {[
                ['', 'All'],
                ['SUCCESS', '✅ Success'],
                ['FAILED', '❌ Failed'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  className={segClass(val)}
                  // ✅ FIX 2: only updates draft, doesn't touch other filter state
                  onClick={() => setDraft((d) => ({ ...d, status: val }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* From date */}
          <div className="filter-group">
            <label className="filter-label">From</label>
            <input
              type="date"
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
          </div>

          {/* To date */}
          <div className="filter-group">
            <label className="filter-label">To</label>
            <input
              type="date"
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </div>

          {/* Search — only this triggers the API */}
          <div className="filter-group filter-group--end">
            <button className="search-btn" onClick={handleSearch}>
              🔍 Search
            </button>
          </div>
        </div>

        {/* Applied filter chips — separate row, never overlaps filter controls */}
        {chips.length > 0 && (
          <div className="applied-filters">
            <span className="applied-filters-label">Active filters:</span>
            {chips.map((c) => (
              <span key={c.key} className="filter-chip">
                {c.label}
                <button
                  className="chip-remove"
                  onClick={() => removeChip(c.key)}
                  aria-label={`Remove ${c.key} filter`}
                >
                  ✕
                </button>
              </span>
            ))}
            <button className="clear-all" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <span className="spinner" /> Loading…
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && data.history.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No results match the current filters.</p>
          </div>
        )}

        {!loading && !error && data.history.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sender</th>
                  <th>Recipients</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Error</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>{item.id}</td>
                    <td>
                      <span className="sender-cell">
                        <span className="credential-avatar credential-avatar--sm">
                          {item.sender?.[0]?.toUpperCase() ?? '?'}
                        </span>
                        <span className="sender-email">{item.sender}</span>
                      </span>
                    </td>
                    <td className="cell-truncate" style={{ position: 'relative' }}>
                      {(() => {
                        const all = Array.isArray(item.receivers)
                          ? item.receivers
                          : (item.receivers || '').split(',').map(s => s.trim());
                        const display = all.join(', ');
                        const tooltip = all.join('\n');
                        return (
                          <span
                            className="recipients-cell"
                            data-tooltip={all.length > 1 ? tooltip : undefined}
                            title={display}
                          >
                            {display}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="cell-truncate">{item.subject}</td>
                    <td>
                      <span className={`status-pill status-${item.status}`}>
                        {item.status === 'SUCCESS' ? '✅' : '❌'} {item.status}
                      </span>
                    </td>
                    <td className="cell-truncate cell-error">{item.error_msg || '—'}</td>
                    <td className="cell-date">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.total > PAGE_SIZE && (
          <div className="pagination">
            <span className="pg-info">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, data.total)} of {data.total} results
            </span>
            <div className="pg-controls">
              <button
                className="pg-btn"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                ‹
              </button>

              {paginationNums().map((n, i) =>
                n === '…' ? (
                  <span key={`e${i}`} className="pg-ellipsis">…</span>
                ) : (
                  <button
                    key={n}
                    className={`pg-btn${n === page ? ' pg-active' : ''}`}
                    onClick={() => handlePageChange(n)}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                className="pg-btn"
                disabled={page >= data.pages}
                onClick={() => handlePageChange(page + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}