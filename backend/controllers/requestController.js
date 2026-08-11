import { getDatabase } from '../database.js';
import { getAllowedWorkerIds } from '../middleware/auth.js';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function createRequest(req, res) {
  const { 
    date, target_role, target_floor_id, target_block_id, 
    requested_skill_id, count, source_line_id, destination_line_id 
  } = req.body;

  if (!date || !target_role || !destination_line_id || !count) {
    return res.status(400).json({ error: 'Date, target role, destination line, and count are required.' });
  }

  try {
    const { db } = await getDatabase();

    // Fetch supervisor's own block/floor details
    let userFloorId = null;
    let userBlockId = null;
    const [supRows] = await db.query(
      `SELECT COALESCE(w.floor_id, al.floor_id) as floor_id, 
              COALESCE(w.block_id, f.block_id, f2.block_id) as block_id
       FROM users w
       LEFT JOIN assembly_lines al ON w.line_id = al.id
       LEFT JOIN floors f ON al.floor_id = f.id
       LEFT JOIN floors f2 ON w.floor_id = f2.id
       WHERE w.id = ?`,
      [req.user.id]
    );
    if (supRows.length > 0) {
      userFloorId = supRows[0].floor_id;
      userBlockId = supRows[0].block_id;
    }

    // Role-based organizational validation
    if (req.user.role === 'Block Manager') {
      if (target_role !== 'HR' && target_role !== 'Block Manager') {
        return res.status(400).json({ error: 'Block Managers can only request from HR or other Block Managers.' });
      }
      if (target_role === 'Block Manager' && target_block_id && parseInt(target_block_id) === userBlockId) {
        return res.status(400).json({ error: 'Block Managers cannot request resources from their own block.' });
      }
    } else if (req.user.role === 'Floor Manager') {
      if (target_role !== 'HR' && target_role !== 'Block Manager' && target_role !== 'Floor Manager') {
        return res.status(400).json({ error: 'Floor Managers can only request from HR, Block Managers, or same-block Floor Managers.' });
      }
      if (target_role === 'Block Manager' && target_block_id && parseInt(target_block_id) !== userBlockId) {
        return res.status(400).json({ error: 'Floor Managers can only request from their own Block Manager.' });
      }
      if (target_role === 'Floor Manager') {
        if (target_block_id && parseInt(target_block_id) !== userBlockId) {
          return res.status(400).json({ error: 'Floor Managers can only request from other Floor Managers in the same block.' });
        }
        if (target_floor_id && parseInt(target_floor_id) === userFloorId) {
          return res.status(400).json({ error: 'Floor Managers cannot request from their own floor.' });
        }
      }
    }
    
    await db.query(`
      INSERT INTO resource_requests 
      (date, requester_id, requester_role, target_role, target_floor_id, target_block_id, requested_skill_id, count, source_line_id, destination_line_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `, [
      date, req.user.id, req.user.role, target_role, target_floor_id || null, target_block_id || null, 
      requested_skill_id || null, count, source_line_id || null, destination_line_id
    ]);

    res.json({ success: true, message: 'Resource request created successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getRequests(req, res) {
  const dateStr = req.query.date || getLocalDateString();
  try {
    const { db } = await getDatabase();

    // Determine the user's scope to see incoming requests
    const { role, worker_id } = req.user;
    
    // We get the user's floor/block if they are a manager
    let userFloorId = null;
    let userBlockId = null;
    
    if (worker_id) {
      const [supRows] = await db.query(
        `SELECT COALESCE(w.floor_id, al.floor_id) as floor_id, 
                COALESCE(w.block_id, f.block_id, f2.block_id) as block_id
         FROM users w
         LEFT JOIN assembly_lines al ON w.line_id = al.id
         LEFT JOIN floors f ON al.floor_id = f.id
         LEFT JOIN floors f2 ON w.floor_id = f2.id
         WHERE w.id = ?`,
        [worker_id]
      );
      if (supRows.length > 0) {
        userFloorId = supRows[0].floor_id;
        userBlockId = supRows[0].block_id;
      }
    }

    // A request is relevant if:
    // 1. The user created it (Outgoing)
    // 2. The user is HR and the target_role is 'HR' (Incoming to HR)
    // 3. The user is a Manager and the target_floor_id or target_block_id matches theirs (Incoming to Manager)

    let sql = `
      SELECT rr.*, 
             req_user.name as requester_name,
             sk.main_skill,
             sl.name as source_line_name,
             dl.name as destination_line_name,
             f.name as target_floor_name,
             b.name as target_block_name
      FROM resource_requests rr
      JOIN users req_user ON rr.requester_id = req_user.id
      LEFT JOIN skills sk ON rr.requested_skill_id = sk.id
      LEFT JOIN assembly_lines sl ON rr.source_line_id = sl.id
      LEFT JOIN assembly_lines dl ON rr.destination_line_id = dl.id
      LEFT JOIN floors f ON rr.target_floor_id = f.id
      LEFT JOIN blocks b ON rr.target_block_id = b.id
      WHERE rr.date = ? AND (
        rr.requester_id = ? OR 
        ? = 'Admin' OR
        (? = 'HR' AND rr.target_role = 'HR') OR
        (? = 'Block Manager' AND rr.target_role = 'Block Manager' AND (rr.target_block_id IS NULL OR rr.target_block_id = ?)) OR
        (? = 'Floor Manager' AND rr.target_role = 'Floor Manager' AND (rr.target_block_id IS NULL OR rr.target_block_id = ?) AND (rr.target_floor_id IS NULL OR rr.target_floor_id = ?))
      )
      ORDER BY rr.created_at DESC
    `;
    
    const params = [
      dateStr, 
      req.user.id, 
      role, 
      role, 
      role, userBlockId, 
      role, userBlockId, userFloorId
    ];

    const [requests] = await db.query(sql, params);

    // Also fetch the fulfillments for these requests
    const reqIds = requests.map(r => r.id);
    let fulfillmentsMap = {};
    
    if (reqIds.length > 0) {
      const [fulfillments] = await db.query(`
        SELECT rrf.request_id, rrf.worker_id, u.name as worker_name, rrf.approved_by, app.name as approver_name
        FROM resource_request_fulfillments rrf
        JOIN users u ON rrf.worker_id = u.id
        JOIN users app ON rrf.approved_by = app.id
        WHERE rrf.request_id IN (?)
      `, [reqIds]);

      fulfillments.forEach(f => {
        if (!fulfillmentsMap[f.request_id]) fulfillmentsMap[f.request_id] = [];
        fulfillmentsMap[f.request_id].push(f);
      });
    }

    const finalRequests = requests.map(r => ({
      ...r,
      fulfillments: fulfillmentsMap[r.id] || []
    }));

    res.json(finalRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function approveRequest(req, res) {
  const { id } = req.params; // Request ID
  const { worker_ids } = req.body; // Array of user IDs selected to fulfill
  
  if (!worker_ids || !Array.isArray(worker_ids) || worker_ids.length === 0) {
    return res.status(400).json({ error: 'Must provide at least one worker_id to approve.' });
  }

  try {
    const { db } = await getDatabase();
    
    const [requests] = await db.query('SELECT * FROM resource_requests WHERE id = ?', [id]);
    if (requests.length === 0) return res.status(404).json({ error: 'Request not found.' });
    
    const rr = requests[0];
    if (rr.status === 'Fulfilled') {
      return res.status(400).json({ error: 'Request is already fully fulfilled.' });
    }

    // Verify workers exist and get their original lines
    const [workers] = await db.query('SELECT id, line_id FROM users WHERE id IN (?)', [worker_ids]);
    if (workers.length !== worker_ids.length) {
      return res.status(400).json({ error: 'One or more provided workers do not exist.' });
    }

    let addedCount = 0;

    // For each worker, add fulfillment and a line allocation
    for (const w of workers) {
      // Create fulfillment record
      await db.query(`
        INSERT IGNORE INTO resource_request_fulfillments (request_id, worker_id, approved_by)
        VALUES (?, ?, ?)
      `, [rr.id, w.id, req.user.id]);
      
      // Update line_allocations for the day
      const [existing] = await db.query(
        'SELECT id FROM line_allocations WHERE date = ? AND worker_id = ?',
        [rr.date, w.id]
      );

      if (existing.length > 0) {
        await db.query(
          'UPDATE line_allocations SET original_line_id = ?, allocated_line_id = ?, reason = ? WHERE id = ?',
          [w.line_id || 0, rr.destination_line_id, 'Resource Request Fulfillment', existing[0].id]
        );
      } else {
        await db.query(
          'INSERT INTO line_allocations (date, worker_id, original_line_id, allocated_line_id, reason) VALUES (?, ?, ?, ?, ?)',
          [rr.date, w.id, w.line_id || 0, rr.destination_line_id, 'Resource Request Fulfillment']
        );
      }
      
      addedCount++;
    }

    const newFulfilledCount = rr.fulfilled_count + addedCount;
    const newStatus = newFulfilledCount >= rr.count ? 'Fulfilled' : 'Approved';

    await db.query('UPDATE resource_requests SET fulfilled_count = ?, status = ? WHERE id = ?', [newFulfilledCount, newStatus, rr.id]);

    res.json({ success: true, message: `Request ${newStatus} successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function rejectRequest(req, res) {
  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    await db.query('UPDATE resource_requests SET status = "Rejected" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Request rejected.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateRequest(req, res) {
  const { id } = req.params;
  const { 
    target_role, target_floor_id, target_block_id, 
    requested_skill_id, count, destination_line_id 
  } = req.body;

  try {
    const { db } = await getDatabase();
    
    // Ensure request exists and is Pending
    const [requests] = await db.query('SELECT status, requester_id FROM resource_requests WHERE id = ?', [id]);
    if (requests.length === 0) return res.status(404).json({ error: 'Request not found.' });
    if (requests[0].requester_id !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized to edit this request.' });
    }
    if (requests[0].status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be edited.' });
    }

    // Fetch supervisor's own block/floor details
    let userFloorId = null;
    let userBlockId = null;
    const [supRows] = await db.query(
      `SELECT COALESCE(w.floor_id, al.floor_id) as floor_id, 
              COALESCE(w.block_id, f.block_id, f2.block_id) as block_id
       FROM users w
       LEFT JOIN assembly_lines al ON w.line_id = al.id
       LEFT JOIN floors f ON al.floor_id = f.id
       LEFT JOIN floors f2 ON w.floor_id = f2.id
       WHERE w.id = ?`,
      [req.user.id]
    );
    if (supRows.length > 0) {
      userFloorId = supRows[0].floor_id;
      userBlockId = supRows[0].block_id;
    }

    // Role-based organizational validation
    if (req.user.role === 'Block Manager') {
      if (target_role !== 'HR' && target_role !== 'Block Manager') {
        return res.status(400).json({ error: 'Block Managers can only request from HR or other Block Managers.' });
      }
      if (target_role === 'Block Manager' && target_block_id && parseInt(target_block_id) === userBlockId) {
        return res.status(400).json({ error: 'Block Managers cannot request resources from their own block.' });
      }
    } else if (req.user.role === 'Floor Manager') {
      if (target_role !== 'HR' && target_role !== 'Block Manager' && target_role !== 'Floor Manager') {
        return res.status(400).json({ error: 'Floor Managers can only request from HR, Block Managers, or same-block Floor Managers.' });
      }
      if (target_role === 'Block Manager' && target_block_id && parseInt(target_block_id) !== userBlockId) {
        return res.status(400).json({ error: 'Floor Managers can only request from their own Block Manager.' });
      }
      if (target_role === 'Floor Manager') {
        if (target_block_id && parseInt(target_block_id) !== userBlockId) {
          return res.status(400).json({ error: 'Floor Managers can only request from other Floor Managers in the same block.' });
        }
        if (target_floor_id && parseInt(target_floor_id) === userFloorId) {
          return res.status(400).json({ error: 'Floor Managers cannot request from their own floor.' });
        }
      }
    }

    await db.query(`
      UPDATE resource_requests 
      SET target_role = ?, target_floor_id = ?, target_block_id = ?, 
          requested_skill_id = ?, count = ?, destination_line_id = ?
      WHERE id = ?
    `, [
      target_role, target_floor_id || null, target_block_id || null, 
      requested_skill_id || null, count, destination_line_id, id
    ]);

    res.json({ success: true, message: 'Request updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
