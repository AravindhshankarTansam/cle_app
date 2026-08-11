import { getDatabase } from '../database.js';

export async function authenticate(req, res, next) {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  const userUsername = req.headers['x-user-username'];

  if (!userId) {
    req.user = null;
    return next();
  }

  try {
    const { db } = await getDatabase();
    const [users] = await db.query(
      'SELECT id, name AS username, role, id AS worker_id FROM users WHERE id = ?',
      [parseInt(userId)]
    );

    if (users.length > 0) {
      req.user = users[0];
    } else {
      req.user = { id: parseInt(userId), role: userRole, username: userUsername, worker_id: null };
    }
  } catch (err) {
    console.error('Authentication middleware error:', err);
    req.user = { id: parseInt(userId), role: userRole, username: userUsername, worker_id: null };
  }
  next();
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Unauthorized role.' });
    }
    next();
  };
}

// Phone masking helper
export function maskPhone(phone) {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed[0] + '*'.repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

// Allowed worker list filter helper
export async function getAllowedWorkerIds(user, db) {
  if (!user) {
    // If not logged in, fall back to returning all IDs
    const [rows] = await db.query('SELECT id FROM users');
    return rows.map(r => r.id);
  }

  const { role, worker_id } = user;

  if (['Admin', 'HR', 'CEO', 'IE'].includes(role)) {
    // CEOs, Admins, HRs, and IEs see all workers
    const [rows] = await db.query('SELECT id FROM users');
    return rows.map(r => r.id);
  }

  if (!worker_id) {
    // Default fallback if no worker is linked
    return [];
  }

  // Find the supervisor's worker record hierarchy
  const [supRows] = await db.query(
    `SELECT w.line_id, 
            COALESCE(w.floor_id, al.floor_id) as floor_id, 
            COALESCE(w.block_id, f.block_id, f2.block_id) as block_id
     FROM users w
     LEFT JOIN assembly_lines al ON w.line_id = al.id
     LEFT JOIN floors f ON al.floor_id = f.id
     LEFT JOIN floors f2 ON w.floor_id = f2.id
     WHERE w.id = ?`,
    [worker_id]
  );

  if (supRows.length === 0) return [];
  const supervisor = supRows[0];

  if (role === 'Block Manager' || role === 'Block Supervisor') {
    if (!supervisor.block_id) return [];
    const [rows] = await db.query(
      `SELECT w.id FROM users w
       LEFT JOIN assembly_lines al ON w.line_id = al.id
       LEFT JOIN floors f ON al.floor_id = f.id
       LEFT JOIN floors f2 ON w.floor_id = f2.id
       WHERE (w.role = 'Employee' OR w.proficiency = 'Employee') 
         AND COALESCE(w.block_id, f2.block_id, f.block_id) = ?`,
      [supervisor.block_id]
    );
    return rows.map(r => r.id);
  }

  if (role === 'Floor Manager' || role === 'Floor Supervisor') {
    if (!supervisor.floor_id) return [];
    const [rows] = await db.query(
      `SELECT w.id FROM users w
       LEFT JOIN assembly_lines al ON w.line_id = al.id
       WHERE (w.role = 'Employee' OR w.proficiency = 'Employee')
         AND COALESCE(w.floor_id, al.floor_id) = ?`,
      [supervisor.floor_id]
    );
    return rows.map(r => r.id);
  }

  if (role === 'Line Supervisor' || role === 'Assembly Line Supervisor') {
    if (!supervisor.line_id) return [];
    const [rows] = await db.query(
      `SELECT id FROM users 
       WHERE (role = 'Employee' OR proficiency = 'Employee') 
         AND line_id = ?`,
      [supervisor.line_id]
    );
    return rows.map(r => r.id);
  }

  return [];
}
