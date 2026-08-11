import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  Grid,
  Download,
  Edit2,
  Check
} from 'lucide-react';

export default function IEDashboard({ API_URL, currentUser }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Track which group keys are currently in edit mode
  const [editingGroups, setEditingGroups] = useState([]);

  // Add Skill Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalBlockId, setModalBlockId] = useState(0);
  const [modalFloorId, setModalFloorId] = useState(0);
  const [modalLineId, setModalLineId] = useState(0);
  const [modalProductName, setModalProductName] = useState('');
  const [modalProductionTarget, setModalProductionTarget] = useState(0);
  const [modalFromDate, setModalFromDate] = useState(todayStr);
  const [modalToDate, setModalToDate] = useState(todayStr);

  const isIEUser = currentUser?.role === 'IE';

  const sortReportData = (data) => {
    return [...data].sort((a, b) => {
      const blockCompare = (a.block_name || '').localeCompare(b.block_name || '');
      if (blockCompare !== 0) return blockCompare;
      
      const floorCompare = (a.floor_name || '').localeCompare(b.floor_name || '');
      if (floorCompare !== 0) return floorCompare;

      const lineCompare = (a.line_name || '').localeCompare(b.line_name || '');
      if (lineCompare !== 0) return lineCompare;

      const prodCompare = (a.product_name || '').localeCompare(b.product_name || '');
      if (prodCompare !== 0) return prodCompare;

      return (a.designation || '').localeCompare(b.designation || '');
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/ie/headcount?from_date=${fromDate}&to_date=${toDate}`);
      if (!res.ok) {
        throw new Error('Failed to fetch headcount report');
      }
      const data = await res.json();
      setReportData(sortReportData(data.report || []));
      setEditingGroups([]); // reset editing groups on fresh load
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_URL}/api/skills`);
      if (res.ok) {
        const data = await res.json();
        setAllSkills(data || []);
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const res = await fetch(`${API_URL}/api/hierarchy`);
      if (res.ok) {
        const data = await res.json();
        setHierarchyData(data || []);
      }
    } catch (err) {
      console.error('Error fetching hierarchy:', err);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate, API_URL]);

  useEffect(() => {
    fetchSkills();
    fetchHierarchy();
  }, [API_URL]);

  const handleRowChange = (index, field, value) => {
    setReportData(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  const handleGroupFieldChange = (startRow, field, value) => {
    const oldGroupKey = `${startRow.block_id}_${startRow.floor_id}_${startRow.line_id}_${startRow.product_name}_${startRow.from_date}_${startRow.to_date}`;
    
    let updatedRow = { ...startRow, [field]: value };
    const newGroupKey = `${updatedRow.block_id}_${updatedRow.floor_id}_${updatedRow.line_id}_${updatedRow.product_name}_${updatedRow.from_date}_${updatedRow.to_date}`;

    setReportData(prev => {
      return prev.map(row => {
        if (row.block_id === startRow.block_id &&
            row.floor_id === startRow.floor_id &&
            row.line_id === startRow.line_id &&
            row.product_name === startRow.product_name &&
            row.from_date === startRow.from_date &&
            row.to_date === startRow.to_date) {
          return {
            ...row,
            [field]: value
          };
        }
        return row;
      });
    });

    if (oldGroupKey !== newGroupKey) {
      setEditingGroups(prev => prev.map(key => key === oldGroupKey ? newGroupKey : key));
    }
  };

  const handleGroupMultiFieldChange = (startRow, updates) => {
    const oldGroupKey = `${startRow.block_id}_${startRow.floor_id}_${startRow.line_id}_${startRow.product_name}_${startRow.from_date}_${startRow.to_date}`;
    
    let updatedRow = { ...startRow, ...updates };
    const newGroupKey = `${updatedRow.block_id}_${updatedRow.floor_id}_${updatedRow.line_id}_${updatedRow.product_name}_${updatedRow.from_date}_${updatedRow.to_date}`;

    setReportData(prev => {
      return prev.map(row => {
        if (row.block_id === startRow.block_id &&
            row.floor_id === startRow.floor_id &&
            row.line_id === startRow.line_id &&
            row.product_name === startRow.product_name &&
            row.from_date === startRow.from_date &&
            row.to_date === startRow.to_date) {
          return {
            ...row,
            ...updates
          };
        }
        return row;
      });
    });

    if (oldGroupKey !== newGroupKey) {
      setEditingGroups(prev => prev.map(key => key === oldGroupKey ? newGroupKey : key));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      // Filter out designations with 0 manpower target so we only save active requirements
      const requirements = reportData
        .filter(row => row.ie_manpower > 0)
        .map(row => ({
          designation: row.designation,
          block_id: row.block_id,
          floor_id: row.floor_id,
          line_id: row.line_id,
          product_name: row.product_name || 'General',
          production_target: parseInt(row.production_target) || 0,
          ie_manpower: parseInt(row.ie_manpower) || 0,
          from_date: row.from_date,
          to_date: row.to_date
        }));

      const res = await fetch(`${API_URL}/api/ie/headcount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requirements,
          from_date: fromDate,
          to_date: toDate
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save IE manpower requirements');
      }

      setSaveSuccess(true);
      setEditingGroups([]);
      fetchReport();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditingGroup = (startRow) => {
    // Compile list of all designations from Skill Master
    const skillList = [];
    allSkills.forEach(skill => {
      let subs = [];
      if (skill.sub_skills) {
        try {
          subs = typeof skill.sub_skills === 'string' ? JSON.parse(skill.sub_skills) : skill.sub_skills;
        } catch (e) {
          subs = [];
        }
      }
      if (Array.isArray(subs) && subs.length > 0) {
        subs.forEach(sub => {
          skillList.push(`${skill.main_skill} - ${sub}`);
        });
      } else {
        skillList.push(skill.main_skill);
      }
    });

    const groupKey = `${startRow.block_id}_${startRow.floor_id}_${startRow.line_id}_${startRow.product_name}_${startRow.from_date}_${startRow.to_date}`;

    setReportData(prev => {
      const currentGroupRows = prev.filter(row => 
        row.block_id === startRow.block_id &&
        row.floor_id === startRow.floor_id &&
        row.line_id === startRow.line_id &&
        row.product_name === startRow.product_name &&
        row.from_date === startRow.from_date &&
        row.to_date === startRow.to_date
      );

      const missingRows = [];
      skillList.forEach(dsg => {
        const exists = currentGroupRows.some(row => row.designation.toUpperCase() === dsg.toUpperCase());
        if (!exists) {
          missingRows.push({
            designation: dsg,
            block_id: startRow.block_id,
            floor_id: startRow.floor_id,
            line_id: startRow.line_id,
            block_name: startRow.block_name,
            floor_name: startRow.floor_name,
            line_name: startRow.line_name,
            product_name: startRow.product_name,
            production_target: startRow.production_target,
            from_date: startRow.from_date,
            to_date: startRow.to_date,
            ie_manpower: 0,
            present_count: 0
          });
        }
      });

      return sortReportData([...prev, ...missingRows]);
    });

    setEditingGroups(prev => [...prev, groupKey]);
  };

  const stopEditingGroup = (startRow) => {
    const groupKey = `${startRow.block_id}_${startRow.floor_id}_${startRow.line_id}_${startRow.product_name}_${startRow.from_date}_${startRow.to_date}`;
    setEditingGroups(prev => prev.filter(key => key !== groupKey));
  };

  // Compile floors and lines
  const getRowFloors = (blockId) => {
    if (!blockId) return [];
    const block = hierarchyData.find(b => b.id === blockId);
    return block ? (block.floors || []) : [];
  };

  const getRowLines = (blockId, floorId) => {
    if (!floorId) return [];
    const floors = getRowFloors(blockId);
    const floor = floors.find(f => f.id === floorId);
    return floor ? (floor.lines || []) : [];
  };

  // Compile floors and lines for modal selections
  const getModalFloors = () => {
    if (!modalBlockId) return [];
    const block = hierarchyData.find(b => b.id === modalBlockId);
    return block ? (block.floors || []) : [];
  };

  const getModalLines = () => {
    if (!modalFloorId) return [];
    const floors = getModalFloors();
    const floor = floors.find(f => f.id === modalFloorId);
    return floor ? (floor.lines || []) : [];
  };

  const handleAddSkillRow = () => {
    const blockName = modalBlockId > 0 ? hierarchyData.find(b => b.id === modalBlockId)?.name || 'Block' : 'All Blocks';
    const floorName = modalFloorId > 0 ? getModalFloors().find(f => f.id === modalFloorId)?.name || 'Floor' : 'All Floors';
    const lineName = modalLineId > 0 ? getModalLines().find(l => l.id === modalLineId)?.name || 'Line' : 'All Lines';

    // Compile list of all designations from Skill Master
    const list = [];
    allSkills.forEach(skill => {
      let subs = [];
      if (skill.sub_skills) {
        try {
          subs = typeof skill.sub_skills === 'string' ? JSON.parse(skill.sub_skills) : skill.sub_skills;
        } catch (e) {
          subs = [];
        }
      }
      if (Array.isArray(subs) && subs.length > 0) {
        subs.forEach(sub => {
          list.push(`${skill.main_skill} - ${sub}`);
        });
      } else {
        list.push(skill.main_skill);
      }
    });

    const newRows = list.map(dsg => ({
      designation: dsg,
      block_id: modalBlockId,
      floor_id: modalFloorId,
      line_id: modalLineId,
      block_name: blockName,
      floor_name: floorName,
      line_name: lineName,
      product_name: modalProductName || 'General',
      production_target: modalProductionTarget || 0,
      from_date: modalFromDate,
      to_date: modalToDate,
      ie_manpower: 0,
      present_count: 0
    }));

    setReportData(prev => sortReportData([...prev, ...newRows]));
    
    // Automatically set the newly created group to edit mode
    const groupKey = `${modalBlockId}_${modalFloorId}_${modalLineId}_${modalProductName || 'General'}_${modalFromDate}_${modalToDate}`;
    setEditingGroups(prev => [...prev, groupKey]);

    setModalProductName('');
    setModalProductionTarget(0);
    setShowAddModal(false);
  };

  const handleRemoveGroup = (startRow) => {
    setReportData(prev => prev.filter(row => 
      !(row.block_id === startRow.block_id &&
        row.floor_id === startRow.floor_id &&
        row.line_id === startRow.line_id &&
        row.product_name === startRow.product_name &&
        row.from_date === startRow.from_date &&
        row.to_date === startRow.to_date)
    ));
    const groupKey = `${startRow.block_id}_${startRow.floor_id}_${startRow.line_id}_${startRow.product_name}_${startRow.from_date}_${startRow.to_date}`;
    setEditingGroups(prev => prev.filter(key => key !== groupKey));
  };

  // Filter reportData to get the visible rows (show if manpower > 0 OR group is currently being edited)
  const visibleRows = reportData.filter(row => {
    const groupKey = `${row.block_id}_${row.floor_id}_${row.line_id}_${row.product_name}_${row.from_date}_${row.to_date}`;
    const isEditing = editingGroups.includes(groupKey);
    return isEditing || row.ie_manpower > 0;
  });

  // Calculations for TOTAL row
  let totalIEManpower = 0;
  let totalProductionTarget = 0;
  let totalPresent = 0;
  let totalGap = 0;

  visibleRows.forEach(row => {
    totalIEManpower += row.ie_manpower;
    totalPresent += row.present_count;
  });

  // Calculate production targets for unique groups only
  const processedGroupsSet = new Set();
  visibleRows.forEach(row => {
    const groupKey = `${row.block_id}_${row.floor_id}_${row.line_id}_${row.product_name}_${row.from_date}_${row.to_date}`;
    if (!processedGroupsSet.has(groupKey)) {
      processedGroupsSet.add(groupKey);
      totalProductionTarget += row.production_target;
    }
  });

  totalGap = totalPresent - totalIEManpower;
  const totalGapPct = totalIEManpower > 0 ? Math.round((totalGap / totalIEManpower) * 100) : 0;

  // Group the visibleRows by block_id, floor_id, line_id, product_name, from_date, to_date
  const groupedLineScopes = [];
  visibleRows.forEach(row => {
    const groupKey = `${row.block_id}_${row.floor_id}_${row.line_id}_${row.product_name}_${row.from_date}_${row.to_date}`;
    let group = groupedLineScopes.find(g => g.key === groupKey);
    if (!group) {
      group = {
        key: groupKey,
        block_id: row.block_id,
        block_name: row.block_name,
        floor_id: row.floor_id,
        floor_name: row.floor_name,
        line_id: row.line_id,
        line_name: row.line_name,
        product_name: row.product_name,
        production_target: row.production_target,
        from_date: row.from_date,
        to_date: row.to_date,
        skills: []
      };
      groupedLineScopes.push(group);
    }
    group.skills.push({
      ...row,
      originalIndex: reportData.indexOf(row)
    });
  });

  const handleDownload = () => {
    // Generate CSV content
    let csvContent = "";
    if (isIEUser) {
      csvContent += "S.No,Block,Floor,Assembly Line,Product/Item Name,Production Target,Skill Group (Designation),Manpower\n";
      visibleRows.forEach((row, index) => {
        csvContent += `"${index + 1}","${row.block_name}","${row.floor_name}","${row.line_name}","${(row.product_name || '').replace(/"/g, '""')}","${row.production_target}","${row.designation.replace(/"/g, '""')}","${row.ie_manpower}"\n`;
      });
      csvContent += `"","","","","TOTAL","${totalProductionTarget}","","${totalIEManpower}"\n`;
    } else {
      csvContent += "S.No,Block,Floor,Assembly Line,Product/Item Name,Production Target,Skill Group (Designation),Manpower,Present,Gap,IE Gap %\n";
      visibleRows.forEach((row, index) => {
        const gap = row.present_count - row.ie_manpower;
        const gapPct = row.ie_manpower > 0 ? Math.round((gap / row.ie_manpower) * 100) : 0;
        csvContent += `"${index + 1}","${row.block_name}","${row.floor_name}","${row.line_name}","${(row.product_name || '').replace(/"/g, '""')}","${row.production_target}","${row.designation.replace(/"/g, '""')}","${row.ie_manpower}","${row.present_count}","${gap}","${gapPct}%"\n`;
      });
      csvContent += `"","","","","TOTAL","${totalProductionTarget}","","${totalIEManpower}","${totalPresent}","${totalGap}","${totalGapPct}%"\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `IE_Manpower_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="ie-dashboard-container">
      <style>{`
        .ie-dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          color: #1e293b;
        }

        .dashboard-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          background: #ffffff;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .header-left h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: #0f172a;
        }

        .header-left p {
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
          color: #64748b;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .date-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.4rem 0.85rem;
        }

        .date-picker-wrapper label {
          font-size: 0.7rem;
          color: #475569;
          text-transform: uppercase;
          font-weight: 700;
        }

        .date-input {
          background: transparent;
          border: none;
          color: #0f172a;
          font-family: inherit;
          font-size: 0.9rem;
          outline: none;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-header-action {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a !important;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 38px;
          height: 38px;
          outline: none;
        }

        .btn-header-action:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        
        .btn-header-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .report-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          max-width: 100%;
          overflow: hidden;
        }

        .report-card-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #0f172a;
          border-bottom: 1px solid #edf2f7;
          padding-bottom: 0.75rem;
        }

        .excel-table-container {
          max-height: 550px;
          overflow-y: auto;
          overflow-x: auto;
          width: 100%;
          max-width: 100%;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
        }

        .excel-table-container::-webkit-scrollbar {
          height: 10px;
          width: 8px;
        }

        .excel-table-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .excel-table-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .excel-table-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .ie-table {
          width: 100%;
          min-width: 1300px;
          border-collapse: collapse;
          text-align: left;
          color: #334155;
        }

        .ie-table th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #f1f5f9;
          color: #475569;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.75rem 1rem;
          border: 1px solid #cbd5e1;
        }

        .ie-table td {
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          vertical-align: middle;
        }

        .ie-table tr:hover td {
          background: #f8fafc;
        }

        .excel-input {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.95rem;
          font-weight: 600;
          text-align: right;
          outline: none;
          transition: all 0.15s ease;
        }

        .excel-input:focus {
          background: #ffffff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
        }

        .negative-gap {
          background-color: #fee2e2 !important;
          color: #991b1b !important;
          font-weight: bold;
        }

        .positive-gap {
          color: #166534 !important;
          font-weight: 600;
        }

        .total-row td {
          background: #f1f5f9 !important;
          font-weight: 700;
          border-top: 2px solid #94a3b8;
          color: #0f172a;
        }

        .alert-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .alert-bar.success {
          background: #d1fae5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }

        .alert-bar.error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        /* Modal Dialog */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          width: 90%;
          max-width: 480px;
          color: #0f172a;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .modal-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0f172a;
        }

        .modal-field-group {
          margin-bottom: 1rem;
        }

        .modal-field-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          margin-bottom: 0.35rem;
        }

        .modal-select, .modal-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 0.5rem;
          border-radius: 6px;
          outline: none;
          font-weight: 500;
        }

        .modal-input {
          font-family: inherit;
        }

        .modal-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .btn-delete-row {
          color: #ef4444;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 4px;
          transition: background-color 0.15s ease;
        }

        .btn-delete-row:hover {
          background: #fee2e2;
        }

        .skills-subtable-container {
          max-height: 220px;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .skills-subtable-container::-webkit-scrollbar {
          width: 5px;
        }

        .skills-subtable-container::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .skills-subtable-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .skills-subtable-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .skills-subtable-container tr:hover td {
          background: #f1f5f9 !important;
        }
      `}</style>

      {/* Header Bar */}
      <div className="dashboard-header-bar">
        <div className="header-left">
          <h3>IE Manpower Excel Sheet</h3>
          <p>
            {isIEUser 
              ? 'Define factory targets per skill group for the selected planning period.' 
              : 'Review planned targets, actual attendance present counts, and calculated gaps.'}
          </p>
        </div>

        <div className="header-actions">
          {isIEUser && (
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setModalBlockId(0);
                setModalFloorId(0);
                setModalLineId(0);
                setModalProductName('');
                setModalProductionTarget(0);
                setModalFromDate(fromDate);
                setModalToDate(toDate);
                setShowAddModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '38px', padding: '0 0.85rem' }}
            >
              <Plus size={16} />
              <span>Add Line Scope</span>
            </button>
          )}
          <div className="date-picker-wrapper">
            <label htmlFor="ie-from-date">From</label>
            <input 
              id="ie-from-date"
              type="date" 
              className="date-input" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)} 
            />
          </div>
          <div className="date-picker-wrapper">
            <label htmlFor="ie-to-date">To</label>
            <input 
              id="ie-to-date"
              type="date" 
              className="date-input" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)} 
            />
          </div>
          
          <button 
            className="btn-header-action" 
            onClick={handleDownload} 
            title="Download CSV" 
            disabled={visibleRows.length === 0}
          >
            <Download size={16} color="#0f172a" />
          </button>

          <button 
            className="btn-header-action" 
            onClick={fetchReport} 
            title="Refresh sheet"
          >
            <RefreshCw size={16} color="#0f172a" className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="alert-bar success">
          <CheckCircle size={18} />
          <span>Targets updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="alert-bar error">
          <AlertCircle size={18} />
          <span>Error: {error}</span>
        </div>
      )}

      <div className="report-card">
        <div className="report-card-title">
          <span>Target Settings Profile : ({fromDate} to {toDate})</span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Role: {currentUser?.role}
          </span>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading sheet content...</p>
        ) : (
          <div>
            <div className="excel-table-container">
              <table className="ie-table">
                <thead>
                  <tr>
                    <th style={{ width: '3%', textAlign: 'center' }}>S.No</th>
                    <th style={{ width: isIEUser ? '8%' : '7%' }}>Block</th>
                    <th style={{ width: isIEUser ? '8%' : '7%' }}>Floor</th>
                    <th style={{ width: isIEUser ? '8%' : '7%' }}>Assembly Line</th>
                    <th style={{ width: isIEUser ? '12%' : '10%' }}>Product / Item Name</th>
                    <th style={{ width: isIEUser ? '8%' : '7%', textAlign: 'right' }}>Production Target</th>
                    <th style={{ width: isIEUser ? '10%' : '9%', textAlign: 'center' }}>From Date</th>
                    <th style={{ width: isIEUser ? '10%' : '9%', textAlign: 'center' }}>To Date</th>
                    <th style={{ width: isIEUser ? '15%' : '13%' }}>Skill Group (Designation)</th>
                    <th style={{ width: isIEUser ? '8%' : '7%', textAlign: 'right' }}>Manpower</th>
                    {!isIEUser && (
                      <>
                        <th style={{ width: '6%', textAlign: 'right' }}>Present</th>
                        <th style={{ width: '6%', textAlign: 'right' }}>Gap</th>
                        <th style={{ width: '6%', textAlign: 'right' }}>IE Gap %</th>
                      </>
                    )}
                    {isIEUser && <th style={{ width: '10%', textAlign: 'center' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {groupedLineScopes.length === 0 ? (
                    <tr>
                      <td colSpan={isIEUser ? 11 : 13} style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                        No records loaded. Use the "Add Line Scope" button to plan target settings for a line.
                      </td>
                    </tr>
                  ) : (
                    groupedLineScopes.map((group, idx) => {
                      const isEditing = editingGroups.includes(group.key);
                      const startRow = group.skills[0];

                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', fontWeight: '600', color: '#64748b', fontFamily: 'monospace' }}>
                            {idx + 1}
                          </td>
                          {/* Editable Block Select */}
                          <td style={{ fontWeight: '600', color: '#334155', background: '#f8fafc' }}>
                            {isIEUser && isEditing ? (
                              <select
                                className="excel-input"
                                style={{ fontWeight: '700', background: 'transparent', border: 'none', appearance: 'auto', width: '100%', textAlign: 'left' }}
                                value={group.block_id}
                                onChange={(e) => {
                                  const newBlockId = parseInt(e.target.value) || 0;
                                  const newBlock = hierarchyData.find(b => b.id === newBlockId);
                                  const newBlockName = newBlock ? newBlock.name : 'All Blocks';
                                  
                                  handleGroupMultiFieldChange(startRow, {
                                    block_id: newBlockId,
                                    block_name: newBlockName,
                                    floor_id: 0,
                                    floor_name: 'All Floors',
                                    line_id: 0,
                                    line_name: 'All Lines'
                                  });
                                }}
                              >
                                <option value="0">All Blocks</option>
                                {hierarchyData.map(b => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                            ) : (
                              group.block_name
                            )}
                          </td>

                          {/* Editable Floor Select */}
                          <td style={{ fontWeight: '600', color: '#334155', background: '#f8fafc' }}>
                            {isIEUser && isEditing ? (
                              <select
                                className="excel-input"
                                style={{ fontWeight: '700', background: 'transparent', border: 'none', appearance: 'auto', width: '100%', textAlign: 'left' }}
                                value={group.floor_id}
                                disabled={group.block_id === 0}
                                onChange={(e) => {
                                  const newFloorId = parseInt(e.target.value) || 0;
                                  const floors = getRowFloors(group.block_id);
                                  const newFloor = floors.find(f => f.id === newFloorId);
                                  const newFloorName = newFloor ? newFloor.name : 'All Floors';

                                  handleGroupMultiFieldChange(startRow, {
                                    floor_id: newFloorId,
                                    floor_name: newFloorName,
                                    line_id: 0,
                                    line_name: 'All Lines'
                                  });
                                }}
                              >
                                <option value="0">All Floors</option>
                                {getRowFloors(group.block_id).map(f => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                            ) : (
                              group.floor_name
                            )}
                          </td>

                          {/* Editable Assembly Line Select */}
                          <td style={{ fontWeight: '700', color: '#1e293b', background: '#f8fafc' }}>
                            {isIEUser && isEditing ? (
                              <select
                                className="excel-input"
                                style={{ fontWeight: '700', background: 'transparent', border: 'none', appearance: 'auto', width: '100%', textAlign: 'left' }}
                                value={group.line_id}
                                disabled={group.floor_id === 0}
                                onChange={(e) => {
                                  const newLineId = parseInt(e.target.value) || 0;
                                  const lines = getRowLines(group.block_id, group.floor_id);
                                  const newLine = lines.find(l => l.id === newLineId);
                                  const newLineName = newLine ? newLine.name : 'All Lines';

                                  handleGroupMultiFieldChange(startRow, {
                                    line_id: newLineId,
                                    line_name: newLineName
                                  });
                                }}
                              >
                                <option value="0">All Lines</option>
                                {getRowLines(group.block_id, group.floor_id).map(l => (
                                  <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                              </select>
                            ) : (
                              group.line_name
                            )}
                          </td>

                          {/* Editable Product Name */}
                          <td style={{ background: '#f8fafc' }}>
                            {isIEUser && isEditing ? (
                              <input
                                type="text"
                                className="excel-input"
                                style={{ textAlign: 'left', fontFamily: 'inherit', fontWeight: '700' }}
                                value={group.product_name || ''}
                                onChange={(e) => handleGroupFieldChange(startRow, 'product_name', e.target.value)}
                              />
                            ) : (
                              <div style={{ color: '#0f172a', fontWeight: '700' }}>{group.product_name}</div>
                            )}
                          </td>

                          {/* Editable Production Target */}
                          <td style={{ background: '#f8fafc' }}>
                            {isIEUser && isEditing ? (
                              <input
                                type="number"
                                className="excel-input"
                                min="0"
                                style={{ fontWeight: '700' }}
                                value={group.production_target || 0}
                                onChange={(e) => handleGroupFieldChange(startRow, 'production_target', parseInt(e.target.value) || 0)}
                              />
                            ) : (
                              <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>{group.production_target}</div>
                            )}
                          </td>

                           {/* Editable From Date */}
                          <td style={{ background: '#f8fafc', textAlign: 'center', verticalAlign: 'middle' }}>
                            {isIEUser && isEditing ? (
                              <input
                                type="date"
                                className="excel-input"
                                style={{ textAlign: 'center', fontWeight: '700', padding: '0.2rem 0.4rem', fontSize: '0.85rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'transparent' }}
                                value={group.from_date || ''}
                                onChange={(e) => handleGroupFieldChange(startRow, 'from_date', e.target.value)}
                              />
                            ) : (
                              <div style={{ color: '#0f172a', fontWeight: '600', fontFamily: 'monospace', textAlign: 'center' }}>{formatDateDisplay(group.from_date)}</div>
                            )}
                          </td>

                          {/* Editable To Date */}
                          <td style={{ background: '#f8fafc', textAlign: 'center', verticalAlign: 'middle' }}>
                            {isIEUser && isEditing ? (
                              <input
                                type="date"
                                className="excel-input"
                                style={{ textAlign: 'center', fontWeight: '700', padding: '0.2rem 0.4rem', fontSize: '0.85rem', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'transparent' }}
                                value={group.to_date || ''}
                                onChange={(e) => handleGroupFieldChange(startRow, 'to_date', e.target.value)}
                              />
                            ) : (
                              <div style={{ color: '#0f172a', fontWeight: '600', fontFamily: 'monospace', textAlign: 'center' }}>{formatDateDisplay(group.to_date)}</div>
                            )}
                          </td>

                          {/* Skills Sub-table Column */}
                          <td colSpan={isIEUser ? 2 : 5} style={{ padding: 0, verticalAlign: 'top', border: '1px solid #cbd5e1' }}>
                            <div className="skills-subtable-container">
                              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <tbody>
                                  {group.skills.map((skillRow, sIdx) => {
                                    const gap = skillRow.present_count - skillRow.ie_manpower;
                                    const gapPct = skillRow.ie_manpower > 0 ? Math.round((gap / skillRow.ie_manpower) * 100) : 0;
                                    return (
                                      <tr key={sIdx} style={{ borderBottom: sIdx < group.skills.length - 1 ? '1px solid #cbd5e1' : 'none' }}>
                                        {/* Skill Group */}
                                        <td style={{ width: isIEUser ? '64.2%' : '40%', padding: '0.6rem 1rem', fontWeight: '500', color: '#475569', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1', borderTop: 'none', borderLeft: 'none', borderBottom: 'none' }}>
                                          {skillRow.designation}
                                        </td>
                                        {/* Manpower */}
                                        <td style={{ width: isIEUser ? '35.8%' : '22.2%', padding: '0.6rem 1rem', verticalAlign: 'middle', borderRight: !isIEUser ? '1px solid #cbd5e1' : 'none', borderTop: 'none', borderLeft: 'none', borderBottom: 'none' }}>
                                          {isIEUser && isEditing ? (
                                            <input
                                              type="number"
                                              className="excel-input"
                                              min="0"
                                              value={skillRow.ie_manpower || 0}
                                              onChange={(e) => handleRowChange(skillRow.originalIndex, 'ie_manpower', parseInt(e.target.value) || 0)}
                                            />
                                          ) : (
                                            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>{skillRow.ie_manpower}</div>
                                          )}
                                        </td>
                                        {!isIEUser && (
                                          <>
                                            {/* Present */}
                                            <td style={{ width: '13.3%', padding: '0.6rem 1rem', textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1', borderTop: 'none', borderLeft: 'none', borderBottom: 'none' }}>
                                              {skillRow.present_count}
                                            </td>
                                            {/* Gap */}
                                            <td className={gap < 0 ? 'negative-gap' : gap > 0 ? 'positive-gap' : ''} style={{ width: '13.3%', padding: '0.6rem 1rem', textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1', borderTop: 'none', borderLeft: 'none', borderBottom: 'none' }}>
                                              {gap > 0 ? `+${gap}` : gap}
                                            </td>
                                            {/* IE Gap % */}
                                            <td className={gap < 0 ? 'negative-gap' : gap > 0 ? 'positive-gap' : ''} style={{ width: '11.2%', padding: '0.6rem 1rem', textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle', border: 'none' }}>
                                              {gapPct > 0 ? `+${gapPct}%` : `${gapPct}%`}
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>

                          {/* Action Column */}
                          {isIEUser && (
                            <td style={{ textAlign: 'center', background: '#f8fafc', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                                {isEditing ? (
                                  <button 
                                    className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem', borderColor: '#10b981', color: '#10b981', background: '#ffffff', fontSize: '0.75rem' }}
                                    onClick={() => stopEditingGroup(startRow)}
                                    title="Done editing group"
                                  >
                                    <Check size={12} />
                                    <span>Done</span>
                                  </button>
                                ) : (
                                  <button 
                                    className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem', borderColor: '#3b82f6', color: '#3b82f6', background: '#ffffff', fontSize: '0.75rem' }}
                                    onClick={() => startEditingGroup(startRow)}
                                    title="Edit group targets"
                                  >
                                    <Edit2 size={12} />
                                    <span>Edit</span>
                                  </button>
                                )}
                                <button 
                                  className="btn-delete-row"
                                  style={{ padding: '4px' }}
                                  onClick={() => handleRemoveGroup(startRow)}
                                  title="Remove entire line scope"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}

                  {groupedLineScopes.length > 0 && (
                    <tr className="total-row">
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#10b981' }}>{totalProductionTarget}</td>
                      <td></td>
                      <td></td>
                      <td>TOTAL</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#2563eb' }}>{totalIEManpower}</td>
                      {!isIEUser && (
                        <>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{totalPresent}</td>
                          <td className={totalGap < 0 ? 'negative-gap' : totalGap > 0 ? 'positive-gap' : ''} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                            {totalGap > 0 ? `+${totalGap}` : totalGap}
                          </td>
                          <td className={totalGap < 0 ? 'negative-gap' : totalGap > 0 ? 'positive-gap' : ''} style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                            {totalGapPct > 0 ? `+${totalGapPct}%` : `${totalGapPct}%`}
                          </td>
                        </>
                      )}
                      {isIEUser && <td></td>}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="action-bar" style={{ justifyContent: 'flex-end' }}>
              {isIEUser && reportData.length > 0 && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave} 
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Targets'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Skill Row Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">
              <Grid size={18} style={{ color: '#2563eb' }} />
              <span>Select Line & Target Scope</span>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.25rem' }}>
              Choose the target location scope (Block, Floor, Line) and product details:
            </p>

            {/* Block Select */}
            <div className="modal-field-group">
              <label>Block</label>
              <select 
                className="modal-select"
                value={modalBlockId}
                onChange={(e) => {
                  setModalBlockId(parseInt(e.target.value) || 0);
                  setModalFloorId(0);
                  setModalLineId(0);
                }}
              >
                <option value="0">All Blocks</option>
                {hierarchyData.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Floor Select */}
            <div className="modal-field-group">
              <label>Floor</label>
              <select 
                className="modal-select"
                value={modalFloorId}
                onChange={(e) => {
                  setModalFloorId(parseInt(e.target.value) || 0);
                  setModalLineId(0);
                }}
                disabled={modalBlockId === 0}
              >
                <option value="0">All Floors</option>
                {getModalFloors().map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Line Select */}
            <div className="modal-field-group">
              <label>Assembly Line</label>
              <select 
                className="modal-select"
                value={modalLineId}
                onChange={(e) => setModalLineId(parseInt(e.target.value) || 0)}
                disabled={modalFloorId === 0}
              >
                <option value="0">All Lines</option>
                {getModalLines().map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Product Name Input */}
            <div className="modal-field-group">
              <label>Product / Item Name</label>
              <input 
                type="text"
                className="modal-input"
                placeholder="e.g. Bag, Shoes, Belt"
                value={modalProductName}
                onChange={(e) => setModalProductName(e.target.value)}
              />
            </div>

            {/* Production Target Input */}
            <div className="modal-field-group">
              <label>Production Target</label>
              <input 
                type="number"
                className="modal-input"
                min="0"
                value={modalProductionTarget}
                onChange={(e) => setModalProductionTarget(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* From Date Input */}
            <div className="modal-field-group">
              <label>From Date</label>
              <input 
                type="date"
                className="modal-input"
                value={modalFromDate}
                onChange={(e) => setModalFromDate(e.target.value)}
              />
            </div>

            {/* To Date Input */}
            <div className="modal-field-group">
              <label>To Date</label>
              <input 
                type="date"
                className="modal-input"
                value={modalToDate}
                onChange={(e) => setModalToDate(e.target.value)}
              />
            </div>

            <div className="modal-buttons">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddModal(false)} 
                style={{ color: '#0f172a', borderColor: '#cbd5e1' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddSkillRow}
                disabled={modalBlockId === 0 || modalFloorId === 0 || modalLineId === 0}
              >
                Add Line Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
