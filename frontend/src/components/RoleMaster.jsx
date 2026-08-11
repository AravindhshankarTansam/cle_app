import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Shield } from 'lucide-react';

export default function RoleMaster({ API_URL }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newRoleName, setNewRoleName] = useState('');

  // Edit states
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/roles`);
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error loading roles data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [API_URL]);

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleName) return;

    try {
      const response = await fetch(`${API_URL}/api/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName })
      });

      if (response.ok) {
        setNewRoleName('');
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add role.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRole = async (id, name) => {
    if (!confirm(`Are you sure you want to delete role "${name}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/roles/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete role.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditRole = (role) => {
    setEditingRoleId(role.id);
    setEditRoleName(role.role_name);
  };

  const cancelEditRole = () => setEditingRoleId(null);

  const saveEditRole = async (id) => {
    if (!editRoleName) return;
    try {
      const response = await fetch(`${API_URL}/api/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editRoleName })
      });
      if (response.ok) {
        setEditingRoleId(null);
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel">
        <div className="section-header">
          <div>
            <h3>Role Master</h3>
            <p style={{ marginTop: '0.2rem' }}>Define job titles, roles, and proficiency levels for employees.</p>
          </div>
        </div>

        {/* Informative Guidance Note */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
            System Roles vs. Designations:
          </strong>
          Roles defined here represent <strong>functional system access levels</strong> (e.g., <em>Block Manager</em>, <em>Floor Manager</em>, <em>Line Supervisor</em>, <em>Employee</em>) which control user permissions and data scoping.
          For specific descriptive job titles (e.g., <em>"Night Operations Assistant"</em>), keep the functional system role standard and specify the custom title in the <strong>Designation</strong> field on the Employee Roster.
        </div>

        {/* Add Role Form */}
        <form onSubmit={handleAddRole} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
            <label>Role / Proficiency Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Quality Inspector" 
              required
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            <Plus size={16} /> Add Role
          </button>
        </form>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No roles defined yet.
                    </td>
                  </tr>
                ) : (
                  roles.map(role => (
                    <tr key={role.id}>
                      <td>
                        {editingRoleId === role.id ? (
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: '0.4rem', height: 'auto' }} 
                            value={editRoleName} 
                            onChange={(e) => setEditRoleName(e.target.value)} 
                            autoFocus
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                            <Shield size={16} color="var(--accent-color)" />
                            {role.role_name}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {editingRoleId === role.id ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button className="btn-icon success" onClick={() => saveEditRole(role.id)} title="Save"><Check size={14} /></button>
                            <button className="btn-icon delete" onClick={cancelEditRole} title="Cancel"><X size={14} /></button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button className="btn-icon primary" onClick={() => startEditRole(role)} title="Edit Role"><Edit2 size={14} /></button>
                            <button className="btn-icon delete" onClick={() => handleDeleteRole(role.id, role.role_name)} title="Delete Role"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
