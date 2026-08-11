import { getDatabase } from '../database.js';
import { getAllowedWorkerIds, maskPhone } from '../middleware/auth.js';

export async function getWorkers(req, res) {
  try {
    const { db } = await getDatabase();

    // Get allowed worker IDs for the logged-in user
    const allowedIds = await getAllowedWorkerIds(req.user, db);

    const [workers] = await db.query(`
      SELECT w.*, d.name as department_name, s.name as shift_name, s.start_time, s.end_time,
             sk.main_skill, al.name as line_name, 
             COALESCE(f.name, f2.name) as floor_name, 
             COALESCE(b.name, b2.name, b3.name) as block_name
      FROM users w
      LEFT JOIN departments d ON w.department_id = d.id
      LEFT JOIN shifts s ON w.default_shift_id = s.id
      LEFT JOIN skills sk ON w.skill_id = sk.id
      LEFT JOIN assembly_lines al ON w.line_id = al.id
      LEFT JOIN floors f ON al.floor_id = f.id
      LEFT JOIN floors f2 ON w.floor_id = f2.id
      LEFT JOIN blocks b ON f.block_id = b.id
      LEFT JOIN blocks b2 ON f2.block_id = b2.id
      LEFT JOIN blocks b3 ON w.block_id = b3.id
      ORDER BY w.name ASC
    `);

    // Filter workers based on authorization
    let filtered = workers.filter(w => allowedIds.includes(w.id));

    // Mask phone numbers if user role is not Admin or HR
    const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
    filtered = filtered.map(w => ({
      ...w,
      phone: isAuthorized ? w.phone : maskPhone(w.phone)
    }));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createWorker(req, res) {
  // Check authorization in middleware, but also check here for extra security
  const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied. Admin or HR privileges required.' });
  }

  const { name, phone, department_id, default_shift_id, status, skill_id, sub_skill, line_id, proficiency, designation, block_id, floor_id, password, email } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone number are required.' });
  }

  try {
    const { db } = await getDatabase();

    let hashedPassword = null;
    let finalRole = proficiency || 'Employee';

    if (password && ['HR', 'CEO', 'Block Manager', 'Floor Manager', 'Line Supervisor', 'Admin'].includes(finalRole)) {
      const { hashPassword } = await import('../utils/password.js');
      hashedPassword = hashPassword(password);
    }

    const [result] = await db.query(
      `INSERT INTO users (name, phone, department_id, default_shift_id, status, skill_id, sub_skill, line_id, proficiency, designation, block_id, floor_id, email, password, role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, department_id || null, default_shift_id || null, status || 'Active', skill_id || null, sub_skill || null, line_id || null, proficiency || 'Employee', designation || null, block_id || null, floor_id || null, email || null, hashedPassword, finalRole]
    );
    const newId = result.insertId;

    res.status(201).json({ id: newId, name, phone, department_id, default_shift_id, status, skill_id, sub_skill, line_id, proficiency, designation, block_id, floor_id, email, role: finalRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateWorker(req, res) {
  const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied. Admin or HR privileges required.' });
  }

  const { id } = req.params;
  const { name, phone, department_id, default_shift_id, status, skill_id, sub_skill, line_id, proficiency, designation, block_id, floor_id, password, email } = req.body;

  try {
    const { db } = await getDatabase();
    let finalRole = proficiency || 'Employee';

    let queryParams = [name, phone, department_id || null, default_shift_id || null, status, skill_id || null, sub_skill || null, line_id || null, proficiency || 'Employee', designation || null, block_id || null, floor_id || null, email || null, finalRole];
    let queryStr = `UPDATE users SET name = ?, phone = ?, department_id = ?, default_shift_id = ?, status = ?, skill_id = ?, sub_skill = ?, line_id = ?, proficiency = ?, designation = ?, block_id = ?, floor_id = ?, email = ?, role = ?`;

    if (password && ['HR', 'CEO', 'Block Manager', 'Floor Manager', 'IE', 'Line Supervisor', 'Admin'].includes(finalRole)) {
      const { hashPassword } = await import('../utils/password.js');
      queryStr += `, password = ?`;
      queryParams.push(hashPassword(password));
    } else if (finalRole === 'Employee') {
      // Clear password and email for standard employees
      queryStr += `, password = NULL, email = NULL`;
    }

    queryStr += ` WHERE id = ?`;
    queryParams.push(id);

    await db.query(queryStr, queryParams);

    res.json({ success: true, message: 'Worker updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteWorker(req, res) {
  const isAuthorized = req.user && ['Admin', 'HR'].includes(req.user.role);
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied. Admin or HR privileges required.' });
  }

  const { id } = req.params;
  try {
    const { db } = await getDatabase();
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Worker deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
