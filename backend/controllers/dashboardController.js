import { getDatabase } from '../database.js';
import { getAllowedWorkerIds, maskPhone } from '../middleware/auth.js';

// Timezone-aware date helpers (local timezone of the server)
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const syncCallLogsToAttendance = async (db, dateStr) => {
  try {
    const [callsToday] = await db.query(
      `SELECT mcl.matched_worker_id, mcl.call_date, mcl.call_time, mcl.submitted_by 
       FROM mobile_call_logs mcl
       WHERE mcl.call_date = ? AND mcl.matched_worker_id IS NOT NULL`,
      [dateStr]
    );

    for (const call of callsToday) {
      const [existingAtt] = await db.query(
        'SELECT id, status FROM attendance WHERE worker_id = ? AND date = ?',
        [call.matched_worker_id, dateStr]
      );
      const timestamp = `${dateStr} ${call.call_time}`;
      if (existingAtt.length === 0) {
        await db.query(
          "INSERT INTO attendance (worker_id, date, status, method, call_time) VALUES (?, ?, 'Coming', 'Missed Call', ?)",
          [call.matched_worker_id, dateStr, timestamp]
        );
      } else if (existingAtt[0].status === 'Absent') {
        await db.query(
          "UPDATE attendance SET status = 'Coming', method = 'Missed Call', call_time = ? WHERE id = ?",
          [timestamp, existingAtt[0].id]
        );
      }
    }
  } catch (err) {
    console.error('Error syncing call logs to attendance:', err);
  }
};

export async function getDashboardSummary(req, res) {
  const dateStr = req.query.date || getLocalDateString();

  try {
    const { db } = await getDatabase();
    
    // Sync logs first
    await syncCallLogsToAttendance(db, dateStr);

    // Get allowed worker IDs for scope filtering
    const allowedIds = await getAllowedWorkerIds(req.user, db);

    // Fetch total worker count (Active & Allowed) - Only Employees
    const [workersCountRows] = await db.query(
      'SELECT id FROM users WHERE status = "Active" AND role = "Employee"'
    );
    const totalWorkersAll = workersCountRows.map(w => w.id);
    const allowedActiveWorkers = totalWorkersAll.filter(id => allowedIds.includes(id));
    const totalWorkersCount = allowedActiveWorkers.length;

    // Fetch attendance records for this date - Only Employees
    const [attendanceRecords] = await db.query(
      `SELECT a.*, w.department_id, w.name as worker_name 
       FROM attendance a
       JOIN users w ON a.worker_id = w.id
       WHERE a.date = ? AND w.role = "Employee"`,
      [dateStr]
    );

    // Filter attendance to allowed scope
    const allowedAttendance = attendanceRecords.filter(r => allowedIds.includes(r.worker_id));

    const comingCount = allowedAttendance.filter(r => r.status === 'Coming').length;
    const presentCount = allowedAttendance.filter(r => r.status === 'Present').length;
    const absentCount = allowedAttendance.filter(r => r.status === 'Absent').length;

    // Fetch departments
    const [departments] = await db.query('SELECT * FROM departments');

    // Fetch allocations
    const [allocations] = await db.query(
      'SELECT * FROM work_allocations WHERE date = ?',
      [dateStr]
    );

    const allowedAllocations = allocations.filter(a => allowedIds.includes(a.worker_id));

    // Calculate department summary metrics
    const deptSummary = [];
    for (const dept of departments) {
      // All active employees belonging to this department
      const [workersInDept] = await db.query(
        'SELECT id FROM users WHERE department_id = ? AND status = "Active" AND role = "Employee"',
        [dept.id]
      );
      const deptWorkerIdsAll = workersInDept.map(w => w.id);
      
      // Filter department workers to allowed scope
      const deptWorkerIds = deptWorkerIdsAll.filter(id => allowedIds.includes(id));
      
      // If the user's scope contains no workers in this department, skip showing it or show empty
      // But Block Managers / Supervisors might only see workers in a specific department
      if (req.user && !['Admin', 'HR', 'CEO', 'IE'].includes(req.user.role) && deptWorkerIds.length === 0) {
        continue;
      }

      // How many in this department are confirmed Coming or Present today (within allowed scope)
      const confirmedToday = allowedAttendance.filter(r =>
        deptWorkerIds.includes(r.worker_id) && (r.status === 'Coming' || r.status === 'Present')
      ).length;

      // How many in this department are marked Absent today
      const absentToday = allowedAttendance.filter(r =>
        deptWorkerIds.includes(r.worker_id) && r.status === 'Absent'
      ).length;

      // How many in this department are allocated
      const allocatedToday = allowedAllocations.filter(a => a.department_id === dept.id).length;

      deptSummary.push({
        id: dept.id,
        name: dept.name,
        min_workers: dept.min_workers,
        total_workers: deptWorkerIds.length,
        confirmed_today: confirmedToday,
        absent_today: absentToday,
        allocated_today: allocatedToday,
        shortage: confirmedToday < dept.min_workers
      });
    }

    // Fetch recent calls activity (limit 15)
    const [recentActivity] = await db.query(
      `SELECT a.*, w.name as worker_name, w.phone as worker_phone, d.name as department_name
       FROM attendance a
       JOIN users w ON a.worker_id = w.id
       LEFT JOIN departments d ON w.department_id = d.id
       WHERE a.date = ?
       ORDER BY a.call_time DESC, a.id DESC
       LIMIT 15`,
      [dateStr]
    );

    // Filter recent activity to allowed scope
    const allowedActivity = recentActivity.filter(r => allowedIds.includes(r.worker_id));

    // Sanitization: Mask phone numbers if user role is not Admin or HR
    const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
    const sanitizedActivity = allowedActivity.map(r => ({
      ...r,
      worker_phone: isAuthorized ? r.worker_phone : maskPhone(r.worker_phone)
    }));

    // Generate hierarchy tree for mobile and web summary view
    const { nestedHierarchy } = await buildHierarchyData(db, dateStr, req.user, allowedIds);

    res.json({
      date: dateStr,
      stats: {
        total_workers: totalWorkersCount,
        coming: comingCount,
        present: presentCount,
        absent: absentCount,
        unconfirmed: Math.max(0, totalWorkersCount - comingCount - presentCount - absentCount)
      },
      departments: deptSummary,
      hierarchy: nestedHierarchy,
      recent_activity: sanitizedActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: error.message });
  }
}

