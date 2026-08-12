import React, { useState, useEffect } from 'react';
import { Building2, Users, CheckCircle2 } from 'lucide-react';

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
        <span style={{ color: '#10b981' }}>{present} Present</span>
        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
        <span style={{ color: '#ef4444' }}>{absent} Absent</span>
      </span>
    </div>
  );
};

export default function ShiftPlanning({ API_URL }) {
  const [assemblyLines, setAssemblyLines] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadData();
  }, [API_URL]);

  return (
    <div>
      {/* Assembly Lines Roster */}
      <div className="glass-panel">
        <div className="section-header">
          <div>
            <h3>Assembly Lines Roster</h3>
            <p style={{ marginTop: '0.2rem' }}>Overview of registered total employees and live attendance per assembly line.</p>
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
                  <th>Assembly Line</th>
                  <th style={{ textAlign: 'center' }}>Total Registered Employees</th>
                  <th>Live Attendance Status</th>
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
                      <td style={{ fontWeight: '650', textAlign: 'center' }}>
                        <span className="badge primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={12} /> {totalCount} Employees
                        </span>
                      </td>
                      <td>
                        <LinePieChart present={presentCount} absent={absentCount} total={totalCount} />
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
