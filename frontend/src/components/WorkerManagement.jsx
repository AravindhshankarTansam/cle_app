import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, User, Users, Phone, Briefcase, Clock, GitBranch, Award, Sliders, Activity, Eye, EyeOff, Building2, MapPin, Shield, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';



export default function WorkerManagement({ API_URL, sessionUser, sessionUserId, setSessionUserId, currentUser }) {
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [assemblyLines, setAssemblyLines] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const viewAsUserId = sessionUserId || 'all';
  const setViewAsUserId = setSessionUserId;
  const isWritable = currentUser?.role === 'Admin' || currentUser?.role === 'HR';

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, roleFilter, viewAsUserId]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [currentWorker, setCurrentWorker] = useState({
    id: '',
    name: '',
    phone: '',
    department_id: '',
    default_shift_id: '',
    status: 'Active',
    skill_id: '',
    sub_skill: '',
    block_id: '',
    floor_id: '',
    line_id: '',
    proficiency: 'Employee',
    designation: '',
    password: '',
    confirmPassword: '',
    email: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersRes, deptsRes, shiftsRes, skillsRes, linesRes, rolesRes, blocksRes, floorsRes] = await Promise.all([
        fetch(`${API_URL}/api/workers`).then(r => r.json()),
        fetch(`${API_URL}/api/departments`).then(r => r.json()),
        fetch(`${API_URL}/api/shifts`).then(r => r.json()),
        fetch(`${API_URL}/api/skills`).then(r => r.json()),
        fetch(`${API_URL}/api/assembly-lines`).then(r => r.json()),
        fetch(`${API_URL}/api/roles`).then(r => r.json()),
        fetch(`${API_URL}/api/blocks`).then(r => r.json()),
        fetch(`${API_URL}/api/floors`).then(r => r.json())
      ]);

      setWorkers(workersRes);
      setDepartments(deptsRes);
      setShifts(shiftsRes);
      setSkills(skillsRes);
      setAssemblyLines(linesRes);
      setRolesList(rolesRes);
      setBlocks(blocksRes);
      setFloors(floorsRes);
    } catch (error) {
      console.error('Error loading workers data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [API_URL]);

  const openAddModal = () => {
    setCurrentWorker({
      id: '',
      name: '',
      phone: '',
      department_id: '',
      default_shift_id: '',
      status: 'Active',
      skill_id: '',
      sub_skill: '',
      block_id: '',
      floor_id: '',
      line_id: '',
      proficiency: 'Employee',
      designation: '',
      password: '',
      confirmPassword: '',
      email: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalType('add');
    setShowModal(true);
  };

  const openEditModal = (worker) => {
    setCurrentWorker({
      id: worker.id,
      name: worker.name,
      phone: worker.phone,
      department_id: worker.department_id || '',
      default_shift_id: worker.default_shift_id || '',
      status: worker.status || 'Active',
      skill_id: worker.skill_id || '',
      sub_skill: worker.sub_skill || '',
      block_id: worker.block_id || '',
      floor_id: worker.floor_id || '',
      line_id: worker.line_id || '',
      proficiency: worker.proficiency || 'Employee',
      designation: worker.designation || '',
      password: '',
      confirmPassword: '',
      email: worker.email || ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalType('edit');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentWorker(prev => {
      const next = { ...prev, [name]: value };

      if (name === 'block_id') {
        if (next.floor_id) {
          const fl = floors.find(f => String(f.id) === String(next.floor_id));
          if (!fl || (value && String(fl.block_id) !== String(value))) {
            next.floor_id = '';
            next.line_id = '';
          }
        }
        if (next.line_id) {
          const line = assemblyLines.find(l => String(l.id) === String(next.line_id));
          const lineBlockId = line?.block_id || floors.find(f => String(f.id) === String(line?.floor_id))?.block_id;
          if (lineBlockId && value && String(lineBlockId) !== String(value)) {
            next.line_id = '';
          }
        }
      }

      if (name === 'floor_id' && value) {
        const fl = floors.find(f => String(f.id) === String(value));
        if (fl) {
          next.block_id = String(fl.block_id);
        }
        if (next.line_id) {
          const line = assemblyLines.find(l => String(l.id) === String(next.line_id));
          if (line && String(line.floor_id) !== String(value)) {
            next.line_id = '';
          }
        }
      }

      if (name === 'line_id' && value) {
        const line = assemblyLines.find(l => String(l.id) === String(value));
        if (line) {
          next.floor_id = String(line.floor_id);
          const lineBlockId = line.block_id || floors.find(f => String(f.id) === String(line.floor_id))?.block_id;
          if (lineBlockId) {
            next.block_id = String(lineBlockId);
          }
        }
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rolesRequiringLogin = ['Line Supervisor', 'Assembly Line Supervisor', 'IE', 'Block Manager', 'Floor Manager', 'HR', 'Admin', 'CEO'];
    if (rolesRequiringLogin.includes(currentWorker.proficiency)) {
      if (modalType === 'add' && !currentWorker.password) {
        alert('Password is required for this role.');
        return;
      }
      if (currentWorker.password) {
        if (currentWorker.password.length < 8) {
          alert('Password must be at least 8 characters long.');
          return;
        }
        if (!/(?=.*[a-z])/.test(currentWorker.password)) {
          alert('Password must contain at least one lowercase letter.');
          return;
        }
        if (!/(?=.*[A-Z])/.test(currentWorker.password)) {
          alert('Password must contain at least one uppercase letter.');
          return;
        }
        if (!/(?=.*\d)/.test(currentWorker.password)) {
          alert('Password must contain at least one number.');
          return;
        }
        if (currentWorker.password !== currentWorker.confirmPassword) {
          alert('Passwords do not match.');
          return;
        }
      }
    }

    const url = modalType === 'add' 
      ? `${API_URL}/api/workers` 
      : `${API_URL}/api/workers/${currentWorker.id}`;
    
    const method = modalType === 'add' ? 'POST' : 'PUT';

    // Format parameters: convert empty skill_id/line_id to null
    const payload = {
      ...currentWorker,
      skill_id: currentWorker.skill_id || null,
      sub_skill: currentWorker.sub_skill || null,
      block_id: currentWorker.block_id || null,
      floor_id: currentWorker.floor_id || null,
      line_id: currentWorker.line_id || null
    };

    delete payload.confirmPassword;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        closeModal();
        loadData();
      } else {
        const err = await response.json();
        alert(`Error: ${err.error || 'Failed to save worker'}`);
      }
    } catch (error) {
      console.error('Error saving worker:', error);
      alert('Network error saving worker details.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete worker "${name}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/workers/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      } else {
        alert('Failed to delete worker.');
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
    }
  };

  // Helper for role icon display
  const getRoleIcon = (roleName) => {
    if (['Admin', 'HR', 'CEO'].includes(roleName)) return <Shield size={15} color="var(--accent-color)" />;
    if (roleName?.includes('Block')) return <Building2 size={15} color="var(--accent-color)" />;
    if (roleName?.includes('Floor')) return <MapPin size={15} color="var(--accent-color)" />;
    if (roleName?.includes('Line') || roleName?.includes('Supervisor')) return <GitBranch size={15} color="var(--accent-color)" />;
    if (roleName === 'IE' || roleName?.includes('Engineer')) return <Award size={15} color="var(--accent-color)" />;
    return <User size={15} color="var(--accent-color)" />;
  };

  // Effective roles list derived from Role Master
  const effectiveRoles = rolesList.length > 0 
    ? rolesList.map(r => r.role_name)
    : ['Admin', 'HR', 'CEO', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'IE', 'Employee'];

  // Filtered workers list
  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.phone.includes(searchTerm);
    const matchesDept = deptFilter === '' || w.department_id === parseInt(deptFilter);
    
    // Dynamic Role level filtering
    if (roleFilter !== 'all') {
      if (roleFilter === 'Employee') {
        if (w.proficiency && w.proficiency !== 'Employee') return false;
      } else if (w.proficiency !== roleFilter) {
        return false;
      }
    }
    
    // Hierarchy visibility filtering
    if (viewAsUserId !== 'all') {
      const supervisor = workers.find(sup => String(sup.id) === String(viewAsUserId));
      if (supervisor) {
        // HR has full access
        if (supervisor.proficiency === 'HR') {
          return matchesSearch && matchesDept;
        }
        
        // If the worker is the supervisor themselves, let them see their own row
        if (w.id === supervisor.id) {
          return matchesSearch && matchesDept;
        }
        
        // Find supervisor's line location details
        const supervisorLine = assemblyLines.find(line => line.id === supervisor.line_id);
        const workerLine = assemblyLines.find(line => line.id === w.line_id);
        
        if (supervisor.proficiency === 'Line Supervisor') {
          // Only show workers on the same assembly line
          if (w.line_id !== supervisor.line_id) return false;
        } else if (supervisor.proficiency === 'Floor Manager') {
          // Only show workers on the same floor
          if (!supervisorLine || !workerLine || workerLine.floor_id !== supervisorLine.floor_id) {
            return false;
          }
        } else if (supervisor.proficiency === 'Block Manager') {
          // Only show workers in the same block
          if (!supervisorLine || !workerLine || workerLine.block_name !== supervisorLine.block_name) {
            return false;
          }
        }
      }
    }
    
    return matchesSearch && matchesDept;
  });

  // Paginated workers calculation (15 items per page)
  const totalItems = filteredWorkers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWorkers = filteredWorkers.slice(startIndex, endIndex);

  return (
    <>
      <div className="glass-panel">
      <div className="section-header">
        <div>
          <h3>Employee Roster Management</h3>
          <p style={{ marginTop: '0.2rem' }}>Configure employee profiles, telephony contact points, and department mapping.</p>
        </div>
        {isWritable && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Role-Based Pill Tabs dynamically driven by Role Master */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            border: roleFilter === 'all' ? '1px solid var(--accent-color)' : '1px solid var(--panel-border)',
            background: roleFilter === 'all' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0, 0, 0, 0.02)',
            color: roleFilter === 'all' ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={14} />
          <span>All Roles</span>
          <span className={`badge ${roleFilter === 'all' ? 'primary' : 'secondary'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
            {workers.length}
          </span>
        </button>

        {effectiveRoles.map(rName => {
          const count = workers.filter(w => {
            if (rName === 'Employee') return !w.proficiency || w.proficiency === 'Employee';
            return w.proficiency === rName;
          }).length;
          const isActive = roleFilter === rName;

          return (
            <button
              key={rName}
              type="button"
              onClick={() => setRoleFilter(rName)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                border: isActive ? '1px solid var(--accent-color)' : '1px solid var(--panel-border)',
                background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0, 0, 0, 0.02)',
                color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {getRoleIcon(rName)}
              <span>{rName}</span>
              <span className={`badge ${isActive ? 'primary' : 'secondary'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="filter-bar" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper">
          <Search size={16} className="search-input-icon" />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name or mobile..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <select 
            className="form-select" 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select 
            className="form-select" 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="all">All Roles / Types</option>
            {effectiveRoles.map(rName => (
              <option key={rName} value={rName}>{rName}</option>
            ))}
          </select>
        </div>



        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing {totalItems === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, totalItems)} of {totalItems} employees
        </div>
      </div>

      {/* Notice Banner when restricted view is active */}
      {viewAsUserId !== 'all' && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-secondary)'
        }}>
          <div>
            Restricted View Active: Showing employees under the hierarchy of <strong>{workers.find(sup => String(sup.id) === String(viewAsUserId))?.name}</strong> ({workers.find(sup => String(sup.id) === String(viewAsUserId))?.proficiency}).
          </div>
          {['Admin', 'HR', 'Manager'].includes(currentUser?.role) && (
            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setViewAsUserId('all')}>
              Reset to Full Access
            </button>
          )}
        </div>
      )}

      {/* Roster Table */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading employee database...</p>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                {/* Dynamically render header columns based on roleFilter */}
                {roleFilter !== 'all' && roleFilter !== 'Employee' ? (
                  <>
                    <th>Employee Name</th>
                    <th>User ID / Email ID</th>
                    <th>Registered Phone</th>
                    <th>System Role</th>
                    <th>Designation</th>
                    <th>Management Scope</th>
                    <th>Status</th>
                  </>
                ) : roleFilter === 'Employee' ? (
                  <>
                    <th>Employee Name</th>
                    <th>Registered Phone</th>
                    <th>Home Assembly Line</th>
                    <th>Department</th>
                    <th>Skill</th>
                    <th>Status</th>
                  </>
                ) : (
                  <>
                    <th>Employee Name</th>
                    <th>User ID / Email ID</th>
                    <th>Registered Phone</th>
                    <th>Line / Scope</th>
                    <th>System Role</th>
                    <th>Designation / Dept</th>
                    <th>Skill</th>
                    <th>Status</th>
                  </>
                )}
                {isWritable && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={isWritable ? (roleFilter === 'Employee' ? 7 : 9) : (roleFilter === 'Employee' ? 6 : 8)} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No workers matched current search criteria.
                  </td>
                </tr>
              ) : (
                (() => {
                  const groupMap = new Map();

                  // Initialize groups dynamically from Role Master (effectiveRoles)
                  effectiveRoles.forEach(rName => {
                    groupMap.set(rName, { title: rName, icon: getRoleIcon(rName), list: [] });
                  });

                  // Distribute paginated workers into role groups
                  paginatedWorkers.forEach(w => {
                    const prof = w.proficiency || 'Employee';
                    if (!groupMap.has(prof)) {
                      groupMap.set(prof, { title: prof, icon: getRoleIcon(prof), list: [] });
                    }
                    groupMap.get(prof).list.push(w);
                  });

                  const activeRoleGroups = Array.from(groupMap.values()).filter(g => g.list.length > 0);

                  return activeRoleGroups.map(group => (
                    <React.Fragment key={group.title}>
                      {/* Role Section Header */}
                      <tr key={`hdr-${group.title}`}>
                        <td 
                          colSpan={isWritable ? (roleFilter === 'Employee' ? 7 : 9) : (roleFilter === 'Employee' ? 6 : 8)} 
                          style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            padding: '0.65rem 1rem',
                            borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                            borderBottom: '1px solid rgba(99, 102, 241, 0.15)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {group.icon}
                              <span style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--accent-color)' }}>
                                {group.title}
                              </span>
                            </div>
                            <span className="badge primary" style={{ fontSize: '0.7rem' }}>
                              {group.list.length} {group.list.length === 1 ? 'Person' : 'People'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Worker Rows */}
                      {group.list.map(w => (
                        <tr key={w.id}>
                          {/* Column 1: Name */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                background: 'rgba(0,0,0,0.04)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: 'var(--text-secondary)' 
                              }}>
                                <User size={14} />
                              </div>
                              <span style={{ fontWeight: '500' }}>{w.name}</span>
                            </div>
                          </td>

                          {/* Conditional Columns based on roleFilter */}
                          {roleFilter !== 'all' && roleFilter !== 'Employee' ? (
                            <>
                              {/* User ID / Email ID */}
                              <td>
                                {w.email ? (
                                  <span style={{ fontFamily: 'monospace', fontWeight: '500', color: 'var(--accent-color)', fontSize: '0.83rem' }}>
                                    {w.email}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    Not Set
                                  </span>
                                )}
                              </td>

                              {/* Registered Phone */}
                              <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{w.phone}</td>

                              {/* System Role */}
                              <td>
                                <span className={`badge ${
                                  ['Block Manager', 'Floor Manager', 'Line Supervisor', 'HR'].includes(w.proficiency) ? 'success' :
                                  w.proficiency === 'Expert' ? 'info' : 
                                  w.proficiency === 'Employee' ? 'primary' : 'warning'
                                }`} style={{ textTransform: 'none' }}>
                                  {w.proficiency || 'Employee'}
                                </span>
                              </td>
                              {/* Designation */}
                              <td>{w.designation || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                              {/* Management Scope */}
                              <td>
                                {(() => {
                                  const scopes = [];
                                  const block = blocks.find(b => String(b.id) === String(w.block_id));
                                  const floor = floors.find(f => String(f.id) === String(w.floor_id));
                                  const line = assemblyLines.find(al => String(al.id) === String(w.line_id));
                                  if (block) scopes.push(`Block: ${block.name}`);
                                  if (floor) scopes.push(`Floor: ${floor.name}`);
                                  if (line) scopes.push(`Line: ${line.name}`);
                                  return scopes.length > 0 ? (
                                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--accent-color)' }}>
                                      {scopes.join(' > ')}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Global / Unassigned</span>
                                  );
                                })()}
                              </td>
                            </>
                          ) : roleFilter === 'Employee' ? (
                            <>
                              {/* Registered Phone */}
                              <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{w.phone}</td>
                              {/* Home Assembly Line */}
                              <td>
                                {w.line_name ? (
                                  <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                    {w.block_name} &gt; {w.floor_name} &gt; {w.line_name}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unassigned Line</span>
                                )}
                              </td>
                              {/* Department */}
                              <td>{w.department_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                              {/* Skill */}
                              <td>
                                {w.main_skill ? (
                                  <div>
                                    <span style={{ fontWeight: '500' }}>{w.main_skill}</span>
                                    {w.sub_skill && (
                                      <span style={{ 
                                        display: 'block', 
                                        fontSize: '0.75rem', 
                                        color: 'var(--text-muted)' 
                                      }}>
                                        {w.sub_skill}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>None</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              {/* User ID / Email ID */}
                              <td>
                                {w.email ? (
                                  <span style={{ fontFamily: 'monospace', fontWeight: '500', color: 'var(--accent-color)', fontSize: '0.83rem' }}>
                                    {w.email}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                                )}
                              </td>
                              {/* Registered Phone */}
                              <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{w.phone}</td>
                              {/* Line / Scope (Mixed) */}
                              <td>
                                {w.proficiency === 'Employee' ? (
                                  w.line_name ? (
                                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                      {w.block_name} &gt; {w.floor_name} &gt; {w.line_name}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unassigned Line</span>
                                  )
                                ) : (
                                  (() => {
                                    const scopes = [];
                                    const block = blocks.find(b => String(b.id) === String(w.block_id));
                                    const floor = floors.find(f => String(f.id) === String(w.floor_id));
                                    const line = assemblyLines.find(al => String(al.id) === String(w.line_id));
                                    if (block) scopes.push(`B: ${block.name}`);
                                    if (floor) scopes.push(`F: ${floor.name}`);
                                    if (line) scopes.push(`L: ${line.name}`);
                                    return scopes.length > 0 ? (
                                      <span style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--accent-color)' }}>
                                        {scopes.join(' > ')}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Global</span>
                                    );
                                  })()
                                )}
                              </td>
                              {/* System Role */}
                              <td>
                                <span className={`badge ${
                                  ['Block Manager', 'Floor Manager', 'Line Supervisor', 'HR'].includes(w.proficiency) ? 'success' :
                                  w.proficiency === 'Expert' ? 'info' : 
                                  w.proficiency === 'Employee' ? 'primary' : 'warning'
                                }`} style={{ textTransform: 'none' }}>
                                  {w.proficiency || 'Employee'}
                                </span>
                              </td>
                              {/* Designation / Dept */}
                              <td>
                                {w.proficiency === 'Employee' ? (
                                  w.department_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                ) : (
                                  w.designation ? (
                                    <span style={{ fontStyle: 'italic', fontWeight: '500' }}>{w.designation}</span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>No Designation</span>
                                  )
                                )}
                              </td>
                              {/* Skill */}
                              <td>
                                {w.proficiency === 'Employee' ? (
                                  w.main_skill ? (
                                    <div>
                                      <span style={{ fontWeight: '500' }}>{w.main_skill}</span>
                                      {w.sub_skill && (
                                        <span style={{ 
                                          display: 'block', 
                                          fontSize: '0.75rem', 
                                          color: 'var(--text-muted)' 
                                        }}>
                                          {w.sub_skill}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                                  )
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>
                            </>
                          )}

                          {/* Status */}
                          <td>
                            <span className={`badge ${w.status === 'Active' ? 'success' : 'danger'}`}>
                              {w.status}
                            </span>
                          </td>

                          {/* Actions */}
                          {isWritable && (
                            <td>
                              <div className="action-buttons-cell">
                                <button className="btn-icon edit" onClick={() => openEditModal(w)} title="Edit Worker">
                                  <Edit2 size={14} />
                                </button>
                                <button className="btn-icon delete" onClick={() => handleDelete(w.id, w.name)} title="Delete Worker">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  ));
                })()
              )}
            </tbody>
          </table>

          {/* Pagination Controls Bar */}
          {totalItems > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--panel-border)',
              background: 'rgba(0, 0, 0, 0.02)',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing <strong>{startIndex + 1}</strong> – <strong>{Math.min(endIndex, totalItems)}</strong> of <strong>{totalItems}</strong> employees
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  style={{ padding: '0.3rem 0.55rem', height: 'auto', fontSize: '0.78rem' }}
                  title="First Page"
                >
                  <ChevronsLeft size={15} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{ padding: '0.3rem 0.65rem', height: 'auto', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>

                <span style={{ fontSize: '0.825rem', fontWeight: '600', padding: '0 0.5rem', color: 'var(--text-primary)' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{ padding: '0.3rem 0.65rem', height: 'auto', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  style={{ padding: '0.3rem 0.55rem', height: 'auto', fontSize: '0.78rem' }}
                  title="Last Page"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Add / Edit Worker Form (Drawer popup, slides from left to right) */}
    {showModal && (
      <div className="drawer-overlay" onClick={closeModal}>
        <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <h4>{modalType === 'add' ? 'Create New Profile' : 'Modify Worker Profile'}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem', margin: 0 }}>
                Get started by filling in the information below.
              </p>
            </div>
            <button className="btn-icon" onClick={closeModal} type="button">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="drawer-form">
            {/* Section 2: Skills & Roles */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Sliders size={16} />
                <span>Role & Skills</span>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Proficiency / Role</label>
                  <div className="form-input-wrapper">
                    <select 
                      name="proficiency" 
                      className="form-select" 
                      value={currentWorker.proficiency}
                      onChange={handleInputChange}
                    >
                      {rolesList.length > 0 ? (
                        rolesList.map(r => (
                          <option key={r.id} value={r.role_name}>{r.role_name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Block Manager">Block Manager</option>
                          <option value="Floor Manager">Floor Manager</option>
                          <option value="Line Supervisor">Line Supervisor</option>
                          <option value="Employee">Employee</option>
                        </>
                      )}
                    </select>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Defines functional permissions and data-scoping logic.
                  </span>
                </div>

                <div className="form-group">
                  <label>Roster Status</label>
                  <div className="form-input-wrapper">
                    <select 
                      name="status" 
                      className="form-select" 
                      value={currentWorker.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {currentWorker.proficiency !== 'Employee' ? (
                <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Designation</label>
                    <div className="form-input-wrapper">
                      <input 
                        type="text"
                        name="designation"
                        className="form-input"
                        placeholder="Enter designation..."
                        value={currentWorker.designation || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Descriptive organizational title (e.g., Senior Operations Lead).
                    </span>
                  </div>
                </div>
              ) : (
                <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label>Main Skill Category</label>
                    <div className="form-input-wrapper">
                      <select 
                        name="skill_id" 
                        className="form-select" 
                        value={currentWorker.skill_id}
                        onChange={(e) => {
                          const nextSkillId = e.target.value;
                          const record = skills.find(s => String(s.id) === String(nextSkillId));
                          setCurrentWorker(prev => ({
                            ...prev,
                            skill_id: nextSkillId,
                            sub_skill: record?.sub_skills?.[0] || ''
                          }));
                        }}
                      >
                        <option value="">No Skill Assigned</option>
                        {skills.map(s => (
                          <option key={s.id} value={s.id}>{s.main_skill}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Subskill Selection</label>
                    <div className="form-input-wrapper">
                      <select 
                        name="sub_skill" 
                        className="form-select" 
                        value={currentWorker.sub_skill}
                        onChange={handleInputChange}
                        disabled={!currentWorker.skill_id}
                      >
                        {!currentWorker.skill_id ? (
                          <option value="">Select skill first</option>
                        ) : (
                          <>
                            {skills.find(s => String(s.id) === String(currentWorker.skill_id))?.sub_skills.map((sub, idx) => (
                              <option key={idx} value={sub}>{sub}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 1: Personal Details */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <User size={16} />
                <span>Personal Details</span>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Employee Name *</label>
                  <div className="form-input-wrapper">
                    <input 
                      type="text" 
                      name="name" 
                      className="form-input" 
                      required 
                      placeholder="John Doe" 
                      value={currentWorker.name}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <div className="form-input-wrapper">
                    <input 
                      type="text" 
                      name="phone" 
                      className="form-input" 
                      required 
                      placeholder="e.g. +91 00000 00000" 
                      value={currentWorker.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {['Line Supervisor', 'Assembly Line Supervisor', 'IE', 'Block Manager', 'Floor Manager', 'HR', 'Admin', 'CEO'].includes(currentWorker.proficiency) && (
                <>
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label>Email / User ID</label>
                    <div className="form-input-wrapper">
                      <input 
                        type="text" 
                        name="email" 
                        className="form-input" 
                        placeholder="e.g. supervisor@company.com or SUP101" 
                        value={currentWorker.email}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label>Password {modalType === 'add' ? '*' : '(Leave blank to keep current)'}</label>
                    <div className="form-input-wrapper" style={{ position: 'relative' }}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        name="password" 
                        className="form-input" 
                        required={modalType === 'add'} 
                        placeholder="Enter password" 
                        value={currentWorker.password}
                        onChange={handleInputChange}
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password {modalType === 'add' ? '*' : ''}</label>
                    <div className="form-input-wrapper" style={{ position: 'relative' }}>
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        name="confirmPassword" 
                        className="form-input" 
                        required={modalType === 'add'} 
                        placeholder="Confirm password" 
                        value={currentWorker.confirmPassword}
                        onChange={handleInputChange}
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  </div>
                </>
              )}
            </div>

            {/* Section 3: Work Assignment / Management Scope */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <GitBranch size={16} />
                <span>{currentWorker.proficiency === 'Employee' ? 'Home Line Placement' : 'Management Scope'}</span>
              </div>

              {currentWorker.proficiency === 'Employee' ? (
                <div className="form-group">
                  <label>Home Assembly Line</label>
                  <div className="form-input-wrapper">
                    <select 
                      name="line_id" 
                      className="form-select" 
                      value={currentWorker.line_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Unassigned</option>
                      {assemblyLines.map(line => (
                        <option key={line.id} value={line.id}>
                          {line.block_name} &gt; {line.floor_name} &gt; {line.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : ['Admin', 'HR', 'CEO', 'IE'].includes(currentWorker.proficiency) ? (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px dashed rgba(99, 102, 241, 0.2)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4'
                }}>
                  <strong>Global Access Role:</strong> Users with the <em>{currentWorker.proficiency}</em> role automatically have full administrative access to all Blocks, Floors, and Assembly Lines. No scope assignment is necessary.
                </div>
              ) : (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Block Scope</label>
                    <div className="form-input-wrapper">
                      <select name="block_id" className="form-select" value={currentWorker.block_id || ''} onChange={handleInputChange}>
                        <option value="">Unassigned</option>
                        {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {(currentWorker.proficiency.includes('Floor') || currentWorker.proficiency.includes('Line') || currentWorker.proficiency.includes('Supervisor')) && (
                    <div className="form-group">
                      <label>Floor Scope</label>
                      <div className="form-input-wrapper">
                        <select name="floor_id" className="form-select" value={currentWorker.floor_id || ''} onChange={handleInputChange}>
                          <option value="">Unassigned</option>
                          {floors.filter(f => !currentWorker.block_id || String(f.block_id) === String(currentWorker.block_id)).map(f => (
                            <option key={f.id} value={f.id}>{f.block_name} &gt; {f.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {(currentWorker.proficiency.includes('Line') || currentWorker.proficiency.includes('Supervisor')) && (
                    <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '0.75rem' }}>
                      <label>Assembly Line Scope</label>
                      <div className="form-input-wrapper">
                        <select name="line_id" className="form-select" value={currentWorker.line_id || ''} onChange={handleInputChange}>
                          <option value="">Unassigned</option>
                          {assemblyLines.filter(al => {
                            const lineBlockId = al.block_id || floors.find(f => String(f.id) === String(al.floor_id))?.block_id;
                            const matchesBlock = !currentWorker.block_id || String(lineBlockId) === String(currentWorker.block_id);
                            const matchesFloor = !currentWorker.floor_id || String(al.floor_id) === String(currentWorker.floor_id);
                            return matchesBlock && matchesFloor;
                          }).map(line => (
                            <option key={line.id} value={line.id}>
                              {line.block_name || blocks.find(b => String(b.id) === String(line.block_id || floors.find(f => String(f.id) === String(line.floor_id))?.block_id))?.name} &gt; {line.floor_name} &gt; {line.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="drawer-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                {modalType === 'add' ? 'Create Worker' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
);
}
