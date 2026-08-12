import React, { useState, useEffect } from 'react';
import { Phone, Users, CheckCircle, Clock, XCircle, AlertTriangle, AlertCircle, RefreshCw, Building2, MapPin, ChevronRight, ChevronDown, GitBranch } from 'lucide-react';

const HierarchyPieChart = ({ present = 0, required = 0, size = 44 }) => {
  const total = Math.max(required, 1);
  const ratio = Math.min(present / total, 1);
  const percentage = Math.round((present / total) * 100);

  // Color rules:
  // - Full overall count (100% or present >= required): GREEN (#10b981)
  // - Half or above (ratio >= 0.5 and < 1.0): YELLOW (#f59e0b)
  // - Below half (ratio < 0.5): RED (#ef4444)
  let fillColor = '#ef4444'; // Red (below half)
  let badgeLabel = 'Below Half';

  if (required > 0 && present >= required) {
    fillColor = '#10b981'; // Green (full)
    badgeLabel = 'Full Target';
  } else if (ratio >= 0.5) {
    fillColor = '#f59e0b'; // Yellow (half+)
    badgeLabel = 'Half+ Target';
  } else if (required === 0) {
    fillColor = '#10b981';
    badgeLabel = 'Full Target';
  }

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.min(ratio, 1) * circumference;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke="rgba(0, 0, 0, 0.08)"
            strokeWidth="5"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={fillColor}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
          />
        </svg>
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.62rem',
          fontWeight: '700',
          color: fillColor
        }}>
          {percentage}%
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: '800', color: fillColor }}>
            {present}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            / {required}
          </span>
        </div>
        <span style={{ 
          fontSize: '0.62rem', 
          fontWeight: '600', 
          color: fillColor,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          ● {badgeLabel}
        </span>
      </div>
    </div>
  );
};

