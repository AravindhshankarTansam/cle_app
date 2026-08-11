import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest, Check, X, Plus, AlertCircle, Users, ArrowRight, Edit2 
} from 'lucide-react';

export default function ResourceRequests({ API_URL, currentUser, workers, sessionUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [skills, setSkills] = useState([]);
  const [hierarchy, setHierarchy] = useState({ blocks: [], floors: [], assembly_lines: [] });
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editRequestId, setEditRequestId] = useState(null);
  
  // Create Form State
  const [formData, setFormData] = useState({
    target_role: 'HR', // default for managers. HR defaults to Floor Manager
    target_floor_id: '',
    target_block_id: '',
    requested_skill_id: '',
    count: 1,
    source_line_id: '', // optional
    destination_line_id: ''
  });

  // Approve Form State (Worker selection)
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  useEffect(() => {
    if (currentUser?.role === 'HR' || currentUser?.role === 'Admin') {
      setFormData(prev => ({ ...prev, target_role: 'Floor Manager' }));
    }
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, skillRes, blockRes, floorRes, lineRes] = await Promise.all([
        fetch(`${API_URL}/api/requests`),
        fetch(`${API_URL}/api/skills`),
        fetch(`${API_URL}/api/blocks`),
        fetch(`${API_URL}/api/floors`),
        fetch(`${API_URL}/api/assembly-lines`)
      ]);

      if (reqRes.ok) setRequests(await reqRes.json());
      if (skillRes.ok) setSkills(await skillRes.json());
      if (blockRes.ok) {
        setHierarchy(prev => ({ ...prev, blocks: blockRes.ok ? [] : [] })); // handle properly
        const b = await blockRes.json();
        const f = await floorRes.json();
        const l = await lineRes.json();
        setHierarchy({ blocks: b, floors: f, assembly_lines: l });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTargetRoleChange = (role) => {
    const isFloorMgr = ['Floor Manager', 'Floor Supervisor'].includes(currentUser?.role);
    setFormData(prev => ({
      ...prev,
      target_role: role,
      target_block_id: isFloorMgr ? (sessionUser?.block_id || '') : '',
      target_floor_id: ''
    }));
  };

  const getTargetRoleOptions = () => {
    const userRole = currentUser?.role;
    if (['Block Manager', 'Block Supervisor'].includes(userRole)) {
      return [
        { value: 'HR', label: 'HR' },
        { value: 'Block Manager', label: 'Block Manager' }
      ];
    }
    if (['Floor Manager', 'Floor Supervisor'].includes(userRole)) {
      return [
        { value: 'HR', label: 'HR' },
        { value: 'Block Manager', label: 'Block Manager (Same Block)' },
        { value: 'Floor Manager', label: 'Floor Manager (Same Block)' }
      ];
    }
    return [
      { value: 'HR', label: 'HR' },
      { value: 'Block Manager', label: 'Block Manager' },
      { value: 'Floor Manager', label: 'Floor Manager' }
    ];
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      let payload = { ...formData, date: dateStr };
      if (['Floor Manager', 'Floor Supervisor'].includes(currentUser?.role)) {
        payload.target_block_id = sessionUser?.block_id || '';
        if (formData.target_role === 'Block Manager') {
          payload.target_floor_id = '';
        }
      } else if (['Block Manager', 'Block Supervisor'].includes(currentUser?.role)) {
        payload.target_floor_id = '';
      }

      const url = editRequestId ? `${API_URL}/api/requests/${editRequestId}` : `${API_URL}/api/requests`;
      const method = editRequestId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (selectedWorkers.length === 0) {
      alert("Please select at least one worker to send.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_ids: selectedWorkers })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowApproveModal(false);
      setSelectedRequest(null);
      setSelectedWorkers([]);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this request?")) return;
    try {
      const res = await fetch(`${API_URL}/api/requests/${id}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const getAvailableWorkersForApproval = () => {
    if (!selectedRequest) return [];
    // If the approver is a Floor Manager, show workers from their floor who have the requested skill
    // For simplicity, we just filter active employees. 
    return workers.filter(w => 
      w.status === 'Active' && 
      w.proficiency === 'Employee' &&
      (!selectedRequest.requested_skill_id || w.skill_id === selectedRequest.requested_skill_id)
    );
  };

  const toggleWorkerSelection = (id) => {
    setSelectedWorkers(prev => 
      prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]
    );
  };

  const incomingRequests = requests.filter(r => r.requester_id !== currentUser?.id);
  const outgoingRequests = requests.filter(r => r.requester_id === currentUser?.id);

  const openCreateModal = () => {
    setEditRequestId(null);
    const initialTargetRole = currentUser?.role === 'HR' || currentUser?.role === 'Admin' ? 'Floor Manager' : 'HR';
    const isFloorMgr = ['Floor Manager', 'Floor Supervisor'].includes(currentUser?.role);
    
    setFormData({
      target_role: initialTargetRole,
      target_floor_id: '',
      target_block_id: isFloorMgr ? (sessionUser?.block_id || '') : '',
      requested_skill_id: '',
      count: 1,
      source_line_id: '',
      destination_line_id: ''
    });
    setShowCreateModal(true);
  };

  const openEditModal = (r) => {
    setEditRequestId(r.id);
    setFormData({
      target_role: r.target_role,
      target_floor_id: r.target_floor_id || '',
      target_block_id: r.target_block_id || '',
      requested_skill_id: r.requested_skill_id || '',
      count: r.count,
      source_line_id: r.source_line_id || '',
      destination_line_id: r.destination_line_id || ''
    });
    setShowCreateModal(true);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending': return <span className="status-badge pending">Pending</span>;
      case 'Approved': return <span className="status-badge coming">Partial</span>;
      case 'Fulfilled': return <span className="status-badge present">Fulfilled</span>;
      case 'Rejected': return <span className="status-badge absent">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="tab-pane active fade-in">
      <div className="top-header">
        <div className="header-title">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitPullRequest size={28} /> Resource Requests
          </h2>
          <p>Manage cross-floor worker shortages and transfers</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Create Request
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="dashboard-layout">
        {/* Incoming Requests */}
        <div className="glass-panel">
          <h3 className="section-header">
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Incoming Requests</span>
          </h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Request</th>
                  <th>Skill</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {incomingRequests.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.5 }}>No incoming requests</td></tr>
                )}
                {incomingRequests.map(r => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.requester_name}</strong>
                      <br/><small style={{ opacity: 0.7 }}>{r.requester_role}</small>
                    </td>
                    <td>
                      {r.count} worker(s) for <strong>{r.destination_line_name || 'Line'}</strong>
                    </td>
                    <td>{r.main_skill || 'Any'}</td>
                    <td>
                      {getStatusBadge(r.status)}
                      {r.fulfilled_count > 0 && <div style={{ fontSize: '11px', marginTop: '4px' }}>{r.fulfilled_count} / {r.count} fulfilled</div>}
                    </td>
                    <td>
                      {r.status !== 'Rejected' && r.status !== 'Fulfilled' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setSelectedRequest(r); setSelectedWorkers([]); setShowApproveModal(true); }}>
                            <Check size={14} /> Fulfill
                          </button>
                          <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleReject(r.id)}>
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outgoing Requests */}
        <div className="glass-panel">
          <h3 className="section-header" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>My Outgoing Requests</span>
          </h3>
          <div className="activity-feed">
            {outgoingRequests.length === 0 && (
              <div style={{ textAlign: 'center', opacity: 0.5, padding: '2rem 0' }}>No outgoing requests</div>
            )}
            {outgoingRequests.map(r => (
              <div key={r.id} className="activity-item">
                <div className={`activity-icon ${r.status === 'Fulfilled' ? 'coming' : r.status === 'Rejected' ? 'unregistered' : 'manual'}`}>
                  <GitPullRequest size={16} />
                </div>
                <div className="activity-body">
                  <div className="activity-title">
                    Requested <span className="strong">{r.count} worker{r.count > 1 ? 's' : ''}</span> for <span className="strong">{r.destination_line_name || 'Line'}</span>
                  </div>
                  <div className="activity-subtitle" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span>Sent to: {r.target_role} {r.target_floor_name ? `(${r.target_floor_name})` : ''}</span>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span>Skill: {r.main_skill || 'Any'}</span>
                  </div>
                </div>
                <div className="activity-time" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  {getStatusBadge(r.status)}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {r.fulfilled_count} / {r.count} Fulfilled
                  </span>
                  {r.status === 'Pending' && (
                    <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '11px', marginTop: '4px' }} onClick={() => openEditModal(r)}>
                      <Edit2 size={12} style={{ marginRight: '4px' }}/> Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editRequestId ? 'Edit Resource Request' : 'New Resource Request'}</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Send Request To</label>
                <div className="form-input-wrapper">
                  <select 
                    className="form-select" 
                    value={formData.target_role} 
                    onChange={e => handleTargetRoleChange(e.target.value)}
                    required
                  >
                    {getTargetRoleOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(formData.target_role === 'Floor Manager' || formData.target_role === 'Block Manager') && (
                <div className="form-group">
                  <label>Specific Block</label>
                  <div className="form-input-wrapper">
                    {['Floor Manager', 'Floor Supervisor'].includes(currentUser?.role) ? (
                      <input 
                        type="text" 
                        className="form-input" 
                        value={hierarchy.blocks.find(b => String(b.id) === String(sessionUser?.block_id))?.name || 'My Block'} 
                        disabled 
                      />
                    ) : (
                      <select 
                        className="form-select"
                        value={formData.target_block_id}
                        onChange={e => setFormData({...formData, target_block_id: e.target.value, target_floor_id: ''})}
                        required={formData.target_role === 'Block Manager'}
                      >
                        <option value="">Select Block...</option>
                        {hierarchy.blocks
                          .filter(b => {
                            if (['Block Manager', 'Block Supervisor'].includes(currentUser?.role)) {
                              return String(b.id) !== String(sessionUser?.block_id);
                            }
                            return true;
                          })
                          .map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {formData.target_role === 'Floor Manager' && (
                <div className="form-group">
                  <label>Specific Floor</label>
                  <div className="form-input-wrapper">
                    <select 
                      className="form-select"
                      value={formData.target_floor_id}
                      onChange={e => setFormData({...formData, target_floor_id: e.target.value})}
                      required
                    >
                      <option value="">Select Floor...</option>
                      {hierarchy.floors
                        .filter(f => {
                          const userRole = currentUser?.role;
                          if (['Floor Manager', 'Floor Supervisor'].includes(userRole)) {
                            return String(f.block_id) === String(sessionUser?.block_id) && String(f.id) !== String(sessionUser?.floor_id);
                          }
                          return !formData.target_block_id || String(f.block_id) === String(formData.target_block_id);
                        })
                        .map(f => (
                          <option key={f.id} value={f.id}>{f.block_name} &gt; {f.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Requested Skill (Optional)</label>
                <div className="form-input-wrapper">
                  <select 
                    className="form-select"
                    value={formData.requested_skill_id}
                    onChange={e => setFormData({...formData, requested_skill_id: e.target.value})}
                  >
                    <option value="">Any Skill</option>
                    {skills.map(s => (
                      <option key={s.id} value={s.id}>{s.main_skill}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Count Needed</label>
                <div className="form-input-wrapper">
                  <input 
                    type="number" 
                    min="1" 
                    className="form-input" 
                    value={formData.count} 
                    onChange={e => setFormData({...formData, count: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Destination Line (Shortage Location)</label>
                <div className="form-input-wrapper">
                  <select 
                    className="form-select"
                    value={formData.destination_line_id}
                    onChange={e => setFormData({...formData, destination_line_id: e.target.value})}
                    required
                  >
                    <option value="">Select Line...</option>
                    {hierarchy.assembly_lines.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.block_name} &gt; {l.floor_name} &gt; {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editRequestId ? 'Save Changes' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE/FULFILL MODAL */}
      {showApproveModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Fulfill Request from {selectedRequest.requester_name}</h2>
              <button className="close-btn" onClick={() => setShowApproveModal(false)}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <p><strong>Requested:</strong> {selectedRequest.count - selectedRequest.fulfilled_count} workers for {selectedRequest.destination_line_name}</p>
              <p><strong>Skill Required:</strong> {selectedRequest.main_skill || 'None'}</p>
              <p>Please select exactly which workers to reassign for today.</p>
            </div>

            <div className="form-group" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th width="50">Select</th>
                    <th>Worker Name</th>
                    <th>Phone</th>
                    <th>Current Line</th>
                  </tr>
                </thead>
                <tbody>
                  {getAvailableWorkersForApproval().map(w => (
                    <tr key={w.id} style={{ cursor: 'pointer', backgroundColor: selectedWorkers.includes(w.id) ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }} onClick={() => toggleWorkerSelection(w.id)}>
                      <td>
                        <input type="checkbox" checked={selectedWorkers.includes(w.id)} readOnly style={{ pointerEvents: 'none' }} />
                      </td>
                      <td>{w.name}</td>
                      <td>{w.phone}</td>
                      <td>{hierarchy.assembly_lines.find(l => l.id === w.line_id)?.name || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getAvailableWorkersForApproval().length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No active workers match this skill requirement.</div>
              )}
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
              <div style={{ fontWeight: 'bold' }}>Selected: {selectedWorkers.length}</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleApprove} disabled={selectedWorkers.length === 0}>Approve & Transfer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
