import React, { useState, useEffect } from 'react';
import { Briefcase, CheckCircle, Clock, AlertCircle, Save, Check } from 'lucide-react';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AllocationBoard({ API_URL }) {
  const [date, setDate] = useState(getLocalDateString());
  const [departments, setDepartments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track task input values locally before saving
  const [taskInputs, setTaskInputs] = useState({}); // { workerId: 'Task Name' }
  const [saveStatus, setSaveStatus] = useState({}); // { workerId: 'saving' | 'saved' }

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptsRes, workersRes, attendanceRes, allocationsRes] = await Promise.all([
        fetch(`${API_URL}/api/departments`).then(r => r.json()),
        fetch(`${API_URL}/api/workers`).then(r => r.json()),
        fetch(`${API_URL}/api/attendance?date=${date}`).then(r => r.json()),
        fetch(`${API_URL}/api/allocations?date=${date}`).then(r => r.json())
      ]);

      setDepartments(deptsRes);
      setWorkers(workersRes.filter(w => w.status === 'Active'));
      setAttendance(attendanceRes);
      setAllocations(allocationsRes);

      // Pre-fill task inputs from existing allocations
      const inputs = {};
      allocationsRes.forEach(alloc => {
        inputs[alloc.worker_id] = alloc.task_assigned;
      });
      setTaskInputs(inputs);
    } catch (err) {
      console.error('Error loading allocations board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, API_URL]);

  const handleTaskChange = (workerId, value) => {
    setTaskInputs(prev => ({
      ...prev,
      [workerId]: value
    }));
  };

  const handleSaveAllocation = async (worker, deptId) => {
    const task = taskInputs[worker.id] || '';
    setSaveStatus(prev => ({ ...prev, [worker.id]: 'saving' }));

    try {
      let response;
      if (task.trim() === '') {
        // Delete allocation if empty
        response = await fetch(`${API_URL}/api/allocations/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, worker_id: worker.id })
        });
      } else {
        // Save/update allocation
        response = await fetch(`${API_URL}/api/allocations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            worker_id: worker.id,
            department_id: deptId,
            task_assigned: task
          })
        });
      }

      if (response.ok) {
        setSaveStatus(prev => ({ ...prev, [worker.id]: 'saved' }));
        // Clear status after 1.5 seconds
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [worker.id]: null }));
        }, 1500);
      } else {
        alert('Failed to save allocation');
        setSaveStatus(prev => ({ ...prev, [worker.id]: null }));
      }
    } catch (err) {
      console.error(err);
      setSaveStatus(prev => ({ ...prev, [worker.id]: null }));
    }
  };

  // Helper: check worker attendance status
  const getAttendanceStatus = (workerId) => {
    const record = attendance.find(a => a.worker_id === workerId);
    return record ? record.status : 'Absent'; // Default to absent if no record
  };

  return (
    <div className="glass-panel">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h3>Supervisor Work Allocations Board</h3>
          <p style={{ marginTop: '0.2rem' }}>Map workers confirmed coming via missed call to their machine lines and assembly tasks.</p>
        </div>
        <div className="header-actions">
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Operating Date:</label>
          <input 
            type="date" 
            className="form-input" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            style={{ width: '160px' }}
          />
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading planning board...</p>
      ) : (
        <div className="allocation-board">
          {departments.map(dept => {
            // Find workers registered in this department
            const deptWorkers = workers.filter(w => w.department_id === dept.id);
            
            // Filter workers who are confirmed Coming or Present today
            const availableWorkers = deptWorkers.filter(w => {
              const status = getAttendanceStatus(w.id);
              return status === 'Coming' || status === 'Present';
            });

            // Filter workers who are absent or pending confirmation
            const unavailableWorkers = deptWorkers.filter(w => {
              const status = getAttendanceStatus(w.id);
              return status !== 'Coming' && status !== 'Present';
            });

            return (
              <div key={dept.id} className="allocation-lane">
                <div className="lane-header">
                  <span className="lane-title">{dept.name}</span>
                  <span className="lane-card-count">
                    {availableWorkers.length} Active / {deptWorkers.length} Roster
                  </span>
                </div>

                <div className="lane-cards">
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    AVAILABLE STAFF (CONFIRMED)
                  </div>
                  
                  {availableWorkers.length === 0 ? (
                    <div style={{ 
                      padding: '1.5rem 1rem', 
                      background: 'rgba(0,0,0,0.01)', 
                      border: '1px dashed rgba(0,0,0,0.08)', 
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}>
                      No workers confirmed for this department yet today.
                    </div>
                  ) : (
                    availableWorkers.map(w => {
                      const attStatus = getAttendanceStatus(w.id);
                      const state = saveStatus[w.id];

                      return (
                        <div key={w.id} className="allocated-card">
                          <div className="allocated-card-header">
                            <span className="allocated-card-name">{w.name}</span>
                            <span className={`badge ${attStatus === 'Present' ? 'info' : 'success'}`}>
                              {attStatus}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Assign Line/Machine (e.g. Line A)"
                              value={taskInputs[w.id] || ''}
                              onChange={(e) => handleTaskChange(w.id, e.target.value)}
                              onBlur={() => handleSaveAllocation(w, dept.id)}
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                            />
                            
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleSaveAllocation(w, dept.id)}
                              style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                              title="Save Allocation"
                            >
                              {state === 'saving' ? (
                                <span style={{ fontSize: '0.8rem', width: '16px', height: '16px' }}>⌛</span>
                              ) : state === 'saved' ? (
                                <Check size={14} color="var(--color-success)" />
                              ) : (
                                <Save size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* List Unavailable workers at the bottom */}
                  {unavailableWorkers.length > 0 && (
                    <>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginTop: '1.25rem', marginBottom: '0.25rem' }}>
                        UNCONFIRMED / ABSENT Roster
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: '0.55' }}>
                        {unavailableWorkers.map(w => {
                          const attStatus = getAttendanceStatus(w.id);
                          return (
                            <div key={w.id} className="allocated-card" style={{ padding: '0.6rem 0.85rem' }}>
                              <div className="allocated-card-header">
                                <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{w.name}</span>
                                <span className={`badge ${attStatus === 'Absent' ? 'danger' : 'warning'}`} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                                  {attStatus}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
