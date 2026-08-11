import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Activity, 
  ArrowRightLeft, 
  UserCheck, 
  UserPlus,
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  Undo2
} from 'lucide-react';

export default function HRDashboard({ API_URL, sessionUser }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [assemblyLines, setAssemblyLines] = useState([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [proficiencyFilter, setProficiencyFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  
  // Reassignment Modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [targetLineId, setTargetLineId] = useState('');
  const [reassignmentReason, setReassignmentReason] = useState('Manual Deficit Rebalancing');
  const [submitting, setSubmitting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Expanded nodes for hierarchy visualizer
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [expandedLines, setExpandedLines] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, linesRes] = await Promise.all([
        fetch(`${API_URL}/api/hr/dashboard?date=${date}`).then(r => r.json()),
        fetch(`${API_URL}/api/assembly-lines`).then(r => r.json())
      ]);
      setDashboardData(dashRes);
      setAssemblyLines(linesRes);

      // Auto-expand everything on first load
      if (dashRes && dashRes.hierarchy) {
        const blks = {};
        const flrs = {};
        const lns = {};
        dashRes.hierarchy.forEach(b => {
          blks[b.id] = true;
          b.floors.forEach(f => {
            flrs[f.id] = true;
            f.lines.forEach(l => {
              lns[l.id] = true;
            });
          });
        });
        setExpandedBlocks(prev => ({ ...blks, ...prev }));
        setExpandedFloors(prev => ({ ...flrs, ...prev }));
        setExpandedLines(prev => ({ ...lns, ...prev }));
      }
    } catch (err) {
      console.error('Error fetching HR Dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, API_URL]);

  const toggleBlock = (id) => {
    setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFloor = (id) => {
    setExpandedFloors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleLine = (id) => {
    setExpandedLines(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenReassign = (worker) => {
    setSelectedWorker(worker);
    setTargetLineId(worker.allocated_line_id || '');
    setReassignmentReason('Manual Deficit Rebalancing');
    setShowReassignModal(true);
  };

  const handleCloseReassign = () => {
    setSelectedWorker(null);
    setShowReassignModal(false);
  };

  const submitReassignment = async (e) => {
    e.preventDefault();
    if (!selectedWorker || !targetLineId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/hr/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          worker_id: selectedWorker.id,
          allocated_line_id: targetLineId === 'reset' ? selectedWorker.home_line_id : parseInt(targetLineId),
          reason: reassignmentReason
        })
      });

      if (response.ok) {
        handleCloseReassign();
        loadData();
      } else {
        const err = await response.json();
        alert(`Error: ${err.error || 'Failed to reassign worker'}`);
      }
    } catch (error) {
      console.error('Error reassigning worker:', error);
      alert('Network error submitting reassignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearAllReassignments = () => {
    setShowResetConfirm(true);
  };

  const confirmResetDay = async () => {
    setShowResetConfirm(false);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/hr/reassign/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      if (response.ok) {
        loadData();
      } else {
        alert('Failed to clear reassignments.');
      }
    } catch (error) {
      console.error('Error clearing reassignments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for KPI Cards
  let totalRequired = 0;
  let totalPresent = 0;
  let totalShortage = 0;
  let totalSurplus = 0;
  let totalReassigned = 0;
  let activeLinesCount = 0;

  if (dashboardData && dashboardData.hierarchy) {
    const supLine = sessionUser ? assemblyLines.find(al => al.id === sessionUser.line_id) : null;

    dashboardData.hierarchy.forEach(block => {
      // Filter block level
      if (sessionUser && sessionUser.proficiency !== 'HR') {
        if (!supLine || block.name !== supLine.block_name) return;
      }

      block.floors.forEach(floor => {
        // Filter floor level
        if (sessionUser && sessionUser.proficiency !== 'HR') {
          if (sessionUser.proficiency === 'Floor Supervisor' || sessionUser.proficiency === 'Assembly Line Supervisor') {
            if (!supLine || floor.id !== supLine.floor_id) return;
          }
        }

        floor.lines.forEach(line => {
          // Filter line level
          if (sessionUser && sessionUser.proficiency === 'Assembly Line Supervisor') {
            if (line.id !== sessionUser.line_id) return;
          }

          activeLinesCount++;
          totalRequired += line.required_workers;
          totalPresent += line.present_count;
          totalShortage += line.deficit;
          totalSurplus += line.surplus;
        });
      });
    });

    // Filter present workers count in reassignments
    const scopeWorkerIds = [];
    if (sessionUser && sessionUser.proficiency !== 'HR' && supLine) {
      dashboardData.hierarchy.forEach(block => {
        if (block.name !== supLine.block_name) return;
        block.floors.forEach(floor => {
          if (sessionUser.proficiency === 'Floor Supervisor' || sessionUser.proficiency === 'Assembly Line Supervisor') {
            if (floor.id !== supLine.floor_id) return;
          }
          floor.lines.forEach(line => {
            if (sessionUser.proficiency === 'Assembly Line Supervisor') {
              if (line.id !== sessionUser.line_id) return;
            }
            line.workers.forEach(w => {
              scopeWorkerIds.push(w.id);
            });
          });
        });
      });
      totalReassigned = dashboardData.present_workers.filter(w => w.reassigned && scopeWorkerIds.includes(w.id)).length;
    } else {
      totalReassigned = dashboardData.present_workers.filter(w => w.reassigned).length;
    }
  }

  // Filter Present Workers for the Matrix Grid
  const filteredPresentWorkers = (dashboardData?.present_workers || []).filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          w.phone.includes(searchQuery);
    const matchesProficiency = proficiencyFilter === '' || w.proficiency === proficiencyFilter;
    const matchesSkill = skillFilter === '' || (w.main_skill && w.main_skill.toLowerCase() === skillFilter.toLowerCase());
    
    // Hierarchy filtering
    if (sessionUser && sessionUser.proficiency !== 'HR') {
      const supLine = assemblyLines.find(al => al.id === sessionUser.line_id);
      if (supLine) {
        if (sessionUser.proficiency === 'Assembly Line Supervisor') {
          if (w.home_line_id !== sessionUser.line_id && w.allocated_line_id !== sessionUser.line_id) return false;
        } else if (sessionUser.proficiency === 'Floor Supervisor') {
          const homeLine = assemblyLines.find(al => al.id === w.home_line_id);
          const allocatedLine = assemblyLines.find(al => al.id === w.allocated_line_id);
          const homeFloorMatches = homeLine && homeLine.floor_id === supLine.floor_id;
          const allocatedFloorMatches = allocatedLine && allocatedLine.floor_id === supLine.floor_id;
          if (!homeFloorMatches && !allocatedFloorMatches) return false;
        } else if (sessionUser.proficiency === 'Block Supervisor') {
          const homeLine = assemblyLines.find(al => al.id === w.home_line_id);
          const allocatedLine = assemblyLines.find(al => al.id === w.allocated_line_id);
          const homeBlockMatches = homeLine && homeLine.block_name === supLine.block_name;
          const allocatedBlockMatches = allocatedLine && allocatedLine.block_name === supLine.block_name;
          if (!homeBlockMatches && !allocatedBlockMatches) return false;
        }
      }
    }

    return matchesSearch && matchesProficiency && matchesSkill;
  });

  // Unique skills for filtering
  const uniqueSkills = Array.from(new Set(
    (dashboardData?.present_workers || [])
      .map(w => w.main_skill)
      .filter(Boolean)
  ));

  const renderLineNode = (line, floor, block) => {
    const isLineExpanded = expandedLines[line.id];
    const ratio = line.required_workers > 0 ? (line.present_count / line.required_workers) * 100 : 100;
    const barColor = line.deficit > 0 ? '#ef4444' : ratio > 100 ? '#10b981' : '#6366f1';

    return (
      <div className="line-node" key={line.id}>
        <div className="line-header" onClick={() => toggleLine(line.id)}>
          <div className="line-title">
            <Activity size={14} style={{ color: barColor }} />
            <span>Line {line.name}</span>
            {line.deficit > 0 ? (
              <span className="node-badge deficit" style={{ fontSize: '0.65rem' }}>
                {line.deficit} Deficit
              </span>
            ) : line.surplus > 0 ? (
              <span className="node-badge surplus" style={{ fontSize: '0.65rem' }}>
                +{line.surplus} Surplus
              </span>
            ) : (
              <span className="node-badge balanced" style={{ fontSize: '0.65rem' }}>
                Balanced
              </span>
            )}
          </div>

          {/* Progress / Capacity Bar */}
          <div className="capacity-bar-wrapper">
            <div className="capacity-bar">
              <div 
                className="capacity-fill" 
                style={{ 
                  width: `${Math.min(ratio, 100)}%`, 
                  backgroundColor: barColor 
                }} 
              />
            </div>
            <div className="capacity-labels">
              <span>Capacity</span>
              <span>{line.present_count} / {line.required_workers}</span>
            </div>
          </div>
        </div>

        {isLineExpanded && (
          <div className="line-workers-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>Home Line Members</span>
              <span>
                In: {line.reassigned_in_count} | Out: {line.reassigned_out_count}
              </span>
            </div>

            {/* Reassigned IN List */}
            {line.workers.length === 0 && line.reassigned_in_count === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                No workers allocated to this line.
              </p>
            )}

            {line.workers.map(w => {
              const displayBadgeColor = w.attendance_status === 'Coming' || w.attendance_status === 'Present' 
                ? 'success' 
                : 'danger';

              return (
                <div className="line-worker-item" key={w.id} style={{ opacity: w.attendance_status === 'Absent' ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${displayBadgeColor}`} style={{ width: '8px', height: '8px', borderRadius: '50%', padding: 0 }}></span>
                    <span style={{ fontWeight: '500' }}>{w.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({w.proficiency})</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {w.attendance_status === 'Absent' ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absent</span>
                    ) : w.is_reassigned_out ? (
                      <span style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        Reassigned Out
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#34d399' }}>On Line</span>
                    )}

                    {w.attendance_status !== 'Absent' && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReassign({
                            id: w.id,
                            name: w.name,
                            proficiency: w.proficiency,
                            main_skill: w.main_skill,
                            home_line_id: line.id,
                            home_line_name: line.name,
                            home_floor_name: floor.name,
                            home_block_name: block.name,
                            allocated_line_id: w.allocated_line_id
                          });
                        }}
                      >
                        Shift
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderFloorNode = (floor, block) => {
    const isFloorExpanded = expandedFloors[floor.id];
    const floorStatus = floor.present_count >= floor.required_workers ? 'surplus' : 'deficit';
    const floorDiff = floor.present_count - floor.required_workers;

    return (
      <div className="floor-node" key={floor.id}>
        <div className="floor-header" onClick={() => toggleFloor(floor.id)}>
          <div className="node-info">
            {isFloorExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Floor {floor.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({floor.present_count}/{floor.required_workers} Active)
            </span>
          </div>
          <span className={`node-badge ${floorStatus}`} style={{ fontSize: '0.7rem' }}>
            {floorDiff >= 0 ? `+${floorDiff} Surplus` : `${floorDiff} Deficit`}
          </span>
        </div>

        {isFloorExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
            {floor.lines
              .filter(line => {
                if (!sessionUser) return true;
                if (sessionUser.proficiency === 'HR') return true;
                if (sessionUser.proficiency === 'Block Supervisor') return true;
                if (sessionUser.proficiency === 'Floor Supervisor') return true;
                return line.id === sessionUser.line_id;
              })
              .map(line => renderLineNode(line, floor, block))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hr-dashboard-container">
      <style>{`
        .hr-dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          color: var(--text-primary);
        }

        .dashboard-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-left h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-left p {
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .date-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 0.35rem 0.75rem;
        }

        .date-picker-wrapper label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 600;
        }

        .date-input {
          background: transparent;
          border: none;
          color: white;
          font-family: inherit;
          font-size: 0.9rem;
          outline: none;
          cursor: pointer;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .kpi-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.25rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent-primary, #6366f1);
        }

        .kpi-card.shortage::before { background: var(--status-danger, #ef4444); }
        .kpi-card.surplus::before { background: var(--status-success, #10b981); }
        .kpi-card.reassigned::before { background: #eab308; }

        .kpi-title {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .kpi-value {
          font-size: 2rem;
          font-weight: 700;
          margin: 0.35rem 0;
          font-family: monospace;
        }

        .kpi-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .dashboard-content-split {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .dashboard-content-split {
            grid-template-columns: 1fr;
          }
        }

        .panel-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Hierarchy styling */
        .hierarchy-tree {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .block-node {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
        }

        .node-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          transition: background 0.2s;
        }

        .node-header:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .node-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .node-name {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .node-badge {
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          font-weight: 500;
        }

        .node-badge.deficit {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .node-badge.surplus {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .node-badge.balanced {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
        }

        .node-content {
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .floor-node {
          border-left: 2px dashed rgba(255, 255, 255, 0.15);
          margin-left: 0.5rem;
          padding-left: 0.75rem;
        }

        .floor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .floor-header:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .line-node {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-left: 1rem;
        }

        .line-header {
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          cursor: pointer;
        }

        .line-header:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .line-title {
          font-weight: 500;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .capacity-bar-wrapper {
          flex-grow: 1;
          max-width: 180px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .capacity-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .capacity-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .capacity-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .line-workers-list {
          padding: 0.75rem 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .line-worker-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .line-worker-item:hover {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
        }

        /* Matrix Grid Filter Board */
        .filter-board-header {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .search-grid-inputs {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 0.5rem;
        }

        @media (max-width: 600px) {
          .search-grid-inputs {
            grid-template-columns: 1fr;
          }
        }

        .worker-matrix-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 0.75rem;
          max-height: 520px;
          overflow-y: auto;
          padding-right: 0.25rem;
        }

        .matrix-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 0.75rem;
          transition: all 0.2s;
        }

        .matrix-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.04);
          transform: translateY(-1px);
        }

        .matrix-card.reassigned-out {
          opacity: 0.65;
          border-style: dashed;
        }

        .matrix-worker-info h5 {
          margin: 0;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .matrix-worker-info p {
          margin: 0.15rem 0 0 0;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .matrix-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-top: 0.35rem;
        }

        .matrix-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 0.5rem;
        }

        .location-trail {
          font-size: 0.7rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
      `}</style>

      {/* Header Bar */}
      <div className="dashboard-header-bar">
        <div className="header-left">
          <h3>Line Staffing & Reassignments</h3>
          <p>Optimize plant floor capacity, reallocate workers, and resolve attendance deficits.</p>
        </div>

        <div className="header-actions">
          {(!sessionUser || sessionUser.proficiency === 'HR') && (
            <button className="btn btn-secondary" onClick={clearAllReassignments} title="Reset Allocations">
              <Undo2 size={16} /> Reset Day
            </button>
          )}
          <div className="date-picker-wrapper">
            <label htmlFor="dashboard-date">Date</label>
            <input 
              id="dashboard-date"
              type="date" 
              className="date-input" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
          <button className="btn btn-secondary btn-icon" onClick={loadData} title="Refresh Statistics">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      {loading && !dashboardData ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading live layout stats...</p>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Active Lines</div>
              <div className="kpi-value">{activeLinesCount}</div>
              <div className="kpi-desc">Across all blocks & floors</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Total Target Required</div>
              <div className="kpi-value">{totalRequired}</div>
              <div className="kpi-desc">Aggregated line requirements</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Present Today</div>
              <div className="kpi-value">{totalPresent}</div>
              <div className="kpi-desc">Attendance (Present or Coming)</div>
            </div>
            <div className="kpi-card shortage">
              <div className="kpi-title">Deficits (Shortage)</div>
              <div className="kpi-value" style={{ color: '#f87171' }}>{totalShortage}</div>
              <div className="kpi-desc">Workers needed to balance lines</div>
            </div>
            <div className="kpi-card surplus">
              <div className="kpi-title">Surplus Workers</div>
              <div className="kpi-value" style={{ color: '#34d399' }}>{totalSurplus}</div>
              <div className="kpi-desc">Available for reallocations</div>
            </div>
            <div className="kpi-card reassigned">
              <div className="kpi-title">Active Reassignments</div>
              <div className="kpi-value" style={{ color: '#fbbf24' }}>{totalReassigned}</div>
              <div className="kpi-desc">Manually shifted lines today</div>
            </div>
          </div>

          <div className="dashboard-content-split">
            {/* Column 1: Plant Layout Hierarchy */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div className="panel-title">
                <Layers size={18} />
                <span>Plant Floor Hierarchy Tree</span>
              </div>
              
              <div className="hierarchy-tree">
                {sessionUser && sessionUser.proficiency === 'Assembly Line Supervisor' ? (
                  dashboardData?.hierarchy?.flatMap(block => 
                    block.floors.flatMap(floor => 
                      floor.lines
                        .filter(line => line.id === sessionUser.line_id)
                        .map(line => renderLineNode(line, floor, block))
                    )
                  )
                ) : sessionUser && sessionUser.proficiency === 'Floor Supervisor' ? (
                  dashboardData?.hierarchy?.flatMap(block => {
                    const supLine = assemblyLines.find(al => al.id === sessionUser.line_id);
                    return block.floors
                      .filter(floor => supLine && floor.id === supLine.floor_id)
                      .map(floor => renderFloorNode(floor, block));
                  })
                ) : (
                  dashboardData?.hierarchy
                    ?.filter(block => {
                      if (!sessionUser) return true;
                      if (sessionUser.proficiency === 'HR') return true;
                      const supLine = assemblyLines.find(al => al.id === sessionUser.line_id);
                      return supLine && block.name === supLine.block_name;
                    })
                    ?.map(block => {
                      const isBlockExpanded = expandedBlocks[block.id];
                      const blockStatus = block.present_count >= block.required_workers ? 'surplus' : 'deficit';
                      const blockDiff = block.present_count - block.required_workers;
                      
                      return (
                        <div className="block-node" key={block.id}>
                          <div className="node-header" onClick={() => toggleBlock(block.id)}>
                            <div className="node-info">
                              {isBlockExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              <span className="node-name">{block.name}</span>
                              <span className="node-badge balanced">
                                {block.present_count} / {block.required_workers} Present
                              </span>
                            </div>
                            <span className={`node-badge ${blockStatus}`}>
                              {blockDiff >= 0 ? `+${blockDiff} Surplus` : `${blockDiff} Deficit`}
                            </span>
                          </div>

                          {isBlockExpanded && (
                            <div className="node-content">
                              {block.floors.map(floor => renderFloorNode(floor, block))}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Column 2: Skill Matrix & Present Workers Grid */}
            <div className="glass-panel" style={{ padding: '1.25rem', height: 'fit-content' }}>
              <div className="panel-title">
                <UserCheck size={18} />
                <span>Present Skill Matrix & Allocation Grid</span>
              </div>

              {/* Filtering matrix tools */}
              <div className="filter-board-header">
                <div className="search-grid-inputs">
                  <div className="search-input-wrapper">
                    <Search size={14} className="search-input-icon" />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Search active..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select 
                    className="form-select"
                    value={proficiencyFilter}
                    onChange={(e) => setProficiencyFilter(e.target.value)}
                  >
                    <option value="">All Skills</option>
                    <option value="Expert">Expert</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Beginner">Beginner</option>
                  </select>

                  <select 
                    className="form-select"
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                  >
                    <option value="">All Duties</option>
                    {uniqueSkills.map(sk => (
                      <option key={sk} value={sk}>{sk}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active Present Roster: {dashboardData?.present_workers?.length || 0}</span>
                  <span>Filtered: {filteredPresentWorkers.length}</span>
                </div>
              </div>

              {/* Worker Matrix Cards Grid */}
              <div className="worker-matrix-grid">
                {filteredPresentWorkers.length === 0 ? (
                  <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No present workers match the search/filters.
                  </p>
                ) : (
                  filteredPresentWorkers.map(w => {
                    const isShifted = w.allocated_line_id !== w.home_line_id;
                    const allocatedLine = assemblyLines.find(al => al.id === w.allocated_line_id);
                    
                    return (
                      <div className={`matrix-card ${w.is_reassigned_out ? 'reassigned-out' : ''}`} key={w.id}>
                        <div className="matrix-worker-info">
                          <h5>{w.name}</h5>
                          <p>{w.phone}</p>
                          
                          <div className="matrix-badges">
                            <span className={`badge ${
                              w.proficiency === 'Expert' ? 'info' : 
                              w.proficiency === 'Intermediate' ? 'primary' : 'warning'
                            }`} style={{ fontSize: '0.65rem' }}>
                              {w.proficiency}
                            </span>
                            {w.main_skill && (
                              <span className="badge balanced" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)' }}>
                                {w.main_skill}
                              </span>
                            )}
                            <span className="badge success" style={{ fontSize: '0.65rem' }}>
                              {w.attendance_status}
                            </span>
                          </div>
                        </div>

                        <div className="matrix-actions">
                          <div className="location-trail">
                            <MapPin size={10} />
                            <span>
                              Home: {w.home_line_name || 'N/A'} 
                              {isShifted && (
                                <strong style={{ color: '#fbbf24' }}>
                                   ➔ Shifted to {allocatedLine ? allocatedLine.name : 'Another Line'}
                                </strong>
                              )}
                            </span>
                          </div>

                          <button 
                            className={`btn ${isShifted ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => handleOpenReassign(w)}
                          >
                            <ArrowRightLeft size={10} />
                            <span>{isShifted ? 'Re-Route' : 'Reassign'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manual Reassignment workspace Dialog / Modal */}
      {showReassignModal && selectedWorker && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h4>Reassign Worker Allocation</h4>
              <button className="btn-icon" onClick={handleCloseReassign}>×</button>
            </div>

            <form onSubmit={submitReassignment}>
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong>Name:</strong> <span>{selectedWorker.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong>Proficiency / Skill:</strong> <span>{selectedWorker.proficiency} | {selectedWorker.main_skill || 'General'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Home Location:</strong> <span>{selectedWorker.home_block_name} ➔ {selectedWorker.home_floor_name} ➔ Line {selectedWorker.home_line_name}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Select Destination Assembly Line</label>
                <select 
                  className="form-select" 
                  value={targetLineId} 
                  required
                  onChange={(e) => setTargetLineId(e.target.value)}
                >
                  <option value="" disabled>-- Choose target line --</option>
                  <option value="reset">Return to Home Line (Line {selectedWorker.home_line_name})</option>
                  
                  {/* Categorized lines list */}
                  {assemblyLines
                    .filter(line => {
                      if (!sessionUser) return true;
                      if (sessionUser.proficiency === 'HR') return true;
                      const supLine = assemblyLines.find(al => al.id === sessionUser.line_id);
                      if (!supLine) return true;
                      if (sessionUser.proficiency === 'Assembly Line Supervisor') {
                        return line.id === sessionUser.line_id;
                      } else if (sessionUser.proficiency === 'Floor Supervisor') {
                        return line.floor_id === supLine.floor_id;
                      } else if (sessionUser.proficiency === 'Block Supervisor') {
                        return line.block_name === supLine.block_name;
                      }
                      return true;
                    })
                    .map(line => (
                      <option key={line.id} value={line.id}>
                        {line.block_name} ➔ {line.floor_name} ➔ Line {line.name} (Req: {line.required_workers})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Reassignment Rationale / Reason</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Deficit balancing, Skill support" 
                  value={reassignmentReason}
                  onChange={(e) => setReassignmentReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseReassign} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !targetLineId}>
                  {submitting ? 'Updating...' : 'Apply Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h4>Confirm Reset Day</h4>
              <button className="btn-icon" onClick={() => setShowResetConfirm(false)}>×</button>
            </div>
            <div style={{ margin: '1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <p>Are you sure you want to reset all manual reassignments for <strong>{date}</strong>?</p>
              <p style={{ marginTop: '0.5rem', color: '#ef4444' }}>
                This will return all reassigned workers on this date back to their home assembly lines. This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={confirmResetDay}>
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
