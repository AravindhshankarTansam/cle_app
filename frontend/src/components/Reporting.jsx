import React, { useState, useEffect } from 'react';
import { Calendar, Search, Download, Edit2, AlertCircle } from 'lucide-react';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Reporting({ API_URL }) {
  const [date, setDate] = useState(getLocalDateString());
  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual update overlay state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    worker_id: '',
    worker_name: '',
    status: 'Coming',
    method: 'Manual Override'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, workersRes, deptsRes] = await Promise.all([
        fetch(`${API_URL}/api/attendance?date=${date}`).then(r => r.json()),
        fetch(`${API_URL}/api/workers`).then(r => r.json()),
        fetch(`${API_URL}/api/departments`).then(r => r.json())
      ]);
      setRecords(recordsRes);
      setWorkers(workersRes.filter(w => w.status === 'Active'));
      setDepartments(deptsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, API_URL]);

  const openOverrideModal = (workerId, workerName, currentStatus = 'Absent') => {
    setOverrideForm({
      worker_id: workerId,
      worker_name: workerName,
      status: currentStatus === 'Coming' || currentStatus === 'Present' ? currentStatus : 'Coming',
      method: 'Manual Override'
    });
    setShowOverrideModal(true);
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/attendance/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: overrideForm.worker_id,
          date: date,
          status: overrideForm.status,
          method: overrideForm.method
        })
      });

      if (response.ok) {
        setShowOverrideModal(false);
        loadData();
      } else {
        alert('Failed to log manual override.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Build a complete matrix of all active workers for the selected date
  const reportingMatrix = workers.map(worker => {
    const record = records.find(r => r.worker_id === worker.id);
    return {
      worker_id: worker.id,
      name: worker.name,
      phone: worker.phone,
      department_name: worker.department_name,
      shift_name: worker.shift_name,
      status: record ? record.status : 'Absent',
      call_time: record ? record.call_time : null,
      method: record ? record.method : '-'
    };
  });

  // Export to CSV helper
  const exportToCSV = () => {
    const headers = ['Employee Name', 'Phone', 'Department', 'Shift', 'Status', 'Call Time', 'Logging Method'];
    const rows = reportingMatrix.map(r => [
      r.name,
      r.phone,
      r.department_name || 'Unassigned',
      r.shift_name || 'Unassigned',
      r.status,
      r.call_time ? new Date(r.call_time).toLocaleString() : 'N/A',
      r.method
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel">
      <div className="section-header">
        <div>
          <h3>Roster Reporting & Manual Corrections</h3>
          <p style={{ marginTop: '0.2rem' }}>Review daily attendance archives, export reports, and override missed-call registers manually.</p>
        </div>
        <div className="header-actions">
          <input 
            type="date" 
            className="form-input" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '160px' }}
          />
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading daily ledger...</p>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Availability Status</th>
                <th>Timestamp</th>
                <th>Log Mode</th>
                <th>Manual Correction</th>
              </tr>
            </thead>
            <tbody>
              {reportingMatrix.map(row => (
                <tr key={row.worker_id}>
                  <td>
                    <div style={{ fontWeight: '500' }}>{row.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{row.phone}</div>
                  </td>
                  <td>{row.department_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                  <td>{row.shift_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                  <td>
                    <span className={`badge ${row.status === 'Coming' ? 'success' : row.status === 'Present' ? 'info' : 'danger'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {row.call_time ? new Date(row.call_time).toLocaleTimeString() : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{row.method}</td>
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => openOverrideModal(row.worker_id, row.name, row.status)}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Edit2 size={10} /> Correct Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Override modal */}
      {showOverrideModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h4>Manual Attendance Correction</h4>
            </div>
            <form onSubmit={handleOverrideSubmit}>
              <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                You are overriding attendance for worker: <strong style={{ color: '#fff' }}>{overrideForm.worker_name}</strong> on date: <strong style={{ color: '#fff' }}>{date}</strong>.
              </div>

              <div className="form-group">
                <label>Corrected Status</label>
                <select 
                  className="form-select"
                  value={overrideForm.status}
                  onChange={(e) => setOverrideForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Coming">Coming (Missed Call Confirmed)</option>
                  <option value="Present">Present (Checked In / Manual)</option>
                  <option value="Absent">Absent (Not Commited / Excused)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason / Method</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={overrideForm.method}
                  onChange={(e) => setOverrideForm(prev => ({ ...prev, method: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOverrideModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Overwrite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
