import React, { useState, useEffect } from 'react';
import { Layers, MapPin, Activity, Plus, Edit2, Trash2, Sliders } from 'lucide-react';

export default function HierarchyMaster({ API_URL }) {
  const [activeSubTab, setActiveSubTab] = useState('blocks'); // 'blocks', 'floors', 'lines'
  const [loading, setLoading] = useState(false);
  
  // Data lists
  const [blocks, setBlocks] = useState([]);
  const [floors, setFloors] = useState([]);
  const [lines, setLines] = useState([]);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingItem, setEditingItem] = useState(null);

  // Form Fields
  const [blockName, setBlockName] = useState('');
  const [floorName, setFloorName] = useState('');
  const [floorBlockId, setFloorBlockId] = useState('');
  const [lineName, setLineName] = useState('');
  const [lineFloorId, setLineFloorId] = useState('');
  const [lineReqWorkers, setLineReqWorkers] = useState(0);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bRes, fRes, lRes] = await Promise.all([
        fetch(`${API_URL}/api/blocks`).then(r => r.json()),
        fetch(`${API_URL}/api/floors`).then(r => r.json()),
        fetch(`${API_URL}/api/assembly-lines`).then(r => r.json())
      ]);
      setBlocks(bRes);
      setFloors(fRes);
      setLines(lRes);
    } catch (error) {
      console.error('Error loading master hierarchy data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [API_URL]);

  const openAddModal = () => {
    setModalMode('add');
    setEditingItem(null);
    setBlockName('');
    setFloorName('');
    setFloorBlockId(blocks[0]?.id || '');
    setLineName('');
    setLineFloorId(floors[0]?.id || '');
    setLineReqWorkers(0);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingItem(item);
    
    if (activeSubTab === 'blocks') {
      setBlockName(item.name);
    } else if (activeSubTab === 'floors') {
      setFloorName(item.name);
      setFloorBlockId(item.block_id);
    } else if (activeSubTab === 'lines') {
      setLineName(item.name);
      setLineFloorId(item.floor_id);
      setLineReqWorkers(item.required_workers);
    }
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let url = '';
    let method = 'POST';
    let body = {};

    if (activeSubTab === 'blocks') {
      url = `${API_URL}/api/blocks`;
      if (modalMode === 'edit') {
        url += `/${editingItem.id}`;
        method = 'PUT';
      }
      body = { name: blockName };
    } else if (activeSubTab === 'floors') {
      url = `${API_URL}/api/floors`;
      if (modalMode === 'edit') {
        url += `/${editingItem.id}`;
        method = 'PUT';
      }
      body = { name: floorName, block_id: parseInt(floorBlockId) };
    } else if (activeSubTab === 'lines') {
      url = `${API_URL}/api/assembly-lines`;
      if (modalMode === 'edit') {
        url += `/${editingItem.id}`;
        method = 'PUT';
      }
      body = { 
        name: lineName, 
        floor_id: parseInt(lineFloorId), 
        required_workers: parseInt(lineReqWorkers) 
      };
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setModalOpen(false);
        loadAll();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Operation failed'}`);
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Network error submitting request.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will cascade-delete all sub-elements (floors, lines, reassignments) linked to it.`)) {
      return;
    }

    let url = '';
    if (activeSubTab === 'blocks') {
      url = `${API_URL}/api/blocks/${id}`;
    } else if (activeSubTab === 'floors') {
      url = `${API_URL}/api/floors/${id}`;
    } else if (activeSubTab === 'lines') {
      url = `${API_URL}/api/assembly-lines/${id}`;
    }

    setLoading(true);
    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        loadAll();
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hierarchy-master-container">
      <style>{`
        .hierarchy-master-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .master-tabs-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0.5rem;
          border-radius: 10px;
        }

        .master-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .master-tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .master-tab-btn.active {
          background: var(--accent-primary, #6366f1);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        .actions-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>

      {/* Description / Summary Header */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layers style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h4 style={{ margin: 0 }}>Plant Floor Hierarchy Configurator</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Manage physical Blocks, Floors, and Assembly Lines. Changes here update selectors and real-time dashboard layouts globally.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Sub Tabs */}
      <div className="master-tabs-bar">
        <button 
          className={`master-tab-btn ${activeSubTab === 'blocks' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('blocks')}
        >
          <Layers size={15} /> Blocks ({blocks.length})
        </button>
        <button 
          className={`master-tab-btn ${activeSubTab === 'floors' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('floors')}
        >
          <MapPin size={15} /> Floors ({floors.length})
        </button>
        <button 
          className={`master-tab-btn ${activeSubTab === 'lines' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('lines')}
        >
          <Activity size={15} /> Assembly Lines ({lines.length})
        </button>
      </div>

      {/* Content Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="actions-header-bar" style={{ marginBottom: '1.25rem' }}>
          <h5 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1rem', fontWeight: '600' }}>
            Active {activeSubTab} Database
          </h5>
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={15} /> Add {activeSubTab.slice(0, -1)}
          </button>
        </div>

        {loading && blocks.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading configuration...</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                {activeSubTab === 'blocks' && (
                  <tr>
                    <th>Block ID</th>
                    <th>Block Name</th>
                    <th style={{ width: '150px' }}>Actions</th>
                  </tr>
                )}
                {activeSubTab === 'floors' && (
                  <tr>
                    <th>Floor ID</th>
                    <th>Floor Name</th>
                    <th>Linked Block</th>
                    <th style={{ width: '150px' }}>Actions</th>
                  </tr>
                )}
                {activeSubTab === 'lines' && (
                  <tr>
                    <th>Line ID</th>
                    <th>Assembly Line</th>
                    <th>Linked Floor & Block</th>
                    <th style={{ width: '150px' }}>Actions</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeSubTab === 'blocks' && (
                  blocks.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace' }}>#{b.id}</td>
                      <td style={{ fontWeight: '500' }}>{b.name}</td>
                      <td>
                        <div className="action-buttons-cell">
                          <button className="btn-icon edit" onClick={() => openEditModal(b)} title="Edit Block"><Edit2 size={13} /></button>
                          <button className="btn-icon delete" onClick={() => handleDelete(b.id, b.name)} title="Delete Block"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {activeSubTab === 'floors' && (
                  floors.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontFamily: 'monospace' }}>#{f.id}</td>
                      <td style={{ fontWeight: '500' }}>Floor {f.name}</td>
                      <td>{f.block_name || `Block ID: ${f.block_id}`}</td>
                      <td>
                        <div className="action-buttons-cell">
                          <button className="btn-icon edit" onClick={() => openEditModal(f)} title="Edit Floor"><Edit2 size={13} /></button>
                          <button className="btn-icon delete" onClick={() => handleDelete(f.id, f.name)} title="Delete Floor"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {activeSubTab === 'lines' && (
                  lines.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'monospace' }}>#{l.id}</td>
                      <td style={{ fontWeight: '500' }}>Line {l.name}</td>
                      <td>{l.block_name} &gt; {l.floor_name}</td>
                      <td>
                        <div className="action-buttons-cell">
                          <button className="btn-icon edit" onClick={() => openEditModal(l)} title="Edit Assembly Line"><Edit2 size={13} /></button>
                          <button className="btn-icon delete" onClick={() => handleDelete(l.id, l.name)} title="Delete Assembly Line"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog Overlay */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h4>{modalMode === 'add' ? 'Add New' : 'Edit'} {activeSubTab.slice(0, -1)}</h4>
              <button className="btn-icon" onClick={() => setModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {activeSubTab === 'blocks' && (
                <div className="form-group">
                  <label>Block Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Block A" 
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                    required
                  />
                </div>
              )}

              {activeSubTab === 'floors' && (
                <>
                  <div className="form-group">
                    <label>Floor Identifier/Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. F1, F2" 
                      value={floorName}
                      onChange={(e) => setFloorName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Link to Block</label>
                    <select 
                      className="form-select" 
                      value={floorBlockId} 
                      onChange={(e) => setFloorBlockId(e.target.value)}
                      required
                    >
                      <option value="" disabled>-- Select a Block --</option>
                      {blocks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeSubTab === 'lines' && (
                <>
                  <div className="form-group">
                    <label>Assembly Line Identifier</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. L1, L2" 
                      value={lineName}
                      onChange={(e) => setLineName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Link to Floor Location</label>
                    <select 
                      className="form-select" 
                      value={lineFloorId} 
                      onChange={(e) => setLineFloorId(e.target.value)}
                      required
                    >
                      <option value="" disabled>-- Select Floor --</option>
                      {floors.map(f => (
                        <option key={f.id} value={f.id}>{f.block_name} ➔ Floor {f.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
