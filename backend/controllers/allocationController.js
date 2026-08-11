import { getDatabase } from '../database.js';
import { getAllowedWorkerIds, maskPhone } from '../middleware/auth.js';

// Timezone-aware date helpers
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalTimestampString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export async function getAllocations(req, res) {
  const dateStr = req.query.date || getLocalDateString();
  try {
    const { db } = await getDatabase();
    const allowedIds = await getAllowedWorkerIds(req.user, db);

    const [allocations] = await db.query(
      `SELECT wa.*, w.name as worker_name, d.name as department_name
       FROM work_allocations wa
       JOIN users w ON wa.worker_id = w.id
       JOIN departments d ON wa.department_id = d.id
       WHERE wa.date = ?`,
      [dateStr]
    );

    const filtered = allocations.filter(a => allowedIds.includes(a.worker_id));
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createAllocation(req, res) {
  const { date, worker_id, department_id, task_assigned } = req.body;
  if (!date || !worker_id || !department_id) {
    return res.status(400).json({ error: 'Date, Worker ID, and Department ID are required.' });
  }

  try {
    const { db } = await getDatabase();
    const [existing] = await db.query(
      'SELECT id FROM work_allocations WHERE date = ? AND worker_id = ?',
      [date, worker_id]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE work_allocations SET department_id = ?, task_assigned = ? WHERE id = ?',
        [department_id, task_assigned || '', existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO work_allocations (date, worker_id, department_id, task_assigned) VALUES (?, ?, ?, ?)',
        [date, worker_id, department_id, task_assigned || '']
      );
    }

    res.json({ success: true, message: 'Worker allocated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteAllocation(req, res) {
  const { date, worker_id } = req.body;
  try {
    const { db } = await getDatabase();
    await db.query(
      'DELETE FROM work_allocations WHERE date = ? AND worker_id = ?',
      [date, worker_id]
    );
    res.json({ success: true, message: 'Allocation cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAttendance(req, res) {
  const dateStr = req.query.date || getLocalDateString();
  try {
    const { db } = await getDatabase();
    const allowedIds = await getAllowedWorkerIds(req.user, db);

    const [records] = await db.query(
      `SELECT a.*, w.name as worker_name, w.phone as worker_phone, d.name as department_name, s.name as shift_name
       FROM attendance a
       JOIN users w ON a.worker_id = w.id
       LEFT JOIN departments d ON w.department_id = d.id
       LEFT JOIN shifts s ON w.default_shift_id = s.id
       WHERE a.date = ?`,
      [dateStr]
    );

    let filtered = records.filter(r => allowedIds.includes(r.worker_id));
    const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
    filtered = filtered.map(r => ({
      ...r,
      worker_phone: isAuthorized ? r.worker_phone : maskPhone(r.worker_phone)
    }));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createManualAttendance(req, res) {
  const { worker_id, date, status, method } = req.body;
  if (!worker_id || !date || !status) {
    return res.status(400).json({ error: 'Worker ID, Date, and Status are required.' });
  }

  try {
    const { db } = await getDatabase();
    const [existing] = await db.query(
      'SELECT id FROM attendance WHERE worker_id = ? AND date = ?',
      [worker_id, date]
    );

    const nowTimestamp = getLocalTimestampString();

    if (existing.length > 0) {
      await db.query(
        'UPDATE attendance SET status = ?, method = ?, call_time = ? WHERE id = ?',
        [status, method || 'Manual Override', status === 'Absent' ? null : nowTimestamp, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO attendance (worker_id, date, status, method, call_time) VALUES (?, ?, ?, ?, ?)',
        [worker_id, date, status, method || 'Manual', status === 'Absent' ? null : nowTimestamp]
      );
    }

    res.json({ success: true, message: 'Attendance status logged.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function reassign(req, res) {
  const { date, worker_id, allocated_line_id, reason } = req.body;
  if (!date || !worker_id || allocated_line_id === undefined) {
    return res.status(400).json({ error: 'Date, Worker ID, and Allocated Line ID are required.' });
  }

  try {
    const { db } = await getDatabase();
    const [workers] = await db.query('SELECT line_id FROM users WHERE id = ?', [worker_id]);
    if (workers.length === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }
    const originalLineId = workers[0].line_id;

    if (allocated_line_id === null || originalLineId === allocated_line_id) {
      await db.query(
        'DELETE FROM line_allocations WHERE date = ? AND worker_id = ?',
        [date, worker_id]
      );
      return res.json({ success: true, message: 'Reassignment cleared.' });
    }

    const [existing] = await db.query(
      'SELECT id FROM line_allocations WHERE date = ? AND worker_id = ?',
      [date, worker_id]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE line_allocations SET original_line_id = ?, allocated_line_id = ?, reason = ? WHERE id = ?',
        [originalLineId || 0, allocated_line_id, reason || 'Manual Reassignment', existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO line_allocations (date, worker_id, original_line_id, allocated_line_id, reason) VALUES (?, ?, ?, ?, ?)',
        [date, worker_id, originalLineId || 0, allocated_line_id, reason || 'Manual Reassignment']
      );
    }

    res.json({ success: true, message: 'Worker reassigned successfully.' });
  } catch (err) {
    console.error('Error in manual reassignment:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function clearReassignments(req, res) {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required.' });
  try {
    const { db } = await getDatabase();
    await db.query('DELETE FROM line_allocations WHERE date = ?', [date]);
    res.json({ success: true, message: 'All reassignments cleared for this date.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createMobileCallLog(req, res) {
  const { caller_number, call_date, call_time, submitted_by, notes } = req.body;

  if (!caller_number || !call_date || !call_time) {
    return res.status(400).json({ error: 'caller_number, call_date, and call_time are required.' });
  }

  try {
    const { db } = await getDatabase();
    const cleanPhone = caller_number.replace(/\D/g, '').slice(-10);

    const [workers] = await db.query(`
      SELECT w.*, d.name as department_name 
      FROM users w 
      LEFT JOIN departments d ON w.department_id = d.id 
      WHERE w.status = 'Active'
    `);
    const worker = workers.find(w => w.phone.replace(/\D/g, '').slice(-10) === cleanPhone);

    if (!worker) {
      const [existingRaw] = await db.query(
        'SELECT id FROM raw_call_logs WHERE caller_number = ? AND call_date = ? AND call_time = ?',
        [caller_number, call_date, call_time]
      );
      if (existingRaw.length === 0) {
        await db.query(
          `INSERT INTO raw_call_logs (caller_number, call_date, call_time, submitted_by) VALUES (?, ?, ?, ?)`,
          [caller_number, call_date, call_time, submitted_by || 'Admin']
        );
      }

      const [existingMcl] = await db.query(
        'SELECT id FROM mobile_call_logs WHERE caller_number = ? AND call_date = ? AND call_time = ?',
        [caller_number, call_date, call_time]
      );

      if (existingMcl.length === 0) {
        await db.query(
          `INSERT INTO mobile_call_logs (caller_number, call_date, call_time, submitted_by, matched_worker_id, shortage_count, notes)
           VALUES (?, ?, ?, ?, NULL, 0, ?)`,
          [caller_number, call_date, call_time, submitted_by || 'Admin', notes || '']
        );
      }

      return res.status(200).json({
        success: true,
        matched: false,
        worker_name: null,
        department_name: null,
        shortage_count: 0
      });
    }

    const workerName = worker.name;
    const departmentName = worker.department_name || 'No Department';

    const [existingAttendance] = await db.query(
      'SELECT id, status FROM attendance WHERE worker_id = ? AND date = ?',
      [worker.id, call_date]
    );

    const nowTimestamp = `${call_date} ${call_time}`;

    if (existingAttendance.length > 0) {
      if (existingAttendance[0].status === 'Absent') {
        await db.query(
          "UPDATE attendance SET status = 'Coming', method = 'Missed Call', call_time = ? WHERE id = ?",
          [nowTimestamp, existingAttendance[0].id]
        );
      }
    } else {
      await db.query(
        "INSERT INTO attendance (worker_id, date, status, method, call_time) VALUES (?, ?, 'Coming', 'Missed Call', ?)",
        [worker.id, call_date, nowTimestamp]
      );
    }

    const [existingMcl] = await db.query(
      'SELECT id FROM mobile_call_logs WHERE (caller_number = ? OR matched_worker_id = ?) AND call_date = ?',
      [caller_number, worker.id, call_date]
    );

    let shortageCount = 0;
    if (worker.line_id) {
      // 1. Get IE required headcount for worker's line
      const [ieReqs] = await db.query(
        `SELECT SUM(ie_manpower) as total_ie
         FROM ie_manpower_requirements
         WHERE line_id = ? AND (from_date <= ? AND to_date >= ?)`,
        [worker.line_id, call_date, call_date]
      );
      
      let ieRequired = 0;
      if (ieReqs[0] && ieReqs[0].total_ie !== null) {
        ieRequired = parseInt(ieReqs[0].total_ie);
      } else {
        const [lineInfo] = await db.query('SELECT required_workers FROM assembly_lines WHERE id = ?', [worker.line_id]);
        ieRequired = lineInfo[0] ? lineInfo[0].required_workers : 20;
      }

      // 2. Get present count on the line today (including reassignments)
      const [pres] = await db.query(
        `SELECT COUNT(DISTINCT u.id) as present_count
         FROM users u
         JOIN attendance a ON u.id = a.worker_id AND a.date = ? AND a.status IN ('Coming', 'Present')
         LEFT JOIN line_allocations la ON u.id = la.worker_id AND la.date = ?
         WHERE u.status = 'Active' AND u.role = 'Employee' AND (
           (u.line_id = ? AND (la.id IS NULL OR la.allocated_line_id = ?))
           OR
           (la.allocated_line_id = ?)
         )`,
        [call_date, call_date, worker.line_id, worker.line_id, worker.line_id]
      );
      const presentCount = pres[0] ? pres[0].present_count : 0;
      
      shortageCount = Math.max(0, ieRequired - presentCount);
    }

    if (existingMcl.length > 0) {
      return res.status(200).json({
        success: true,
        matched: true,
        already_captured: true,
        worker_name: workerName,
        department_name: departmentName,
        shortage_count: shortageCount
      });
    }

    await db.query(
      `INSERT INTO raw_call_logs (caller_number, call_date, call_time, submitted_by) VALUES (?, ?, ?, ?)`,
      [caller_number, call_date, call_time, submitted_by || 'Admin']
    );

    const [result] = await db.query(
      `INSERT INTO mobile_call_logs (caller_number, call_date, call_time, submitted_by, matched_worker_id, shortage_count, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [caller_number, call_date, call_time, submitted_by || 'Admin', worker.id, shortageCount, notes || '']
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      matched: true,
      worker_name: workerName,
      department_name: departmentName,
      shortage_count: shortageCount
    });

  } catch (error) {
    console.error('[MobileCallLog] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getMobileCallLogs(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const dateStr = req.query.date || null;
  try {
    const { db } = await getDatabase();
    let sql = `SELECT mcl.id, mcl.caller_number, w.name as worker_name, d.name as department_name, 
                      DATE_FORMAT(mcl.call_date, '%Y-%m-%d') as call_date, 
                      mcl.call_time, mcl.submitted_by, mcl.notes, mcl.shortage_count, mcl.created_at 
               FROM mobile_call_logs mcl
               LEFT JOIN users w ON mcl.matched_worker_id = w.id
               LEFT JOIN departments d ON w.department_id = d.id`;
    const params = [];
    if (dateStr) {
      sql += ' WHERE mcl.call_date = ?';
      params.push(dateStr);
    }
    sql += ' ORDER BY mcl.created_at DESC LIMIT ?';
    params.push(limit);
    const [logs] = await db.query(sql, params);

    // Sanitization: Mask caller numbers if not Admin or HR
    const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
    const sanitizedLogs = logs.map(l => ({
      ...l,
      caller_number: isAuthorized ? l.caller_number : maskPhone(l.caller_number)
    }));

    res.json(sanitizedLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMobileShortageByNumber(req, res) {
  try {
    const { db } = await getDatabase();
    const [rows] = await db.query(`
      SELECT mcl.caller_number, w.name as worker_name, d.name as department_name,
             COUNT(mcl.id) as call_count,
             MAX(DATE_FORMAT(mcl.call_date, '%Y-%m-%d')) as last_call_date,
             MAX(mcl.shortage_count) as shortage_count
      FROM mobile_call_logs mcl
      LEFT JOIN users w ON mcl.matched_worker_id = w.id
      LEFT JOIN departments d ON w.department_id = d.id
      GROUP BY mcl.caller_number, w.name, d.name
      ORDER BY call_count DESC
    `);

    // Sanitization: Mask caller numbers if not Admin or HR
    const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
    const sanitizedRows = rows.map(r => ({
      ...r,
      caller_number: isAuthorized ? r.caller_number : maskPhone(r.caller_number)
    }));

    res.json(sanitizedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
