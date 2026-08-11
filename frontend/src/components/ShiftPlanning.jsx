import React, { useState, useEffect } from 'react';
import { ShieldAlert, Edit2, Check, X } from 'lucide-react';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const LinePieChart = ({ present, absent, total }) => {
  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="#475569" />
        </svg>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 Workers</span>
      </div>
    );
  }

  const presentPercent = Math.round((present / total) * 100);
  const absentPercent = 100 - presentPercent;

  if (present === total) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={`${present} Present (100%)`}>
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="#10b981" />
        </svg>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#10b981' }}>{presentPercent}% Present</span>
      </div>
    );
  }

  if (absent === total) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={`${absent} Absent (100%)`}>
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="#ef4444" />
        </svg>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ef4444' }}>0% Present</span>
      </div>
    );
  }

  const angle = (presentPercent / 100) * 360;
  
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const startPoint = polarToCartesian(10, 10, 8, 0);
  const endPoint = polarToCartesian(10, 10, 8, angle);
  const largeArcFlag = angle <= 180 ? '0' : '1';

  const dPresent = [
    'M', 10, 10,
    'L', startPoint.x, startPoint.y,
    'A', 8, 8, 0, largeArcFlag, 1, endPoint.x, endPoint.y,
    'Z'
  ].join(' ');

  const dAbsent = [
    'M', 10, 10,
    'L', endPoint.x, endPoint.y,
    'A', 8, 8, 0, largeArcFlag === '0' ? '1' : '0', 1, startPoint.x, startPoint.y,
    'Z'
  ].join(' ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={`${present} Present / ${absent} Absent of ${total} Total`}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d={dAbsent} fill="#ef4444" />
        <path d={dPresent} fill="#10b981" />
      </svg>
      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-primary)' }}>
        <span style={{ color: '#10b981' }}>{present}P</span>
        <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>/</span>
        <span style={{ color: '#ef4444' }}>{absent}A</span>
      </span>
    </div>
  );
};

export default function ShiftPlanning({ API_URL }) {
  const [assemblyLines, setAssemblyLines] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assembly Line Edit states
  const [editingLineId, setEditingLineId] = useState(null);
  const [editLineReqWorkers, setEditLineReqWorkers] = useState(20);

  const loadData = async () => {
    setLoading(true);
    try {
      const todayDate = getLocalDateString();
      const [linesRes, workersRes, attendanceRes] = await Promise.all([
        fetch(`${API_URL}/api/assembly-lines`).then(r => r.json()),
        fetch(`${API_URL}/api/workers`).then(r => r.json()),
        fetch(`${API_URL}/api/attendance?date=${todayDate}`).then(r => r.json())
      ]);
      setAssemblyLines(linesRes);
      setWorkers(workersRes);
      setAttendance(attendanceRes);
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditLine = (line) => {
    setEditingLineId(line.id);
    setEditLineReqWorkers(line.required_workers);
  };

  const cancelEditLine = () => setEditingLineId(null);

  const saveEditLine = async (line) => {
    try {
      const response = await fetch(`${API_URL}/api/assembly-lines/${line.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: line.name,
          floor_id: line.floor_id,
          required_workers: parseInt(editLineReqWorkers)
        })
      });
      if (response.ok) {
        setEditingLineId(null);
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update line alert threshold.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [API_URL]);

  return (
    <div>
      {/* Assembly Lines & Alert Thresholds */}
      <div className="glass-panel">
        <div className="section-header">
          <div>
            <h3>Assembly Lines & Alert Thresholds</h3>
            <p style={{ marginTop: '0.2rem' }}>Configure the minimum required manpower for each factory production line. Active worker counts falling below this threshold will flag shortages.</p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : (
          <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Floor</th>
                  <th>Line</th>
                  <th style={{ textAlign: 'center' }}>Total Employees</th>
                  <th>Alert Threshold</th>
                  <th>IE Attendance Compare</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assemblyLines.map(line => {
                  const lineWorkers = workers.filter(w => w.line_id === line.id && (w.role === 'Employee' || w.proficiency === 'Employee'));
                  const totalCount = lineWorkers.length;
                  
                  const presentWorkers = lineWorkers.filter(w => {
                    const att = attendance.find(a => a.worker_id === w.id);
                    return att && (att.status === 'Present' || att.status === 'Coming');
                  });
                  const presentCount = presentWorkers.length;
                  const absentCount = totalCount - presentCount;

                  return (
                    <tr key={line.id}>
                      <td style={{ fontWeight: '600' }}>{line.block_name}</td>
                      <td>Floor {line.floor_name}</td>
                      <td style={{ fontWeight: '600', color: 'var(--accent-color)' }}>Line {line.name}</td>
                      <td style={{ fontWeight: '650', textAlign: 'center' }}>{totalCount} Workers</td>
                      <td>
                        {editingLineId === line.id ? (
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ padding: '0.4rem', height: 'auto', width: '80px' }} 
                            value={editLineReqWorkers} 
                            onChange={(e) => setEditLineReqWorkers(parseInt(e.target.value))} 
                          />
                        ) : (
                          <span className="badge warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ShieldAlert size={12} /> {line.required_workers} Workers
                          </span>
                        )}
                      </td>
                      <td>
                        <LinePieChart present={presentCount} absent={absentCount} total={totalCount} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {editingLineId === line.id ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" className="btn-icon success" onClick={() => saveEditLine(line)} title="Save"><Check size={14} /></button>
                            <button type="button" className="btn-icon delete" onClick={cancelEditLine} title="Cancel"><X size={14} /></button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" className="btn-icon primary" onClick={() => startEditLine(line)} title="Edit Threshold"><Edit2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
