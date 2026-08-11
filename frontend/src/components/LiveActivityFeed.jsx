import React, { useState } from 'react';
import { Radio, Phone, Search, RefreshCw, Filter, CheckCircle, AlertCircle, Clock, Building2, User, Activity } from 'lucide-react';

export default function LiveActivityFeed({ 
  recentLogs = [], 
  shortageByNumber = [], 
  mobileCallLogs = [], 
  onRefresh, 
  sessionUser, 
  workers = [], 
  assemblyLines = [] 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Filter logs based on search and selected filters
  const filteredLogs = recentLogs.filter(log => {
    const isUnregistered = !log.worker_id && !log.worker_name;
    const nameMatch = (log.worker_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = (log.worker_phone || '').includes(searchTerm);
    const deptMatch = (log.department_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const searchMatches = nameMatch || phoneMatch || deptMatch || (isUnregistered && 'unknown'.includes(searchTerm.toLowerCase()));

    const statusMatches = statusFilter === 'all' || log.status === statusFilter;
    const methodMatches = methodFilter === 'all' || 
      (methodFilter === 'Missed Call' && (log.method === 'Missed Call' || !log.method)) ||
      (methodFilter === 'Manual' && (log.method === 'Manual' || log.method === 'Manual Override'));

    return searchMatches && statusMatches && methodMatches;
  });

  const totalLogs = recentLogs.length;
  const comingCount = recentLogs.filter(l => l.status === 'Coming' || l.status === 'Present').length;
  const missedCallCount = recentLogs.filter(l => !l.method || l.method === 'Missed Call').length;
  const manualCount = recentLogs.filter(l => l.method === 'Manual' || l.method === 'Manual Override').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'var(--accent-color)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Radio size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700' }}>Live Activity Feed</h2>
              <div className="pulse-dot" title="Live connection active" />
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time telephony missed call logs, attendance confirmations, and manual override streams.
            </p>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={15} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon primary">
            <Activity size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{totalLogs}</span>
            <span className="stat-label">Total Events Today</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{comingCount}</span>
            <span className="stat-label">Confirmed Present / Coming</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon warning">
            <Phone size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{missedCallCount}</span>
            <span className="stat-label">Missed Call Triggers</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon info">
            <User size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{manualCount}</span>
            <span className="stat-label">Manual Overrides</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div className="search-box" style={{ flex: '1', minWidth: '260px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by worker name, phone number, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} color="var(--text-muted)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
              <select
                className="form-select"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.825rem', height: 'auto', width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Coming">Coming</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Method:</span>
              <select
                className="form-select"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.825rem', height: 'auto', width: 'auto' }}
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <option value="all">All Methods</option>
                <option value="Missed Call">Missed Call</option>
                <option value="Manual">Manual Override</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed Streams */}
      <div style={{ display: 'grid', gridTemplateColumns: shortageByNumber.length > 0 ? '1.8fr 1.2fr' : '1fr', gap: '1.5rem' }}>
        {/* Main Feed Column */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="section-header" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} color="var(--accent-color)" />
              Live Stream Logs ({filteredLogs.length})
            </h3>
            <span className="badge info" style={{ fontSize: '0.75rem' }}>Today's Log Stream</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                <p>No activity logs found matching the search/filter criteria.</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const isUnregistered = !log.worker_id && !log.worker_name;
                const isManual = log.method === 'Manual Override' || log.method === 'Manual';
                const timestampStr = log.call_time ? new Date(log.call_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';

                return (
                  <div key={log.id || idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className={`activity-icon ${isUnregistered ? 'unregistered' : isManual ? 'manual' : 'coming'}`} style={{ width: '38px', height: '38px' }}>
                        <Phone size={16} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                            {isUnregistered ? 'Unknown / External Number' : log.worker_name}
                          </span>
                          <span className={`badge ${log.status === 'Coming' ? 'success' : log.status === 'Present' ? 'info' : 'danger'}`}>
                            {log.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>{log.worker_phone || 'Unregistered'}</span>
                          {log.department_name && (
                            <>
                              <span>•</span>
                              <span>{log.department_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span style={{ color: isManual ? '#6366f1' : 'var(--text-muted)' }}>
                            Method: {log.method || 'Missed Call'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--accent-color)', fontFamily: 'monospace' }}>
                        {timestampStr}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Shortage by Number Column (if available) */}
        {shortageByNumber.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div className="section-header" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={15} color="#f59e0b" />
                Shortage by Caller Number
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {shortageByNumber.map((row, i) => {
                const hasShortage = (row.shortage_count || 0) > 0;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: hasShortage ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.04)',
                    border: `1px solid ${hasShortage ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)'}`,
                    borderRadius: '10px', fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <code style={{ fontWeight: 700, fontSize: '0.9rem' }}>{row.caller_number}</code>
                        {row.worker_name && (
                          <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.8rem' }}>
                            · {row.worker_name}
                          </span>
                        )}
                      </div>
                      {row.department_name && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Building2 size={11} /> {row.department_name}
                        </span>
                      )}
                    </div>

                    <span className={`badge ${hasShortage ? 'warning' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                      {hasShortage ? `−${row.shortage_count} short` : 'OK'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