async function buildHierarchyData(db, dateStr, reqUser, allowedIds) {
  const [blocks] = await db.query('SELECT * FROM blocks ORDER BY name ASC');
  const [floors] = await db.query('SELECT * FROM floors ORDER BY name ASC');
  const [lines] = await db.query('SELECT * FROM assembly_lines ORDER BY name ASC');

  const [workers] = await db.query(`
    SELECT w.*, sk.main_skill, al.name as home_line_name, f.name as home_floor_name, b.name as home_block_name
    FROM users w
    LEFT JOIN skills sk ON w.skill_id = sk.id
    LEFT JOIN assembly_lines al ON w.line_id = al.id
    LEFT JOIN floors f ON al.floor_id = f.id
    LEFT JOIN blocks b ON f.block_id = b.id
    WHERE w.status = 'Active' AND w.role = 'Employee'
  `);

  const [attendance] = await db.query(
    'SELECT * FROM attendance WHERE date = ?',
    [dateStr]
  );

  const [reassignments] = await db.query(
    'SELECT * FROM line_allocations WHERE date = ?',
    [dateStr]
  );

  const workersWithState = workers.map(w => {
    const att = attendance.find(a => a.worker_id === w.id);
    const attStatus = att ? att.status : 'Absent';
    const reass = reassignments.find(r => r.worker_id === w.id);
    
    return {
      ...w,
      attendance_status: attStatus,
      reassigned: !!reass,
      allocated_line_id: reass ? reass.allocated_line_id : w.line_id,
      original_line_id: w.line_id,
      reassignment_reason: reass ? reass.reason : null,
      is_reassigned_out: reass && reass.allocated_line_id !== w.line_id
    };
  });

  let filteredBlocks = blocks;
  let filteredFloors = floors;
  let filteredLines = lines;

  if (reqUser && !['Admin', 'HR', 'CEO', 'Manager', 'Supervisor', 'IE'].includes(reqUser.role)) {
    const userId = reqUser.id;
    const [supRows] = await db.query(
      `SELECT w.line_id, 
              COALESCE(w.floor_id, al.floor_id) as floor_id, 
              COALESCE(w.block_id, f.block_id, f2.block_id) as block_id
       FROM users w
       LEFT JOIN assembly_lines al ON w.line_id = al.id
       LEFT JOIN floors f ON al.floor_id = f.id
       LEFT JOIN floors f2 ON w.floor_id = f2.id
       WHERE w.id = ?`,
      [userId]
    );
    if (supRows.length > 0) {
      const sup = supRows[0];
      if (reqUser.role === 'Block Manager' || reqUser.role === 'Block Supervisor') {
        if (sup.block_id) {
          filteredBlocks = blocks.filter(b => b.id === sup.block_id);
          filteredFloors = floors.filter(f => f.block_id === sup.block_id);
          filteredLines = lines.filter(l => filteredFloors.map(f => f.id).includes(l.floor_id));
        }
      } else if (reqUser.role === 'Floor Manager' || reqUser.role === 'Floor Supervisor') {
        if (sup.floor_id) {
          filteredBlocks = blocks.filter(b => b.id === sup.block_id);
          filteredFloors = floors.filter(f => f.id === sup.floor_id);
          filteredLines = lines.filter(l => l.floor_id === sup.floor_id);
        }
      } else if (reqUser.role === 'Line Supervisor' || reqUser.role === 'Assembly Line Supervisor') {
        if (sup.line_id) {
          filteredBlocks = blocks.filter(b => b.id === sup.block_id);
          filteredFloors = floors.filter(f => f.id === sup.floor_id);
          filteredLines = lines.filter(l => l.id === sup.line_id);
        }
      }
    }
  }

  const isAuthorized = reqUser && ['Admin', 'HR'].includes(reqUser.role);

  const lineStats = filteredLines.map(line => {
    const currentWorkers = workersWithState.filter(w => 
      allowedIds.includes(w.id) &&
      w.allocated_line_id === line.id && 
      (w.attendance_status === 'Coming' || w.attendance_status === 'Present')
    );

    const homePresentWorkers = workersWithState.filter(w =>
      allowedIds.includes(w.id) &&
      w.line_id === line.id && 
      (w.attendance_status === 'Coming' || w.attendance_status === 'Present')
    );

    const reassignedIn = currentWorkers.filter(w => w.line_id !== line.id);
    const reassignedOut = workersWithState.filter(w =>
      allowedIds.includes(w.id) &&
      w.line_id === line.id &&
      w.allocated_line_id !== line.id &&
      (w.attendance_status === 'Coming' || w.attendance_status === 'Present')
    );

    const workerList = workersWithState.filter(w => allowedIds.includes(w.id) && w.line_id === line.id);
    const presentCount = homePresentWorkers.length - reassignedOut.length + reassignedIn.length;
    const absentCount = workerList.filter(w => w.attendance_status === 'Absent').length;
    
    // Required Alert Threshold for Assembly Line (dynamic total roster & default required alert threshold)
    const requiredWorkers = line.required_workers || 0;
    const deficit = Math.max(0, requiredWorkers - presentCount);
    const surplus = Math.max(0, presentCount - requiredWorkers);

    const sanitizedWorkersList = workerList.map(w => ({
      id: w.id,
      name: w.name,
      phone: isAuthorized ? w.phone : maskPhone(w.phone),
      proficiency: w.proficiency,
      main_skill: w.main_skill,
      attendance_status: w.attendance_status,
      reassigned: w.reassigned,
      allocated_line_id: w.allocated_line_id,
      is_reassigned_out: w.is_reassigned_out,
      reassignment_reason: w.reassignment_reason
    }));

    return {
      ...line,
      required_workers: requiredWorkers,
      total_roster: workerList.length,
      present_count: presentCount,
      absent_count: absentCount,
      home_present_count: homePresentWorkers.length,
      reassigned_in_count: reassignedIn.length,
      reassigned_out_count: reassignedOut.length,
      deficit,
      surplus,
      workers: sanitizedWorkersList
    };
  });

  const nestedHierarchy = filteredBlocks.map(block => {
    const blockFloors = filteredFloors.filter(f => f.block_id === block.id).map(floor => {
      const floorLines = lineStats.filter(l => l.floor_id === floor.id);
      const floorRequired = floorLines.reduce((acc, l) => acc + l.required_workers, 0);
      const floorPresent = floorLines.reduce((acc, l) => acc + l.present_count, 0);
      return {
        ...floor,
        required_workers: floorRequired,
        present_count: floorPresent,
        lines: floorLines
      };
    });
    const blockRequired = blockFloors.reduce((acc, f) => acc + f.required_workers, 0);
    const blockPresent = blockFloors.reduce((acc, f) => acc + f.present_count, 0);
    return {
      ...block,
      required_workers: blockRequired,
      present_count: blockPresent,
      floors: blockFloors
    };
  });

  return { nestedHierarchy, workersWithState };
}

