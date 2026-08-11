import React from 'react';
import { Phone, User, Building2, CheckCircle, RefreshCw, Calendar, Clock } from 'lucide-react';

/**
 * MobileCallLogsView
 * Displays all call logs submitted by Admin from the mobile app.
 * Shows: caller number, matched worker, department, shortage count, date, time.
 * Also shows a "Shortage by Number" summary table at the top.
 */
export default function MobileCallLogsView({ mobileCallLogs, shortageByNumber, onRefresh }) {
  return (
    <div>
      {/* ── Summary: Calls by Caller Number ── */}
      <div className="section-header" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Phone size={16} />
          Total Calls by Caller Number
        </h3>
        <button className="btn btn-secondary" onClick={onRefresh}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {shortageByNumber.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          No mobile call log data yet. Use the mobile app to post calls.
        </div>
      ) : (
        <div className="glass-panel" style={{ marginBottom: '2rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={thStyle}>Caller Number</th>
                <th style={thStyle}>Worker</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>IE Shortage (Line)</th>
                <th style={thStyle}>Total Calls</th>
                <th style={thStyle}>Last Call Date</th>
              </tr>
            </thead>
            <tbody>
              {shortageByNumber.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={13} color="var(--text-muted)" />
                      <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.caller_number}</code>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={12} color="var(--text-muted)" />
                      <span>{row.worker_name}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Building2 size={12} color="var(--text-muted)" />
                      <span>{row.department_name || 'No Dept'}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span className={`badge ${(row.shortage_count || 0) > 0 ? 'warning' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                      {(row.shortage_count || 0) > 0 ? `−${row.shortage_count} short` : 'OK'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{row.call_count}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {row.last_call_date || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detailed Log Table ── */}
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Phone size={16} />
          All Mobile-Captured Call Logs
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mobileCallLogs.length} records</span>
      </div>

      {mobileCallLogs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No call logs captured from mobile app yet.
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Caller Number</th>
                <th style={thStyle}>Worker / Match</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>IE Shortage (Line)</th>
                <th style={thStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> Date
                  </div>
                </th>
                <th style={thStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Time
                  </div>
                </th>
                <th style={thStyle}>Submitted By</th>
              </tr>
            </thead>
            <tbody>
              {mobileCallLogs.map((log, i) => (
                <tr key={log.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={13} color="var(--text-muted)" />
                      <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.caller_number}</code>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle size={12} color="var(--color-success)" />
                      <span style={{ fontWeight: 600 }}>{log.worker_name}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{log.department_name || '—'}</td>
                  <td style={tdStyle}>
                    <span className={`badge ${(log.shortage_count || 0) > 0 ? 'warning' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                      {(log.shortage_count || 0) > 0 ? `−${log.shortage_count} short` : 'OK'}
                    </span>
                  </td>
                  <td style={tdStyle}>{log.call_date}</td>
                  <td style={tdStyle}>{log.call_time}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {log.submitted_by || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '0.875rem 1rem',
  verticalAlign: 'middle',
};
