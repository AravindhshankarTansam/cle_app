import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Wrench } from 'lucide-react';

export default function SkillMaster({ API_URL }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [currentSkill, setCurrentSkill] = useState({
    id: '',
    main_skill: '',
    sub_skills: []
  });
  
  // Temp state for adding a subskill in the form
  const [newSubSkillText, setNewSubSkillText] = useState('');

  const loadSkills = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, [API_URL]);

  const openAddModal = () => {
    setCurrentSkill({
      id: '',
      main_skill: '',
      sub_skills: []
    });
    setNewSubSkillText('');
    setModalType('add');
    setShowModal(true);
  };

  const openEditModal = (skill) => {
    setCurrentSkill({
      id: skill.id,
      main_skill: skill.main_skill,
      sub_skills: [...skill.sub_skills]
    });
    setNewSubSkillText('');
    setModalType('edit');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleAddSubSkill = (e) => {
    e.preventDefault();
    const cleanText = newSubSkillText.trim();
    if (cleanText && !currentSkill.sub_skills.includes(cleanText)) {
      setCurrentSkill(prev => ({
        ...prev,
        sub_skills: [...prev.sub_skills, cleanText]
      }));
      setNewSubSkillText('');
    }
  };

  const handleRemoveSubSkill = (indexToRemove) => {
    setCurrentSkill(prev => ({
      ...prev,
      sub_skills: prev.sub_skills.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentSkill.sub_skills.length === 0) {
      alert('Please add at least one subskill.');
      return;
    }

    const url = modalType === 'add'
      ? `${API_URL}/api/skills`
      : `${API_URL}/api/skills/${currentSkill.id}`;
    
    const method = modalType === 'add' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_skill: currentSkill.main_skill,
          sub_skills: currentSkill.sub_skills
        })
      });

      if (response.ok) {
        closeModal();
        loadSkills();
      } else {
        const err = await response.json();
        alert(`Error: ${err.error || 'Failed to save skill'}`);
      }
    } catch (error) {
      console.error('Error saving skill:', error);
      alert('Network error saving skill details.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the skill "${name}"? This will unassign it from any workers.`)) return;

    try {
      const response = await fetch(`${API_URL}/api/skills/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadSkills();
      } else {
        alert('Failed to delete skill.');
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
    }
  };

  return (
    <div className="glass-panel">
      <div className="section-header">
        <div>
          <h3>Skill Master Configuration</h3>
          <p style={{ marginTop: '0.2rem' }}>Define primary and sub-skills to categorize capabilities of your roster.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add New Skill
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading skill registry...</p>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th style={{ width: '250px' }}>Main Skill</th>
                <th>Subskills (JSON Array)</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No skills registered yet. Click "Add New Skill" to get started.
                  </td>
                </tr>
              ) : (
                skills.map(sk => (
                  <tr key={sk.id}>
                    <td style={{ fontFamily: 'monospace' }}>#{sk.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                        <Wrench size={14} color="var(--accent-color)" />
                        <span>{sk.main_skill}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {sk.sub_skills.map((sub, idx) => (
                          <span key={idx} className="badge info" style={{ fontSize: '0.78rem', textTransform: 'none' }}>
                            {sub}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons-cell">
                        <button className="btn-icon edit" onClick={() => openEditModal(sk)} title="Edit Skill">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDelete(sk.id, sk.main_skill)} title="Delete Skill">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Skill Modal Overlay */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h4>{modalType === 'add' ? 'Create Skill Group' : 'Edit Skill Group'}</h4>
              <button className="btn-icon" onClick={closeModal}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Main Skill Category *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="e.g. Welding, Plumbing, Electrical" 
                  value={currentSkill.main_skill}
                  onChange={(e) => setCurrentSkill(prev => ({ ...prev, main_skill: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Add Subskill *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. TIG Welding, CNC Coding" 
                    value={newSubSkillText}
                    onChange={(e) => setNewSubSkillText(e.target.value)}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleAddSubSkill}>
                    Add
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Subskills List (JSON Mode Array)</label>
                <div style={{ 
                  border: '1px solid var(--panel-border)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.05)',
                  minHeight: '100px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'flex-start',
                  gap: '0.5rem'
                }}>
                  {currentSkill.sub_skills.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No subskills added yet.</span>
                  ) : (
                    currentSkill.sub_skills.map((sub, idx) => (
                      <span key={idx} className="badge info" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
                        textTransform: 'none'
                      }}>
                        {sub}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer', opacity: 0.7 }} 
                          onClick={() => handleRemoveSubSkill(idx)} 
                        />
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