const AssemblyLineTreeView = ({ hierarchy = [] }) => {
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});

  useEffect(() => {
    if (hierarchy && hierarchy.length > 0) {
      const initialBlocks = {};
      const initialFloors = {};
      hierarchy.forEach(block => {
        initialBlocks[block.id] = true;
        (block.floors || []).forEach(floor => {
          initialFloors[floor.id] = true;
        });
      });
      setExpandedBlocks(prev => Object.keys(prev).length === 0 ? initialBlocks : prev);
      setExpandedFloors(prev => Object.keys(prev).length === 0 ? initialFloors : prev);
    }
  }, [hierarchy]);

  const toggleBlock = (blockId) => {
    setExpandedBlocks(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const toggleFloor = (floorId) => {
    setExpandedFloors(prev => ({ ...prev, [floorId]: !prev[floorId] }));
  };

  const expandAll = () => {
    const allB = {};
    const allF = {};
    hierarchy.forEach(b => {
      allB[b.id] = true;
      (b.floors || []).forEach(f => {
        allF[f.id] = true;
      });
    });
    setExpandedBlocks(allB);
    setExpandedFloors(allF);
  };

  const collapseAll = () => {
    setExpandedBlocks({});
    setExpandedFloors({});
  };

  if (!hierarchy || hierarchy.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading assembly line tree hierarchy...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
          Block ➔ Floor ➔ Assembly Line Tree View
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={expandAll} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', height: 'auto' }}>
            Expand All
          </button>
          <button type="button" className="btn btn-secondary" onClick={collapseAll} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', height: 'auto' }}>
            Collapse All
          </button>
        </div>
      </div>

      <div className="tree-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {hierarchy.map(block => {
          const isBlockExpanded = !!expandedBlocks[block.id];
          let blockReq = 0;
          let blockPres = 0;
          (block.floors || []).forEach(f => {
            (f.lines || []).forEach(l => {
              blockReq += l.required_workers || 0;
              blockPres += l.present_count || 0;
            });
          });

          return (
            <div key={block.id} className="glass-panel" style={{
              borderRadius: '12px',
              border: '1px solid var(--panel-border)',
              overflow: 'hidden'
            }}>
              {/* Level 1: Block Node */}
              <div 
                onClick={() => toggleBlock(block.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9rem 1.2rem',
                  background: 'rgba(99, 102, 241, 0.06)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: isBlockExpanded ? '1px solid var(--panel-border)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {isBlockExpanded ? <ChevronDown size={18} color="var(--accent-color)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                  <Building2 size={20} color="var(--accent-color)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Block {block.name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(block.floors || []).length} Floors · {(block.floors || []).reduce((acc, f) => acc + (f.lines || []).length, 0)} Assembly Lines
                    </span>
                  </div>
                </div>

                <HierarchyPieChart present={blockPres} required={blockReq} size={44} />
              </div>

              {/* Level 2: Floors */}
              {isBlockExpanded && (
                <div style={{ padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(block.floors || []).map(floor => {
                    const isFloorExpanded = !!expandedFloors[floor.id];
                    let floorReq = 0;
                    let floorPres = 0;
                    (floor.lines || []).forEach(l => {
                      floorReq += l.required_workers || 0;
                      floorPres += l.present_count || 0;
                    });

                    return (
                      <div key={floor.id} style={{
                        borderLeft: '2px solid rgba(99, 102, 241, 0.25)',
                        paddingLeft: '0.85rem',
                        marginLeft: '0.5rem'
                      }}>
                        {/* Floor Header */}
                        <div 
                          onClick={() => toggleFloor(floor.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            background: 'rgba(0,0,0,0.02)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            marginBottom: isFloorExpanded ? '0.75rem' : '0'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {isFloorExpanded ? <ChevronDown size={16} color="var(--accent-color)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                            <MapPin size={16} color="#6366f1" />
                            <span style={{ fontWeight: '650', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              Floor {floor.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({(floor.lines || []).length} Assembly Lines)
                            </span>
                          </div>

                          <HierarchyPieChart present={floorPres} required={floorReq} size={38} />
                        </div>

                        {/* Level 3: Assembly Lines under Floor */}
                        {isFloorExpanded && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '0.85rem',
                            marginLeft: '0.5rem',
                            paddingLeft: '0.5rem',
                            borderLeft: '1px dashed rgba(0,0,0,0.1)'
                          }}>
                            {(floor.lines || []).map(line => {
                              const req = line.required_workers || 0;
                              const pres = line.present_count || 0;
                              const ratio = req > 0 ? pres / req : 1;
                              const isFull = pres >= req && req > 0;
                              const isHalf = ratio >= 0.5 && !isFull;

                              const borderTheme = isFull ? 'rgba(16, 185, 129, 0.3)' : isHalf ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)';

                              return (
                                <div key={line.id} style={{
                                  padding: '0.85rem 1rem',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: `1px solid ${borderTheme}`,
                                  borderRadius: '10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.6rem'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <GitBranch size={15} color="var(--accent-color)" />
                                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--accent-color)' }}>
                                        Line {line.name}
                                      </span>
                                    </div>
                                    <HierarchyPieChart present={pres} required={req} size={42} />
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Reassignment:</span>
                                    {line.reassigned_in_count > 0 || line.reassigned_out_count > 0 ? (
                                      <span className="badge info" style={{ fontSize: '0.68rem', textTransform: 'none' }}>
                                        +{line.reassigned_in_count} Shifted In / -{line.reassigned_out_count} Out
                                      </span>
                                    ) : (
                                      <span className="badge secondary" style={{ fontSize: '0.68rem', textTransform: 'none' }}>
                                        Home Roster Only
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Dashboard({ 
  recentLogs, 
  stats, 
  departments, 
  refreshData, 
  API_URL, 
  shortageByNumber = [], 
  mobileCallLogs = [],
  sessionUser,
  workers = [],
  assemblyLines = []
}) {
  const [hierarchyData, setHierarchyData] = useState(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  // Load real-time attendance hierarchy data
  useEffect(() => {
    setLoadingHierarchy(true);
    const todayDate = new Date().toISOString().split('T')[0];
    fetch(`${API_URL}/api/hr/dashboard?date=${todayDate}`)
      .then(res => res.json())
      .then(data => {
        setHierarchyData(data);
        setLoadingHierarchy(false);
      })
      .catch(err => {
        console.error("Error loading hierarchy for stats:", err);
        setLoadingHierarchy(false);
      });
  }, [API_URL]);

  let displayStats = { ...stats };
  let scopeLines = [];
  let scopeWorkers = [];
  let scopeTitle = "";

  if (sessionUser && sessionUser.proficiency !== 'HR') {
    let userBlockId = sessionUser.block_id;
    let userFloorId = sessionUser.floor_id;
    let userLineId = sessionUser.line_id;

    // Resolve from line_id if needed
    if (userLineId && (!userFloorId || !userBlockId)) {
      const line = assemblyLines.find(al => al.id === userLineId);
      if (line) {
        userFloorId = userFloorId || line.floor_id;
        userBlockId = userBlockId || line.block_id;
      }
    }
    // Resolve from floor_id if block_id is missing
    if (userFloorId && !userBlockId) {
      const lineOnFloor = assemblyLines.find(al => al.floor_id === userFloorId);
      if (lineOnFloor) {
        userBlockId = lineOnFloor.block_id;
      }
    }

    const isBlockLevel = sessionUser.proficiency === 'Block Supervisor' || sessionUser.proficiency === 'Block Manager';
    const isFloorLevel = sessionUser.proficiency === 'Floor Supervisor' || sessionUser.proficiency === 'Floor Manager';
    const isLineLevel = sessionUser.proficiency === 'Assembly Line Supervisor' || sessionUser.proficiency === 'Line Supervisor';

    if (isBlockLevel) {
      const blockName = assemblyLines.find(al => al.block_id === userBlockId)?.block_name || `Block ID ${userBlockId}`;
      scopeTitle = `Block Manager Dashboard: ${blockName}`;
      scopeLines = assemblyLines.filter(al => al.block_id === userBlockId);
      scopeWorkers = workers.filter(w => {
        const wl = assemblyLines.find(al => al.id === w.line_id);
        const wBlockId = w.block_id || (wl ? wl.block_id : null);
        return String(wBlockId) === String(userBlockId);
      });
    } else if (isFloorLevel) {
      const floorLine = assemblyLines.find(al => al.floor_id === userFloorId);
      const blockName = floorLine?.block_name || '';
      const floorName = floorLine?.floor_name || `Floor ID ${userFloorId}`;
      scopeTitle = `Floor Manager Dashboard: ${blockName ? blockName + ' ➔ ' : ''}${floorName}`;
      scopeLines = assemblyLines.filter(al => al.floor_id === userFloorId);
      scopeWorkers = workers.filter(w => {
        const wl = assemblyLines.find(al => al.id === w.line_id);
        const wFloorId = w.floor_id || (wl ? wl.floor_id : null);
        return String(wFloorId) === String(userFloorId);
      });
    } else if (isLineLevel) {
      const lineName = assemblyLines.find(al => al.id === userLineId)?.name || `Line ID ${userLineId}`;
      scopeTitle = `Line Supervisor Dashboard: Line ${lineName}`;
      scopeLines = assemblyLines.filter(al => al.id === userLineId);
      scopeWorkers = workers.filter(w => w.line_id === userLineId);
    }

    if (hierarchyData) {
      let total = scopeWorkers.length;
      let presentCount = 0;
      let comingCount = 0;
      let absentCount = 0;

      scopeWorkers.forEach(w => {
        const activeWorker = hierarchyData.present_workers.find(pw => pw.id === w.id);
        if (activeWorker) {
          if (activeWorker.attendance_status === 'Coming') comingCount++;
          else if (activeWorker.attendance_status === 'Present') presentCount++;
        } else {
          absentCount++;
        }
      });

      displayStats = {
        total_workers: total,
        coming: comingCount + presentCount,
        present: presentCount,
        absent: absentCount,
        unconfirmed: Math.max(0, total - (comingCount + presentCount + absentCount))
      };
    }
  }

  // Filter logs for the Activity Feed based on supervisor scope
  const filteredLogs = recentLogs.filter(log => {
    if (!sessionUser || sessionUser.proficiency === 'HR') return true;
    return scopeWorkers.some(w => w.id === log.worker_id || w.phone === log.worker_phone);
  });

  // Render Floors list for Block Supervisor
  const renderBlockLevelDashboard = () => {
    if (!hierarchyData) return null;

    const floorsInBlock = Array.from(new Set(scopeLines.map(l => l.floor_id)))
      .map(fid => {
        const floorLines = scopeLines.filter(l => l.floor_id === fid);
        const floorName = floorLines[0]?.floor_name || `Floor ID ${fid}`;
        let required = 0;
        let present = 0;

        floorLines.forEach(fl => {
          let lineStat = null;
          hierarchyData.hierarchy.forEach(b => {
            b.floors.forEach(f => {
              const found = f.lines.find(l => l.id === fl.id);
              if (found) lineStat = found;
            });
          });
          if (lineStat) {
            required += lineStat.required_workers || 0;
            present += lineStat.present_count || 0;
          }
        });

        return { id: fid, name: floorName, required, present };
      });

    return (
      <div className="dept-grid">
        {floorsInBlock.map(fl => {
          const ratio = fl.required > 0 ? (fl.present / fl.required) * 100 : 0;
          const cappedRatio = Math.min(100, ratio);
          const hasShortage = fl.present < fl.required;

          return (
            <div key={fl.id} className={`glass-panel dept-card ${hasShortage ? 'warning-shortage' : ''}`}>
              {hasShortage && (
                <div className="shortage-banner">
                  <AlertTriangle size={12} />
                  Shortage: -{fl.required - fl.present}
                </div>
              )}
              
              <h4 className="dept-title">Floor {fl.name}</h4>
              
              <div className="dept-progress-bar">
                <div 
                  className={`dept-progress-fill ${hasShortage ? 'warning' : 'success'}`} 
                  style={{ width: `${cappedRatio}%` }}
                />
              </div>

              <div className="dept-details-row">
                <span>Available Present</span>
                <span className="highlight">{fl.present} workers</span>
              </div>

              <div className="dept-details-row">
                <span>Required Capacity</span>
                <span className="highlight">{fl.required}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Assembly Lines list for Floor Supervisor
  const renderFloorLevelDashboard = () => {
    if (!hierarchyData) return null;

    return (
      <div className="dept-grid">
        {scopeLines.map(fl => {
          let lineStat = null;
          hierarchyData.hierarchy.forEach(b => {
            b.floors.forEach(f => {
              const found = f.lines.find(l => l.id === fl.id);
              if (found) lineStat = found;
            });
          });

          const required = lineStat ? lineStat.required_workers : 0;
          const present = lineStat ? lineStat.present_count : 0;
          const ratio = required > 0 ? (present / required) * 100 : 0;
          const cappedRatio = Math.min(100, ratio);
          const hasShortage = present < required;

          return (
            <div key={fl.id} className={`glass-panel dept-card ${hasShortage ? 'warning-shortage' : ''}`}>
              {hasShortage && (
                <div className="shortage-banner">
                  <AlertTriangle size={12} />
                  Shortage: -{required - present}
                </div>
              )}
              
              <h4 className="dept-title">Line {fl.name}</h4>
              
              <div className="dept-progress-bar">
                <div 
                  className={`dept-progress-fill ${hasShortage ? 'warning' : 'success'}`} 
                  style={{ width: `${cappedRatio}%` }}
                />
              </div>

              <div className="dept-details-row">
                <span>Available Present</span>
                <span className="highlight">{present} workers</span>
              </div>

              <div className="dept-details-row">
                <span>Required Capacity</span>
                <span className="highlight">{required}</span>
              </div>

              {lineStat && (
                <div className="dept-details-row" style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <span>Staffing Status</span>
                  <span className="badge info">{lineStat.reassigned_in_count} Shifted In / {lineStat.reassigned_out_count} Out</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render Workers list for Assembly Line Supervisor
  const renderLineLevelDashboard = () => {
    if (!hierarchyData) return null;

    const supLine = assemblyLines.find(al => al.id === sessionUser.line_id);
    if (!supLine) return null;

    const lineWorkers = scopeWorkers.map(w => {
      const activeWorker = hierarchyData.present_workers.find(pw => pw.id === w.id);
      return {
        ...w,
        attendance_status: activeWorker ? activeWorker.attendance_status : 'Absent',
        reassigned: activeWorker ? activeWorker.reassigned : false,
        is_reassigned_out: activeWorker ? activeWorker.is_reassigned_out : false,
        reassignment_reason: activeWorker ? activeWorker.reassignment_reason : null,
      };
    });

    const reassignedInWorkers = hierarchyData.present_workers.filter(pw => 
      pw.allocated_line_id === supLine.id && pw.home_line_id !== supLine.id
    );

    return (
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Line Roster & Allocation Status</h4>
          <span className="badge primary">Line Target: {supLine.required_workers} Workers</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned Home Workers</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lineWorkers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No home workers registered to this line.</p>
              ) : (
                lineWorkers.map(w => (
                  <div key={w.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px', fontSize: '0.85rem'
                  }}>
                    <div>
                      <span style={{ fontWeight: '600' }}>{w.name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{w.phone}</span>
                      <span className="badge info" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>{w.proficiency}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {w.is_reassigned_out ? (
                        <span className="badge warning" style={{ fontSize: '0.75rem', textTransform: 'none' }}>
                          Shifted Out ({w.reassignment_reason || 'Support'})
                        </span>
                      ) : (
                        <span className={`badge ${
                          w.attendance_status === 'Coming' || w.attendance_status === 'Present' ? 'success' : 'danger'
                        }`} style={{ fontSize: '0.75rem', textTransform: 'none' }}>
                          {w.attendance_status === 'Coming' || w.attendance_status === 'Present' ? 'Present / Coming' : 'Absent'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {reassignedInWorkers.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <h5 style={{ fontSize: '0.85rem', color: '#10b981', marginBottom: '0.5rem' }}>Shifted In (Active Support)</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {reassignedInWorkers.map(w => (
                  <div key={w.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)',
                    borderRadius: '8px', fontSize: '0.85rem'
                  }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>{w.name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{w.phone}</span>
                      <span className="badge info" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>{w.proficiency}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        (Home: Line {w.home_line_name})
                      </span>
                    </div>
                    
                    <div>
                      <span className="badge success" style={{ fontSize: '0.75rem', textTransform: 'none' }}>
                        Support Active ({w.reassignment_reason || 'Deficit coverage'})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const allAssemblyLineSummaries = React.useMemo(() => {
    if (!hierarchyData || !hierarchyData.hierarchy) {
      return { lines: [], overall: { totalLines: 0, totalRoster: 0, totalPresent: 0, totalAbsent: 0, rate: 0 } };
    }
    const lines = [];
    hierarchyData.hierarchy.forEach(block => {
      (block.floors || []).forEach(floor => {
        (floor.lines || []).forEach(line => {
          const totalRoster = line.workers ? line.workers.length : 0;
          const presentCount = line.present_count || 0;
          const absentCount = line.absent_count !== undefined ? line.absent_count : Math.max(0, totalRoster - presentCount);
          const rate = totalRoster > 0 ? Math.round((presentCount / totalRoster) * 100) : 0;

          lines.push({
            id: line.id,
            name: line.name,
            blockName: block.name,
            floorName: floor.name,
            totalRoster,
            presentCount,
            absentCount,
            rate
          });
        });
      });
    });

    const totalLines = lines.length;
    const totalRoster = lines.reduce((sum, l) => sum + l.totalRoster, 0);
    const totalPresent = lines.reduce((sum, l) => sum + l.presentCount, 0);
    const totalAbsent = lines.reduce((sum, l) => sum + l.absentCount, 0);
    const rate = totalRoster > 0 ? Math.round((totalPresent / totalRoster) * 100) : 0;

    return {
      lines,
      overall: { totalLines, totalRoster, totalPresent, totalAbsent, rate }
    };
  }, [hierarchyData]);

  if (sessionUser && sessionUser.proficiency !== 'HR' && loadingHierarchy && !hierarchyData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="spin" size={24} style={{ display: 'inline-block' }} />
        <p style={{ marginTop: '1rem' }}>Loading supervisor dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Scope Banner if restricted view is active */}
      {sessionUser && sessionUser.proficiency !== 'HR' && (
        <div className="glass-panel" style={{
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{scopeTitle}</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Monitoring attendance metrics, shift targets, and reassignments for your physical station.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge success" style={{ textTransform: 'none' }}>
              Supervisor: {sessionUser.name}
            </span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{displayStats.total_workers}</span>
            <span className="stat-label">Total Roster Scope</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{displayStats.coming}</span>
            <span className="stat-label">Present & Coming</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon warning">
            <AlertCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{displayStats.unconfirmed}</span>
            <span className="stat-label">Pending Confirmation</span>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon danger">
            <XCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{displayStats.absent}</span>
            <span className="stat-label">Marked Absent</span>
          </div>
        </div>
      </div>

      {/* Assembly Lines Overall Summary & Line Breakdown Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--accent-color)" />
              Assembly Lines Overall Summary
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Overall manpower statistics and individual line attendance breakdown
            </p>
          </div>
          <span className="badge primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            {allAssemblyLineSummaries.overall.totalLines} Assembly Lines
          </span>
        </div>

        {/* Overall Key Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Overall Total Employees</span>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>{allAssemblyLineSummaries.overall.totalRoster}</span>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'block' }}>Overall Present</span>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#10b981' }}>{allAssemblyLineSummaries.overall.totalPresent}</span>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'block' }}>Overall Absent</span>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#ef4444' }}>{allAssemblyLineSummaries.overall.totalAbsent}</span>
          </div>
          <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', display: 'block' }}>Overall Attendance Rate</span>
            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-color)' }}>{allAssemblyLineSummaries.overall.rate}%</span>
          </div>
        </div>

        {/* Assembly Line Summary Table */}
        {allAssemblyLineSummaries.lines.length > 0 && (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
            <table className="custom-table" style={{ margin: 0, fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Assembly Line</th>
                  <th>Location (Block / Floor)</th>
                  <th style={{ textAlign: 'center' }}>Total Registered Employees</th>
                  <th style={{ textAlign: 'center' }}>Present</th>
                  <th style={{ textAlign: 'center' }}>Absent</th>
                  <th style={{ textAlign: 'right' }}>Attendance Rate %</th>
                </tr>
              </thead>
              <tbody>
                {allAssemblyLineSummaries.lines.map(line => (
                  <tr key={line.id}>
                    <td style={{ fontWeight: '600', color: 'var(--accent-color)' }}>Line {line.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{line.blockName} · Floor {line.floorName}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{line.totalRoster}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#10b981' }}>{line.presentCount}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: line.absentCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>{line.absentCount}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${line.rate >= 90 ? 'success' : line.rate >= 75 ? 'warning' : 'danger'}`}>
                        {line.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="dashboard-layout full-width">
        {/* Dynamic Hierarchy metrics / Physical Station Status */}
        <div>
          <div className="section-header">
            <h3>Assembly Line Hierarchy & Availability</h3>
            <button className="btn btn-secondary" onClick={refreshData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {!sessionUser || sessionUser.proficiency === 'HR' ? (
            <AssemblyLineTreeView hierarchy={hierarchyData?.hierarchy || []} />
          ) : (sessionUser.proficiency === 'Block Supervisor' || sessionUser.proficiency === 'Block Manager') ? (
            renderBlockLevelDashboard()
          ) : (sessionUser.proficiency === 'Floor Supervisor' || sessionUser.proficiency === 'Floor Manager') ? (
            renderFloorLevelDashboard()
          ) : (sessionUser.proficiency === 'Assembly Line Supervisor' || sessionUser.proficiency === 'Line Supervisor') ? (
            renderLineLevelDashboard()
          ) : null}
        </div>
      </div>
    </div>
  );
}