export async function getHRDashboard(req, res) {
  const dateStr = req.query.date || getLocalDateString();
  try {
    const { db } = await getDatabase();
    
    // Sync logs
    await syncCallLogsToAttendance(db, dateStr);

    const allowedIds = await getAllowedWorkerIds(req.user, db);
    const { nestedHierarchy, workersWithState } = await buildHierarchyData(db, dateStr, req.user, allowedIds);

    const allPresentWorkers = workersWithState.filter(w => 
      allowedIds.includes(w.id) &&
      (w.attendance_status === 'Coming' || w.attendance_status === 'Present')
    );

    const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
    const sanitizedPresentWorkers = allPresentWorkers.map(w => ({
      id: w.id,
      name: w.name,
      phone: isAuthorized ? w.phone : maskPhone(w.phone),
      proficiency: w.proficiency,
      main_skill: w.main_skill,
      home_line_id: w.line_id,
      home_line_name: w.home_line_name,
      home_floor_name: w.home_floor_name,
      home_block_name: w.home_block_name,
      allocated_line_id: w.allocated_line_id,
      attendance_status: w.attendance_status,
      reassigned: w.reassigned,
      is_reassigned_out: w.is_reassigned_out,
      reassignment_reason: w.reassignment_reason
    }));

    res.json({
      date: dateStr,
      hierarchy: nestedHierarchy,
      present_workers: sanitizedPresentWorkers
    });
  } catch (err) {
    console.error('Error in HR Dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getIEHeadcount(req, res) {
  const fromDate = req.query.from_date || getLocalDateString();
  const toDate = req.query.to_date || getLocalDateString();

  try {
    const { db } = await getDatabase();
    
    // Sync call logs for accuracy
    await syncCallLogsToAttendance(db, toDate);

    // 1. Fetch all Assembly Lines with Block and Floor details
    const [lines] = await db.query(`
      SELECT 
        al.id AS line_id,
        al.name AS line_name,
        f.id AS floor_id,
        f.name AS floor_name,
        b.id AS block_id,
        b.name AS block_name
      FROM assembly_lines al
      JOIN floors f ON al.floor_id = f.id
      JOIN blocks b ON f.block_id = b.id
    `);

    // 2. Load Skill Master and collect all unique designations
    const [skills] = await db.query('SELECT id, main_skill, sub_skills FROM skills');
    const skillDesignationMap = new Map();
    const uniqueDesignations = [];

    for (const skill of skills) {
      let subSkills = [];
      if (skill.sub_skills) {
        try {
          subSkills = typeof skill.sub_skills === 'string' ? JSON.parse(skill.sub_skills) : skill.sub_skills;
        } catch (e) {
          subSkills = [];
        }
      }
      if (Array.isArray(subSkills) && subSkills.length > 0) {
        for (const sub of subSkills) {
          const name = `${skill.main_skill} - ${sub}`;
          skillDesignationMap.set(name.toUpperCase(), { skillId: skill.id, subSkill: sub });
          uniqueDesignations.push(name);
        }
      } else {
        const name = skill.main_skill;
        skillDesignationMap.set(name.toUpperCase(), { skillId: skill.id, subSkill: null });
        uniqueDesignations.push(name);
      }
    }

    let userBlockId = null;
    let userFloorId = null;
    let userLineId = null;
    let userRole = req.headers['x-user-role'] || '';

    if (req.headers['x-user-id']) {
      const [userRows] = await db.query('SELECT block_id, floor_id, line_id, role FROM users WHERE id = ?', [req.headers['x-user-id']]);
      if (userRows.length > 0) {
        userBlockId = userRows[0].block_id;
        userFloorId = userRows[0].floor_id;
        userLineId = userRows[0].line_id;
        if (!userRole) userRole = userRows[0].role;
      }
    }

    if (req.query.block_id) userBlockId = parseInt(req.query.block_id);
    if (req.query.floor_id) userFloorId = parseInt(req.query.floor_id);
    if (req.query.line_id) userLineId = parseInt(req.query.line_id);

    let whereClause = `((mr.from_date <= ? AND mr.to_date >= ?) OR (mr.from_date = ? AND mr.to_date = ?))`;
    let queryParams = [toDate, fromDate, fromDate, toDate];

    if (['Assembly Line Supervisor', 'Line Supervisor', 'Supervisor'].includes(userRole)) {
      if (userLineId > 0) {
        whereClause += ` AND (mr.line_id = ? OR mr.line_id = 0)`;
        queryParams.push(userLineId);
      } else if (userFloorId > 0) {
        whereClause += ` AND (mr.floor_id = ? OR mr.floor_id = 0)`;
        queryParams.push(userFloorId);
      } else if (userBlockId > 0) {
        whereClause += ` AND (mr.block_id = ? OR mr.block_id = 0)`;
        queryParams.push(userBlockId);
      }
    } else if (['Floor Manager', 'Floor Supervisor'].includes(userRole) && userFloorId > 0) {
      whereClause += ` AND (mr.floor_id = ? OR mr.floor_id = 0)`;
      queryParams.push(userFloorId);
    } else if (['Block Manager', 'Block Supervisor'].includes(userRole) && userBlockId > 0) {
      whereClause += ` AND (mr.block_id = ? OR mr.block_id = 0)`;
      queryParams.push(userBlockId);
    }

    // 3. Fetch saved ie_manpower requirements matching/overlapping this date range
    const [reqs] = await db.query(
      `SELECT 
        mr.id,
        mr.designation,
        mr.from_date,
        mr.to_date,
        mr.block_id,
        mr.floor_id,
        mr.line_id,
        mr.product_name,
        mr.style_number,
        mr.production_target,
        mr.ie_manpower,
        COALESCE(b.name, 'All Blocks') AS block_name,
        COALESCE(f.name, 'All Floors') AS floor_name,
        COALESCE(al.name, 'All Lines') AS line_name
       FROM ie_manpower_requirements mr
       LEFT JOIN blocks b ON mr.block_id = b.id
       LEFT JOIN floors f ON mr.floor_id = f.id
       LEFT JOIN assembly_lines al ON mr.line_id = al.id
       WHERE ${whereClause}`,
      queryParams
    );

    // 4. Build report list of only saved requirements
    const reportList = reqs.map(r => ({
      id: r.id,
      designation: r.designation,
      from_date: r.from_date instanceof Date ? r.from_date.toISOString().split('T')[0] : r.from_date,
      to_date: r.to_date instanceof Date ? r.to_date.toISOString().split('T')[0] : r.to_date,
      block_id: r.block_id,
      floor_id: r.floor_id,
      line_id: r.line_id,
      block_name: r.block_name,
      floor_name: r.floor_name,
      line_name: r.line_name,
      product_name: r.product_name,
      style_number: r.style_number || '',
      production_target: r.production_target,
      ie_manpower: r.ie_manpower,
      roster_count: 0,
      present_count: 0,
      roster_gap: 0,
      present_gap: 0
    }));

    // 5. Fetch all active employee roster workers and their attendance status in the date range
    const [roster] = await db.query(`
      SELECT 
        u.id, 
        u.designation, 
        u.skill_id, 
        u.sub_skill,
        u.block_id,
        u.floor_id,
        u.line_id,
        a.status AS attendance_status
      FROM users u
      LEFT JOIN attendance a ON u.id = a.worker_id AND a.date >= ? AND a.date <= ?
      WHERE u.role = 'Employee' AND u.status = 'Active'
    `, [fromDate, toDate]);

    // Match each worker to a dynamic designation and increment roster count / present count on matching hierarchy rows
    roster.forEach(worker => {
      const isPresent = worker.attendance_status === 'Coming' || worker.attendance_status === 'Present';

      let matchedDsg = null;
      if (worker.skill_id) {
        for (const [dsgName, info] of skillDesignationMap.entries()) {
          if (info.skillId === worker.skill_id && 
              (!info.subSkill || String(info.subSkill).toUpperCase() === String(worker.sub_skill).toUpperCase())) {
            matchedDsg = dsgName;
            break;
          }
        }
      }

      if (!matchedDsg && worker.designation) {
        const key = worker.designation.toUpperCase();
        for (const dsgName of skillDesignationMap.keys()) {
          if (dsgName === key) {
            matchedDsg = dsgName;
            break;
          }
        }
      }

      const checkMatched = matchedDsg ? matchedDsg : (worker.designation ? worker.designation.toUpperCase() : null);

      reportList.forEach(row => {
        const matchBlock = row.block_id === 0 || row.block_id === worker.block_id;
        const matchFloor = row.floor_id === 0 || row.floor_id === worker.floor_id;
        const matchLine = row.line_id === 0 || row.line_id === worker.line_id;
        const matchDesignation = !row.designation || (checkMatched && row.designation.toUpperCase() === checkMatched);

        if (matchBlock && matchFloor && matchLine && matchDesignation) {
          row.roster_count += 1;
          if (isPresent) {
            row.present_count += 1;
          }
        }
      });
    });

    // Calculate shortage gaps
    reportList.forEach(row => {
      row.roster_gap = Math.max(0, row.ie_manpower - row.roster_count);
      row.present_gap = Math.max(0, row.ie_manpower - row.present_count);
    });

    // Sort report perfectly by hierarchy: Block -> Floor -> Line -> Designation
    const report = reportList.sort((a, b) => {
      const blockCompare = (a.block_name || '').localeCompare(b.block_name || '');
      if (blockCompare !== 0) return blockCompare;
      
      const floorCompare = (a.floor_name || '').localeCompare(b.floor_name || '');
      if (floorCompare !== 0) return floorCompare;

      const lineCompare = (a.line_name || '').localeCompare(b.line_name || '');
      if (lineCompare !== 0) return lineCompare;

      return a.designation.localeCompare(b.designation);
    });

    res.json({
      from_date: fromDate,
      to_date: toDate,
      report: report
    });
  } catch (error) {
    console.error('Error fetching IE headcount plan:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateIEHeadcount(req, res) {
  const { requirements, from_date, to_date } = req.body;
  if (!Array.isArray(requirements)) {
    return res.status(400).json({ error: 'Requirements must be an array.' });
  }

  const fromDate = from_date || getLocalDateString();
  const toDate = to_date || getLocalDateString();

  try {
    const { db } = await getDatabase();

    // Clear existing for this date range to prevent orphans/duplicates
    await db.query(
      `DELETE FROM ie_manpower_requirements 
       WHERE (from_date <= ? AND to_date >= ?) OR (from_date = ? AND to_date = ?)`,
      [toDate, fromDate, fromDate, toDate]
    );

    for (const reqItem of requirements) {
      const { designation, block_id, floor_id, line_id, product_name, style_number, production_target, ie_manpower, from_date: itemFrom, to_date: itemTo } = reqItem;
      const targetFromDate = itemFrom || fromDate;
      const targetToDate = itemTo || toDate;

      await db.query(`
        INSERT INTO ie_manpower_requirements (designation, from_date, to_date, block_id, floor_id, line_id, product_name, style_number, production_target, ie_manpower)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE ie_manpower = VALUES(ie_manpower), production_target = VALUES(production_target), product_name = VALUES(product_name), style_number = VALUES(style_number)
      `, [
        designation, 
        targetFromDate, 
        targetToDate, 
        parseInt(block_id) || 0, 
        parseInt(floor_id) || 0, 
        parseInt(line_id) || 0, 
        product_name || 'General',
        style_number || '',
        parseInt(production_target) || 0,
        parseInt(ie_manpower) || 0
      ]);
    }

    res.json({ success: true, message: 'IE requirements updated successfully.' });
  } catch (error) {
    console.error('Error updating IE headcount targets:', error);
    res.status(500).json({ error: error.message });
  }
}
